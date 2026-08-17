"use client";

import { useState } from "react";
import {
  ENERGY_META, nextUid, stonePhotos, stonesForEnergy,
  type DesignItem, type EnergyType, type Stone,
} from "./catalog";
import { BraceletThumb } from "./shop";

// 選石測驗的三種入口：
//   生日 — 生命靈數 → 五石陣容（主星/內在/行動/流年/意圖），可加 AI 解讀
//   許願 — 用自己的話說願望 → AI 讀懂並從全目錄選五顆（純 AI 功能）
//   合盤 — 兩人生日＋關係 → 各自主石＋共享連結石＋合盤解讀（AI 加分，
//          沒有 AI 也有內建文案版本）

const digitsSum = (s: string) => s.replace(/\D/g, "").split("").reduce((a, d) => a + Number(d), 0);
const reduce9 = (n: number) => { while (n > 9) n = digitsSum(String(n)); return n || 9; };

type LifeEntry = { persona: string; main: EnergyType; lack: EnergyType; line: string };
// 每個生命靈數的原型：主能量（天生帶著的）與缺口能量（最少照顧到的）。
const LIFE: Record<number, LifeEntry> = {
  1: { persona: "開創者", main: "power", lack: "healing", line: "習慣衝在最前面，替所有人開路——卻常忘了自己也需要修復。" },
  2: { persona: "感應者", main: "love", lack: "protection", line: "對別人的情緒異常敏銳，先接住別人——所以更需要一道自己的界線。" },
  3: { persona: "表達者", main: "focus", lack: "wealth", line: "想法多到滿出來，說出口就發光——差的只是把才華換成實際回報的那一步。" },
  4: { persona: "築基者", main: "protection", lack: "love", line: "把一切安排得穩穩當當，讓人放心——但柔軟的那一面，也值得被看見。" },
  5: { persona: "冒險者", main: "wealth", lack: "focus", line: "機會嗅覺一流，哪裡有風就往哪去——收束成一條線，運氣才會變成成果。" },
  6: { persona: "照顧者", main: "healing", lack: "power", line: "天生會把身邊的人照顧好——輪到自己上場時，需要多一點不講理的力量。" },
  7: { persona: "探尋者", main: "focus", lack: "healing", line: "凡事都要想透才肯罷休——想得深的人，更需要一個柔軟的著陸點。" },
  8: { persona: "掌局者", main: "wealth", lack: "love", line: "目標感極強，擅長把資源變成局面——別讓親密關係成為報表上的空格。" },
  9: { persona: "完滿者", main: "healing", lack: "wealth", line: "看得懂每個人的故事，也願意成全——記得替自己的付出標一個價。" },
};

const zhOf = (k: EnergyType) => ENERGY_META.find((e) => e.key === k)!.zh;

type Position = { role: string; en: string; why: string; stone: Stone; energy: EnergyType };

function buildLineup(birthday: string, theme: EnergyType | null) {
  const [y, m, d] = birthday.split("-").map(Number);
  const life = reduce9(digitsSum(birthday));
  const entry = LIFE[life];
  const themeKey = theme ?? entry.lack;

  // 各位置對應的能量：主星＝生命靈數、內在＝出生月、行動＝出生日、
  // 流年＝出生年、意圖＝你選的（或數字的缺口）。同一顆石頭不重複入陣。
  const used = new Set<string>();
  const pick = (key: EnergyType): Stone => {
    const found = stonesForEnergy(key, 10).find((s) => !used.has(s.id)) ?? stonesForEnergy(key, 1)[0];
    used.add(found.id);
    return found;
  };
  const monthKey = ENERGY_META[(m - 1) % 6].key;
  const dayKey = LIFE[reduce9(d)].main;
  const yearKey = ENERGY_META[(reduce9(y) - 1) % 6].key;

  const core = pick(entry.main);
  const positions: Position[] = [
    { role: "主星石", en: "CORE", energy: entry.main, stone: core, why: `生命靈數 ${life}・${entry.persona}。${entry.line}` },
    { role: "內在石", en: "INNER", energy: monthKey, stone: pick(monthKey), why: `${m} 月出生的人，內在自帶${zhOf(monthKey)}的底色——安靜的時候，它就在。` },
    { role: "行動石", en: "ACTION", energy: dayKey, stone: pick(dayKey), why: `${d} 日的行動數落在${zhOf(dayKey)}——你出手的方式，一直是這個樣子。` },
    { role: "流年石", en: "PATTERN", energy: yearKey, stone: pick(yearKey), why: `${y} 年生的長期課題繞著${zhOf(yearKey)}轉——不急，它是一輩子的節奏。` },
    { role: "意圖石", en: "THEME", energy: themeKey, stone: pick(themeKey), why: theme ? `你說想補${zhOf(themeKey)}——那就讓它天天貼著你的脈搏。` : `數字顯示你最少照顧到的是${zhOf(themeKey)}——這顆替你補上。` },
  ];
  return { life, entry, themeKey, positions };
}

// 五顆石頭 → 一條可直接載入工作室的手鍊：第一顆（主位）12mm 置中，其餘
// 四顆左右對稱各一，白水晶 8mm 補到 14cm 手圍的八成五上下。
function lineupFromIds(ids: [string, string, string, string, string]): DesignItem[] {
  const [core, inner, action, pattern, theme] = ids;
  const s = (id: string, mm: number): DesignItem => ({ kind: "stone", id, mm, uid: nextUid() });
  return [
    s(inner, 10), s(pattern, 10), s("clear", 8), s(action, 10), s(theme, 10),
    s(core, 12),
    s(theme, 10), s(action, 10), s("clear", 8), s(pattern, 10), s(inner, 10),
    s("clear", 8),
  ];
}
const lineupItems = (positions: Position[]): DesignItem[] =>
  lineupFromIds(positions.map((p) => p.stone.id) as [string, string, string, string, string]);

type AiReading = { overall: string; stones: { role: string; line: string }[]; blessing: string };
type WishReading = { overall: string; blessing: string; stones: { id: string; zh: string; role: string; line: string }[] };
type PairText = { overall: string; a_line: string; b_line: string; bond_line: string; blessing: string };
type PairResult = {
  relation: string;
  a: { name: string; life: number; persona: string; stone: Stone };
  b: { name: string; life: number; persona: string; stone: Stone };
  bond: Stone; bondEnergy: EnergyType;
  text: PairText; aiUsed: boolean;
};

const postJson = (path: string, body: unknown) => fetch(path, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

export default function Quiz({ onLoadDesign, onHome }: {
  onLoadDesign: (items: DesignItem[], wrist: number) => void;
  onHome: () => void;
}) {
  const [mode, setMode] = useState<"birth" | "wish" | "pair">("birth");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [theme, setTheme] = useState<EnergyType | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReturnType<typeof buildLineup> | null>(null);
  const [ai, setAi] = useState<AiReading | "loading" | null>(null);
  // 許願模式
  const [wish, setWish] = useState("");
  const [wishBusy, setWishBusy] = useState(false);
  const [wishResult, setWishResult] = useState<WishReading | null>(null);
  // 合盤模式
  const [relation, setRelation] = useState("閨蜜");
  const [nameB, setNameB] = useState("");
  const [birthdayB, setBirthdayB] = useState("");
  const [pairBusy, setPairBusy] = useState(false);
  const [pairResult, setPairResult] = useState<PairResult | null>(null);

  const reset = () => { setResult(null); setWishResult(null); setPairResult(null); setAi(null); setError(""); };

  const submitBirth = () => {
    if (!name.trim()) { setError("留個稱呼，結果才知道要寫給誰"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) { setError("請選擇你的生日"); return; }
    setError("");
    const r = buildLineup(birthday, theme);
    setResult(r);
    postJson("/api/quiz-lead", { name: name.trim(), birthday, theme: r.themeKey, email: email.trim(), stones: r.positions.map((p) => p.stone.id).join(",") }).catch(() => {});
    // AI 個人化解讀：拿得到就逐段換上；拿不到（沒設 key、超時、超量）
    // 就維持內建文案，頁面不顯示任何錯誤——解讀是加分項，不是依賴。
    setAi("loading");
    postJson("/api/quiz-reading", {
      name: name.trim(), birthday, life: r.life, persona: r.entry.persona, theme: zhOf(r.themeKey),
      positions: r.positions.map((p) => ({ role: p.role, stone: p.stone.zh, energy: zhOf(p.energy) })),
    })
      .then(async (res) => (res.ok ? ((await res.json()) as { reading: AiReading }).reading : null))
      .then((reading) => setAi(reading))
      .catch(() => setAi(null));
    window.scrollTo({ top: 0 });
  };

  const submitWish = async () => {
    if (!name.trim()) { setError("留個稱呼，結果才知道要寫給誰"); return; }
    if (wish.trim().length < 5) { setError("多說一點——願望至少要一句話"); return; }
    setError("");
    setWishBusy(true);
    try {
      const res = await postJson("/api/wish-reading", { name: name.trim(), wish: wish.trim() });
      if (res.status === 503) { setError("AI 顧問暫時休息中——先用生日算一條，或晚點再來許願"); return; }
      if (!res.ok) { setError("這個願望顧問一時接不住，換個說法再試一次"); return; }
      setWishResult(((await res.json()) as { reading: WishReading }).reading);
      window.scrollTo({ top: 0 });
    } catch {
      setError("網路不太順，再試一次");
    } finally {
      setWishBusy(false);
    }
  };

  const submitPair = async () => {
    if (!name.trim() || !nameB.trim()) { setError("兩個人的稱呼都要留"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || !/^\d{4}-\d{2}-\d{2}$/.test(birthdayB)) { setError("請選擇兩個人的生日"); return; }
    setError("");
    const lifeA = reduce9(digitsSum(birthday)), lifeB = reduce9(digitsSum(birthdayB));
    const entryA = LIFE[lifeA], entryB = LIFE[lifeB];
    // 連結石依關係取向：情侶補愛情、閨蜜補療癒、家人補守護；兩人主石
    // 依各自生命靈數的主能量，三顆互不重複。
    const bondEnergy: EnergyType = relation === "情侶" ? "love" : relation === "家人" ? "protection" : "healing";
    const used = new Set<string>();
    const pick = (key: EnergyType): Stone => {
      const found = stonesForEnergy(key, 10).find((s) => !used.has(s.id)) ?? stonesForEnergy(key, 1)[0];
      used.add(found.id);
      return found;
    };
    const stoneA = pick(entryA.main), stoneB = pick(entryB.main), bond = pick(bondEnergy);
    // 內建文案先上（沒有 AI 也是完整功能），AI 到了再整段換掉。
    const fallback: PairText = {
      overall: `${name.trim()} 是生命靈數 ${lifeA} 的${entryA.persona}，${entryA.line}${nameB.trim()} 是生命靈數 ${lifeB} 的${entryB.persona}，${entryB.line}兩種節奏放在一起，正好互相接住。`,
      a_line: `${zhOf(entryA.main)}是你天生的主場——「${stoneA.zh}」替你把它戴在手上。`,
      b_line: `${zhOf(entryB.main)}是你天生的主場——「${stoneB.zh}」替你把它戴在手上。`,
      bond_line: `兩條手鍊各放一顆「${bond.zh}」——${relation}之間最需要的${zhOf(bondEnergy)}，看見它就想起彼此。`,
      blessing: "願你們一直是彼此最順手的那顆定心石。",
    };
    const base: PairResult = {
      relation,
      a: { name: name.trim(), life: lifeA, persona: entryA.persona, stone: stoneA },
      b: { name: nameB.trim(), life: lifeB, persona: entryB.persona, stone: stoneB },
      bond, bondEnergy, text: fallback, aiUsed: false,
    };
    setPairBusy(true);
    try {
      const res = await postJson("/api/pair-reading", {
        relation,
        a: { name: base.a.name, birthday, life: lifeA, persona: entryA.persona, stone: stoneA.zh },
        b: { name: base.b.name, birthday: birthdayB, life: lifeB, persona: entryB.persona, stone: stoneB.zh },
        bondStone: bond.zh,
      });
      if (res.ok) {
        base.text = ((await res.json()) as { reading: PairText }).reading;
        base.aiUsed = true;
      }
    } catch { /* 內建文案照用 */ }
    setPairBusy(false);
    setPairResult(base);
    postJson("/api/quiz-lead", { name: base.a.name, birthday, theme: bondEnergy, email: "", stones: `${stoneA.id},${bond.id}|pair:${relation}` }).catch(() => {});
    window.scrollTo({ top: 0 });
  };

  const header = (note: string) => <header className="shop-head">
    <button className="wordmark" onClick={onHome}>OMA <span>CRYSTAL</span></button>
    <div className="head-note">{note}</div>
    <div className="head-actions">{(result || wishResult || pairResult) && <button className="quiet" onClick={reset}>再算一次</button>}</div>
  </header>;

  // --- 生日結果 -----------------------------------------------------------
  if (result) {
    const items = lineupItems(result.positions);
    const zhTheme = ENERGY_META.find((e) => e.key === result.themeKey)!;
    const zhLack = ENERGY_META.find((e) => e.key === result.entry.lack)!;
    const pickedOwnTheme = result.themeKey !== result.entry.lack;
    return <div className="quiz">
      {header("CRYSTAL BIRTH READING")}
      <section className="quiz-result">
        <p className="landing-eyebrow">生命靈數 {result.life} · {result.entry.persona}</p>
        <h1>{name} 的五石陣容</h1>
        <p className="quiz-lack">你的數字偏向<b>{ENERGY_META.find((e) => e.key === result.entry.main)!.zh}</b>，最少照顧到的是<b style={{ color: zhLack.color }}>{zhLack.zh}</b>{pickedOwnTheme
          ? <>；你另外點名想補<b style={{ color: zhTheme.color }}>{zhTheme.zh}</b>，意圖石已經替你放進去。</>
          : <>——意圖石已經替你補上。</>}</p>
        {ai === "loading" && <p className="quiz-ai loading">顧問正在為你寫專屬解讀…</p>}
        {ai && ai !== "loading" && <div className="quiz-ai"><p>{ai.overall}</p><span>— 寫給 {name} 的專屬解讀</span></div>}
        <div className="quiz-preview"><BraceletThumb items={items} wrist={14} /></div>
        <div className="quiz-stones">
          {result.positions.map((p) => {
            const aiLine = ai && ai !== "loading" ? ai.stones.find((s) => s.role === p.role)?.line : null;
            return <div className="quiz-stone" key={p.en}>
              <img src={stonePhotos[p.stone.id]} alt={p.stone.zh} />
              <div>
                <span className="qs-role">{p.en} · {p.role} <b style={{ color: ENERGY_META.find((e) => e.key === p.energy)!.color }}>{ENERGY_META.find((e) => e.key === p.energy)!.zh}</b></span>
                <b className="qs-name">{p.stone.zh} <i>{p.stone.en}</i></b>
                <p>{aiLine ?? p.why}</p>
                <small>{p.stone.note}</small>
              </div>
            </div>;
          })}
        </div>
        {ai && ai !== "loading" && ai.blessing && <p className="quiz-blessing">{ai.blessing}</p>}
        <button className="landing-cta" onClick={() => onLoadDesign(items, 14)}>把陣容載入工作室 <i>→</i></button>
        <p className="quiz-note">陣容已排成 14cm 手圍的完整一條，進工作室可自由增減。本測驗屬趣味參考，不構成任何醫療或財務建議。</p>
      </section>
    </div>;
  }

  // --- 許願結果 -----------------------------------------------------------
  if (wishResult) {
    const items = lineupFromIds(wishResult.stones.map((s) => s.id) as [string, string, string, string, string]);
    return <div className="quiz">
      {header("MAKE A WISH")}
      <section className="quiz-result">
        <p className="landing-eyebrow">許願選石</p>
        <h1>{name} 的心願陣容</h1>
        <div className="quiz-ai"><p>{wishResult.overall}</p><span>— 回應你的願望</span></div>
        <div className="quiz-preview"><BraceletThumb items={items} wrist={14} /></div>
        <div className="quiz-stones">
          {wishResult.stones.map((s) => <div className="quiz-stone" key={s.id}>
            <img src={stonePhotos[s.id]} alt={s.zh} />
            <div>
              <span className="qs-role">{s.role}</span>
              <b className="qs-name">{s.zh}</b>
              <p>{s.line}</p>
            </div>
          </div>)}
        </div>
        {wishResult.blessing && <p className="quiz-blessing">{wishResult.blessing}</p>}
        <button className="landing-cta" onClick={() => onLoadDesign(items, 14)}>把陣容載入工作室 <i>→</i></button>
        <p className="quiz-note">陣容已排成 14cm 手圍的完整一條，進工作室可自由增減。本測驗屬趣味參考，不構成任何醫療或財務建議。</p>
      </section>
    </div>;
  }

  // --- 合盤結果 -----------------------------------------------------------
  if (pairResult) {
    const { a, b, bond, text } = pairResult;
    const itemsA = lineupFromIds([a.stone.id, bond.id, a.stone.id, bond.id, bond.id]);
    const itemsB = lineupFromIds([b.stone.id, bond.id, b.stone.id, bond.id, bond.id]);
    return <div className="quiz">
      {header("TWO OF US")}
      <section className="quiz-result">
        <p className="landing-eyebrow">{pairResult.relation}合盤</p>
        <h1>{a.name} × {b.name}</h1>
        <div className="quiz-ai"><p>{text.overall}</p><span>— {pairResult.relation}合盤解讀</span></div>
        <div className="pair-grid">
          {[{ person: a, line: text.a_line, items: itemsA, label: "A" }, { person: b, line: text.b_line, items: itemsB, label: "B" }].map(({ person, line, items }) => <div className="pair-card" key={person.name}>
            <p className="landing-eyebrow">生命靈數 {person.life} · {person.persona}</p>
            <b className="pair-name">{person.name}</b>
            <div className="quiz-preview"><BraceletThumb items={items} wrist={14} /></div>
            <div className="quiz-stone">
              <img src={stonePhotos[person.stone.id]} alt={person.stone.zh} />
              <div>
                <span className="qs-role">主石</span>
                <b className="qs-name">{person.stone.zh}</b>
                <p>{line}</p>
              </div>
            </div>
            <button className="landing-cta" onClick={() => onLoadDesign(items, 14)}>載入 {person.name} 的手鍊 <i>→</i></button>
          </div>)}
        </div>
        <div className="quiz-stone bond-stone">
          <img src={stonePhotos[bond.id]} alt={bond.zh} />
          <div>
            <span className="qs-role">共享連結石</span>
            <b className="qs-name">{bond.zh}</b>
            <p>{text.bond_line}</p>
          </div>
        </div>
        {text.blessing && <p className="quiz-blessing">{text.blessing}</p>}
        <p className="quiz-note">兩條各排成 14cm 手圍的完整一條，進工作室可個別調整。本測驗屬趣味參考，不構成任何醫療或財務建議。</p>
      </section>
    </div>;
  }

  // --- 表單 ---------------------------------------------------------------
  return <div className="quiz">
    {header(mode === "birth" ? "CRYSTAL BIRTH READING" : mode === "wish" ? "MAKE A WISH" : "TWO OF US")}
    <section className="quiz-form">
      <p className="landing-eyebrow">選石測驗</p>
      {mode === "birth" && <h1>你的生日，<br />早就選好了石頭</h1>}
      {mode === "wish" && <h1>說個願望，<br />顧問替你選石</h1>}
      {mode === "pair" && <h1>兩個人，<br />一對互相呼應的手鍊</h1>}
      <div className="quiz-modes">
        {([["birth", "用生日算"], ["wish", "說個願望"], ["pair", "兩個人合盤"]] as const).map(([key, label]) => <button
          key={key} type="button" className={mode === key ? "on" : ""} onClick={() => { setMode(key); setError(""); }}
        >{label}</button>)}
      </div>
      {mode === "birth" && <span className="quiz-sub">一分鐘，從生命靈數算出屬於你的五石陣容——主星、內在、行動、流年，加上一顆補足缺口的意圖石。</span>}
      {mode === "wish" && <span className="quiz-sub">用自己的話說：想撐過什麼、想留住什麼、想成為什麼。顧問會讀懂它，從一百多種石頭裡選出剛好的五顆。</span>}
      {mode === "pair" && <span className="quiz-sub">閨蜜、情侶或家人——兩個人的生日各算一條，再共享一顆連結石，戴著就想起彼此。</span>}
      <div className="quiz-fields">
        <label>怎麼稱呼你<input value={name} onChange={(e) => setName(e.target.value)} placeholder="小名或暱稱" maxLength={40} /></label>
        {mode !== "wish" && <label>{mode === "pair" ? "你的生日" : "生日"}<input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} min="1930-01-01" max="2026-12-31" /></label>}
        {mode === "wish" && <label>此刻的願望<textarea className="quiz-wish" value={wish} onChange={(e) => setWish(e.target.value)} placeholder="例：想撐過換工作的這半年，不要再半夜胡思亂想" maxLength={200} rows={3} /></label>}
        {mode === "pair" && <>
          <label>對方的稱呼<input value={nameB} onChange={(e) => setNameB(e.target.value)} placeholder="她／他的小名" maxLength={40} /></label>
          <label>對方的生日<input type="date" value={birthdayB} onChange={(e) => setBirthdayB(e.target.value)} min="1930-01-01" max="2026-12-31" /></label>
          <label className="quiz-theme"><span>你們的關係</span>
            <span className="quiz-chips">
              {["閨蜜", "情侶", "家人"].map((r) => <button key={r} type="button" className={relation === r ? "on" : ""} style={{ "--chip": "#b8923f" } as React.CSSProperties} onClick={() => setRelation(r)}>{r}</button>)}
            </span>
          </label>
        </>}
        {mode === "birth" && <label className="quiz-theme"><span>此刻最想補的能量（可不選，讓生日決定）</span>
          <span className="quiz-chips">
            {ENERGY_META.map((m) => <button key={m.key} type="button" className={theme === m.key ? "on" : ""} style={{ "--chip": m.color } as React.CSSProperties} onClick={() => setTheme(theme === m.key ? null : m.key)}>{m.zh}</button>)}
          </span>
        </label>}
        {mode === "birth" && <label>Email（選填，之後想收到自己的陣容再填）<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>}
      </div>
      {error && <p className="co-error">{error}</p>}
      {mode === "birth" && <button className="landing-cta" onClick={submitBirth}>看我的五石陣容 <i>→</i></button>}
      {mode === "wish" && <button className="landing-cta" disabled={wishBusy} onClick={submitWish}>{wishBusy ? "顧問正在讀你的願望…" : "替我選石 →"}</button>}
      {mode === "pair" && <button className="landing-cta" disabled={pairBusy} onClick={submitPair}>{pairBusy ? "正在合盤…" : "看我們的合盤 →"}</button>}
    </section>
  </div>;
}
