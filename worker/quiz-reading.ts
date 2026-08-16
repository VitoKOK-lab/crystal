// 生日選石的 AI 個人化解讀：前端把算好的五石陣容連同客人資料 POST 進來，
// 這裡代理 Moonshot Kimi（OpenAI 相容 API）產生一段專屬中文解讀。
//
// 設計約束：
// - API key 是 wrangler secret，絕不落到瀏覽器；沒設 key 直接 503，前端
//   靜靜退回內建文案（功能先上線，key 之後補）。
// - 同一組（名字｜生日｜主題）只生成一次：SHA-256 當快取鍵存 D1，重測
//   同樣資料免費且即時。
// - 每日全站生成上限（快取行數統計）擋住惡意刷 credits。
// - 模型輸出強制 JSON 並驗形，長度全部設限——它寫進頁面，但只以純文字
//   呈現，不進 HTML。
import { Env, json } from "./lib";

type Position = { role: string; stone: string; energy: string };
type Reading = { overall: string; stones: { role: string; line: string }[]; blessing: string };

const DAILY_CAP = 300;
const SYSTEM_PROMPT = `你是 OMA CRYSTAL 水晶工作室的資深顧問，說話溫暖、具體、有畫面感，像熟識多年的朋友，絕不浮誇或裝神弄鬼。
規則：
- 一律使用繁體中文（台灣用語）。
- 內容屬趣味與陪伴性質：不得做任何醫療、財務、感情結果的保證或斷言，不使用「一定」「保證」等字眼。
- 不提及你是 AI 或任何模型名稱。
- 使用客人的稱呼寫給「你」，把生日、生命靈數與每顆石頭的角色編織成一個連貫的小故事，而不是逐條解釋。
- 只回傳 JSON，格式：{"overall":"120-160字的整體解讀","stones":[{"role":"主星石","line":"30-45字"},...共五個，依提供順序],"blessing":"20-30字的祝福"}`;

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function validReading(r: unknown): r is Reading {
  const x = r as Reading;
  return !!x && typeof x.overall === "string" && x.overall.length > 20 && x.overall.length < 600
    && Array.isArray(x.stones) && x.stones.length >= 3 && x.stones.length <= 6
    && x.stones.every((s) => typeof s?.role === "string" && typeof s?.line === "string" && s.line.length < 300)
    && typeof x.blessing === "string" && x.blessing.length < 200;
}

export async function handleQuizReading(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname !== "/api/quiz-reading" || request.method !== "POST") return null;
  if (!env.KIMI_API_KEY) return json({ error: "not configured" }, { status: 503 });

  let b: Record<string, unknown> = {};
  try { b = (await request.json()) as Record<string, unknown>; } catch { /* validated below */ }
  const name = str(b.name, 40);
  const birthday = str(b.birthday, 10);
  const themeZh = str(b.theme, 10);
  const persona = str(b.persona, 20);
  const life = Number(b.life);
  const rawPositions = Array.isArray(b.positions) ? (b.positions as unknown[]).slice(0, 6) : [];
  const positions: Position[] = [];
  for (const p of rawPositions) {
    const row = p as Record<string, unknown>;
    const role = str(row.role, 20), stone = str(row.stone, 40), energy = str(row.energy, 10);
    if (role && stone && energy) positions.push({ role, stone, energy });
  }
  if (!name || !birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday) || !themeZh || !persona
    || !Number.isInteger(life) || life < 1 || life > 9 || positions.length < 5) {
    return json({ error: "invalid reading request" }, { status: 400 });
  }

  const key = await sha256(`${name}|${birthday}|${themeZh}`);
  const cached = await env.DB.prepare("SELECT reading FROM quiz_readings WHERE key=?").bind(key).first<{ reading: string }>();
  if (cached) return json({ reading: JSON.parse(cached.reading) as Reading, cached: true });

  const today = await env.DB.prepare("SELECT COUNT(*) AS n FROM quiz_readings WHERE created_at > datetime('now','-1 day')").first<{ n: number }>();
  if ((today?.n ?? 0) >= DAILY_CAP) return json({ error: "daily cap reached" }, { status: 429 });

  const userPrompt = [
    `客人稱呼：${name}`,
    `生日：${birthday}，生命靈數 ${life}（${persona}）`,
    `此刻最想補的能量：${themeZh}`,
    "五石陣容（依序）：",
    ...positions.map((p) => `- ${p.role}：${p.stone}（${p.energy}）`),
    "請依系統規則產生這位客人的專屬解讀 JSON。",
  ].join("\n");

  const base = (env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1").replace(/\/$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${env.KIMI_API_KEY}` },
      body: JSON.stringify({
        model: env.KIMI_MODEL ?? "moonshot-v1-8k",
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return json({ error: `upstream ${res.status}` }, { status: 502 });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    let reading: unknown;
    try { reading = JSON.parse(content); } catch { return json({ error: "unparseable reading" }, { status: 502 }); }
    if (!validReading(reading)) return json({ error: "malformed reading" }, { status: 502 });
    await env.DB.prepare("INSERT OR IGNORE INTO quiz_readings (key, reading) VALUES (?,?)").bind(key, JSON.stringify(reading)).run();
    return json({ reading });
  } catch {
    return json({ error: "upstream timeout" }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
