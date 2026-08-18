// The three composable AI features layered on the Kimi plumbing:
//   POST /api/design-poem   — 幫手鍊取名字＋一句籤詩（分享卡用）
//   POST /api/wish-reading  — 許願式選石：自由文字願望 → 五石陣容＋解讀
//   POST /api/pair-reading  — 閨蜜／情侶合盤：兩人生日 → 合盤解讀
// 共同原則：key 不在就 503（前端各自靜靜降級）、輸出強制 JSON 驗形、
// 所有欄位長度設限、同一請求快取進 D1、每種功能有獨立的每日上限。
import { GUARDRAILS, cacheGet, cachePut, kimiConfigured, kimiJson, overDailyCap, sha256, str } from "./kimi";
import { Env, json, rateLimited } from "./lib";

// --- 手鍊命名＋籤詩 -------------------------------------------------------

type Poem = { title: string; verse: string };
const validPoem = (r: unknown): r is Poem => {
  const x = r as Poem;
  return !!x && typeof x.title === "string" && x.title.length >= 2 && x.title.length <= 24
    && typeof x.verse === "string" && x.verse.length >= 6 && x.verse.length <= 80;
};

async function designPoem(request: Request, env: Env): Promise<Response> {
  let b: Record<string, unknown> = {};
  try { b = (await request.json()) as Record<string, unknown>; } catch { /* validated below */ }
  const dominant = str(b.dominant, 10);
  const rawStones = Array.isArray(b.stones) ? (b.stones as unknown[]).slice(0, 42) : [];
  const stones: string[] = [];
  for (const s of rawStones) { const v = str(s, 40); if (v) stones.push(v); }
  if (!dominant || stones.length < 1) return json({ error: "invalid poem request" }, { status: 400 });

  // 相同石頭組合（不計順序）＋主能量 → 同一個名字：命名是作品的，不是
  // 訪客的，快取命中率因此高很多。
  const key = await sha256(`${dominant}|${[...stones].sort().join(",")}`);
  const cached = await cacheGet(env, "poem", key);
  if (cached) return json({ poem: cached, cached: true });
  if (await overDailyCap(env, "poem", 400)) return json({ error: "daily cap reached" }, { status: 429 });

  const result = await kimiJson(env, `${GUARDRAILS}
你要為一條手工水晶手鍊命名。名字要像香水或詩集的名字：具體、有畫面、不俗氣（避免「能量」「魔法」「神秘」這類字）。
格式：{"title":"4-10字的中文名字","verse":"14-24字的一句籤詩，呼應石頭組合的氣質"}`,
  `這條手鍊的組成：${stones.join("、")}。主能量：${dominant}。請命名。`, 300);
  if (!result.ok) return result.res;
  if (!validPoem(result.data)) return json({ error: "malformed poem" }, { status: 502 });
  await cachePut(env, "poem", key, result.data);
  return json({ poem: result.data });
}

// --- 許願式選石 -----------------------------------------------------------

type WishStone = { name: string; role: string; line: string };
type WishReading = { overall: string; stones: WishStone[]; blessing: string };
const validWish = (r: unknown): r is WishReading => {
  const x = r as WishReading;
  return !!x && typeof x.overall === "string" && x.overall.length > 20 && x.overall.length < 600
    && Array.isArray(x.stones) && x.stones.length === 5
    && x.stones.every((s) => typeof s?.name === "string" && typeof s?.role === "string" && s.role.length <= 20
      && typeof s?.line === "string" && s.line.length < 300)
    && typeof x.blessing === "string" && x.blessing.length < 200;
};

const ENERGY_ZH: [string, string][] = [["wealth", "財富"], ["love", "愛情"], ["healing", "療癒"], ["protection", "守護"], ["focus", "專注"], ["power", "力量"]];

async function wishReading(request: Request, env: Env): Promise<Response> {
  let b: Record<string, unknown> = {};
  try { b = (await request.json()) as Record<string, unknown>; } catch { /* validated below */ }
  const name = str(b.name, 40);
  const wish = str(b.wish, 200);
  if (!name || !wish || wish.length < 5) return json({ error: "invalid wish request" }, { status: 400 });

  const key = await sha256(`${name}|${wish}`);
  const cached = await cacheGet(env, "wish", key);
  if (cached) return json({ reading: cached, cached: true });
  if (await overDailyCap(env, "wish", 300)) return json({ error: "daily cap reached" }, { status: 429 });

  // 石頭菜單由資料庫現況組成（上架且有照片的才進菜單），Kimi 只能從
  // 菜單點菜——它回的名字必須映射回真實 id，否則整包打掉重來。
  const { results } = await env.DB.prepare("SELECT id, zh, energies FROM stones WHERE active=1 AND photo != ''").all<{ id: string; zh: string; energies: string }>();
  const parsed = results.map((r) => {
    try { return { id: r.id, zh: r.zh, energy: JSON.parse(r.energies) as Record<string, number> }; } catch { return null; }
  }).filter((r): r is NonNullable<typeof r> => !!r);
  if (parsed.length < 10) return json({ error: "catalog unavailable" }, { status: 503 });
  const byZh = new Map(parsed.map((s) => [s.zh, s.id]));
  const menu = ENERGY_ZH.map(([k, zh]) => {
    const top = [...parsed].sort((a, b2) => (b2.energy[k] ?? 0) - (a.energy[k] ?? 0)).slice(0, 6);
    return `${zh}：${top.map((s) => s.zh).join("、")}`;
  }).join("\n");

  const result = await kimiJson(env, `${GUARDRAILS}
客人會說一個願望。你要讀懂願望背後真正需要的支持，從提供的石頭菜單中挑「剛好五顆」不重複的石頭排成陣容，並寫給「你」的解讀。
- 石頭名字必須一字不差地取自菜單。
- 五顆各給一個 2-4 字的位置名（例如：主願石、定心石、開路石…由你依願望命名）。
- 如果願望涉及自傷、傷害他人或違法，不要配合內容，改以溫柔語氣關心對方，並以守護與療癒方向選石。
格式：{"overall":"100-140字，回應願望本身的整體解讀","stones":[{"name":"石頭名","role":"位置名","line":"30-45字，這顆石頭如何呼應願望"}×5],"blessing":"20-30字的祝福"}`,
  `客人稱呼：${name}\n願望：「${wish}」\n\n石頭菜單（依能量分組）：\n${menu}`, 1100);
  if (!result.ok) return result.res;
  if (!validWish(result.data)) return json({ error: "malformed reading" }, { status: 502 });
  const picked = result.data.stones.map((s) => ({ id: byZh.get(s.name), zh: s.name, role: s.role, line: s.line }));
  if (picked.some((p) => !p.id) || new Set(picked.map((p) => p.id)).size !== 5) {
    return json({ error: "reading picked unknown stones" }, { status: 502 });
  }
  const reading = { overall: result.data.overall, blessing: result.data.blessing, stones: picked };
  await cachePut(env, "wish", key, reading);
  return json({ reading });
}

// --- 閨蜜／情侶合盤 -------------------------------------------------------

type PairReading = { overall: string; a_line: string; b_line: string; bond_line: string; blessing: string };
const validPair = (r: unknown): r is PairReading => {
  const x = r as PairReading;
  const s = (v: unknown, max: number) => typeof v === "string" && (v as string).length > 5 && (v as string).length < max;
  return !!x && s(x.overall, 700) && s(x.a_line, 300) && s(x.b_line, 300) && s(x.bond_line, 300) && s(x.blessing, 200);
};

const RELATIONS = new Set(["閨蜜", "情侶", "家人"]);

type PairPerson = { name: string; birthday: string; life: number; persona: string; stone: string };
function pairPerson(v: unknown): PairPerson | null {
  const p = v as Record<string, unknown>;
  const name = str(p?.name, 40), birthday = str(p?.birthday, 10), persona = str(p?.persona, 20), stone = str(p?.stone, 40);
  const life = Number(p?.life);
  if (!name || !birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday) || !persona || !stone || !Number.isInteger(life) || life < 1 || life > 9) return null;
  return { name, birthday, life, persona, stone };
}

async function pairReading(request: Request, env: Env): Promise<Response> {
  let b: Record<string, unknown> = {};
  try { b = (await request.json()) as Record<string, unknown>; } catch { /* validated below */ }
  const relation = str(b.relation, 4);
  const a = pairPerson(b.a), bb = pairPerson(b.b);
  const bondStone = str(b.bondStone, 40);
  if (!relation || !RELATIONS.has(relation) || !a || !bb || !bondStone) return json({ error: "invalid pair request" }, { status: 400 });

  const key = await sha256(`${relation}|${a.name}|${a.birthday}|${bb.name}|${bb.birthday}`);
  const cached = await cacheGet(env, "pair", key);
  if (cached) return json({ reading: cached, cached: true });
  if (await overDailyCap(env, "pair", 200)) return json({ error: "daily cap reached" }, { status: 429 });

  const result = await kimiJson(env, `${GUARDRAILS}
你要為兩位客人寫「合盤」：兩人的生命靈數性格如何互補、彼此在對方生命裡扮演什麼角色，語氣像懂他們的朋友，寫得具體、溫柔、不肉麻。
格式：{"overall":"130-170字的兩人合盤解讀","a_line":"30-45字，寫給第一位：她的主石為何襯她","b_line":"30-45字，寫給第二位","bond_line":"30-45字，兩人共享的連結石的意義","blessing":"20-30字，給兩個人的祝福"}`,
  `關係：${relation}
第一位：${a.name}，生日 ${a.birthday}，生命靈數 ${a.life}（${a.persona}），主石「${a.stone}」
第二位：${bb.name}，生日 ${bb.birthday}，生命靈數 ${bb.life}（${bb.persona}），主石「${bb.stone}」
兩人共享的連結石：「${bondStone}」（兩條手鍊各放一顆）`, 900);
  if (!result.ok) return result.res;
  if (!validPair(result.data)) return json({ error: "malformed reading" }, { status: 502 });
  await cachePut(env, "pair", key, result.data);
  return json({ reading: result.data });
}

// --- 深度配對：七脈輪 × MBTI × 生日 ---------------------------------------

type DeepReading = { overall: string; stones: { role: string; line: string }[]; blessing: string };
const validDeep = (r: unknown): r is DeepReading => {
  const x = r as DeepReading;
  return !!x && typeof x.overall === "string" && x.overall.length > 40 && x.overall.length < 800
    && Array.isArray(x.stones) && x.stones.length === 7
    && x.stones.every((s) => typeof s?.role === "string" && s.role.length <= 12 && typeof s?.line === "string" && s.line.length < 300)
    && typeof x.blessing === "string" && x.blessing.length < 200;
};

async function deepReading(request: Request, env: Env): Promise<Response> {
  let b: Record<string, unknown> = {};
  try { b = (await request.json()) as Record<string, unknown>; } catch { /* validated below */ }
  const name = str(b.name, 40);
  const birthday = str(b.birthday, 10);
  const persona = str(b.persona, 20);
  const mbti = str(b.mbti, 4);
  const life = Number(b.life);
  const concerns: string[] = [];
  if (Array.isArray(b.concerns)) for (const c of (b.concerns as unknown[]).slice(0, 3)) { const v = str(c, 14); if (v) concerns.push(v); }
  const positions: { role: string; stone: string; note: string }[] = [];
  if (Array.isArray(b.positions)) for (const p of (b.positions as unknown[]).slice(0, 7)) {
    const row = p as Record<string, unknown>;
    const role = str(row.role, 12), stone = str(row.stone, 40), note = str(row.note, 20);
    if (role && stone && note) positions.push({ role, stone, note });
  }
  if (!name || !birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday) || !persona
    || !mbti || !/^[EI][SN][TF][JP]$/.test(mbti)
    || !Number.isInteger(life) || life < 1 || life > 9 || positions.length !== 7) {
    return json({ error: "invalid deep request" }, { status: 400 });
  }

  const key = await sha256(`${name}|${birthday}|${mbti}|${[...concerns].sort().join(",")}|${positions.map((p) => p.stone).join(",")}`);
  const cached = await cacheGet(env, "deep", key);
  if (cached) return json({ reading: cached, cached: true });
  if (await overDailyCap(env, "deep", 300)) return json({ error: "daily cap reached" }, { status: 429 });

  const result = await kimiJson(env, `${GUARDRAILS}
你要為一位客人寫「七輪平衡手鍊」的深度解讀。三個訊號要織成一個連貫的人物故事，不是分段報告：生命靈數給命盤底色、MBTI 給性格的用力方式、此刻的困擾指出偏弱的脈輪。
- 七顆石頭依海底輪→頂輪排列，各寫一句：這顆石頭在這個輪位、對「這個人」的意義（重點補強的輪要寫得更貼身）。
- MBTI 以性格描述的方式融入（例如「習慣把計畫排到明年的你」），不要直接堆術語。
格式：{"overall":"150-200字的整體解讀，稱呼名字，把三個訊號串成故事","stones":[{"role":"海底輪","line":"25-40字"}×7，依提供順序],"blessing":"20-30字的祝福"}`,
  [
    `客人稱呼：${name}`,
    `生日：${birthday}，生命靈數 ${life}（${persona}）`,
    `MBTI：${mbti}`,
    concerns.length ? `此刻的困擾：${concerns.join("、")}` : "此刻的困擾：未特別勾選",
    "七輪陣容（海底輪→頂輪）：",
    ...positions.map((p) => `- ${p.role}：${p.stone}（${p.note}）`),
    "請依系統規則產生深度解讀 JSON。",
  ].join("\n"), 1300);
  if (!result.ok) return result.res;
  if (!validDeep(result.data)) return json({ error: "malformed reading" }, { status: 502 });
  await cachePut(env, "deep", key, result.data);
  return json({ reading: result.data });
}

export async function handleAi(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== "POST") return null;
  const routes: Record<string, (r: Request, e: Env) => Promise<Response>> = {
    "/api/design-poem": designPoem,
    "/api/wish-reading": wishReading,
    "/api/pair-reading": pairReading,
    "/api/deep-reading": deepReading,
  };
  const handler = routes[url.pathname];
  if (!handler) return null;
  // key 不在就直接 503（不驗 body）：這是前端「AI 有沒有開」的探測訊號。
  if (!kimiConfigured(env)) return json({ error: "not configured" }, { status: 503 });
  // 每日全站上限之外再加單一 IP 限流：一個惡意來源不該吃光大家的額度。
  if (rateLimited(request, "ai", 15)) return json({ error: "too many requests" }, { status: 429 });
  return handler(request, env);
}
