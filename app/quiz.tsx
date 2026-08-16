"use client";

import { useState } from "react";
import {
  ENERGY_META, nextUid, stonePhotos, stonesForEnergy,
  type DesignItem, type EnergyType, type Stone,
} from "./catalog";
import { BraceletThumb } from "./shop";

// 生日選石：生日 → 生命靈數 → 五石陣容（主星/內在/行動/流年/意圖），
// 每顆說清楚「為什麼是你」，最後一鍵把陣容載進工作室。同時回答
// 「我缺什麼能量」——數字給出天生的偏向，意圖石負責補上缺口。

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

  const zh = (k: EnergyType) => ENERGY_META.find((e) => e.key === k)!.zh;
  const core = pick(entry.main);
  const positions: Position[] = [
    { role: "主星石", en: "CORE", energy: entry.main, stone: core, why: `生命靈數 ${life}・${entry.persona}。${entry.line}` },
    { role: "內在石", en: "INNER", energy: monthKey, stone: pick(monthKey), why: `${m} 月出生的人，內在自帶${zh(monthKey)}的底色——安靜的時候，它就在。` },
    { role: "行動石", en: "ACTION", energy: dayKey, stone: pick(dayKey), why: `${d} 日的行動數落在${zh(dayKey)}——你出手的方式，一直是這個樣子。` },
    { role: "流年石", en: "PATTERN", energy: yearKey, stone: pick(yearKey), why: `${y} 年生的長期課題繞著${zh(yearKey)}轉——不急，它是一輩子的節奏。` },
    { role: "意圖石", en: "THEME", energy: themeKey, stone: pick(themeKey), why: theme ? `你說想補${zh(themeKey)}——那就讓它天天貼著你的脈搏。` : `數字顯示你最少照顧到的是${zh(themeKey)}——這顆替你補上。` },
  ];
  return { life, entry, themeKey, positions };
}

// 陣容 → 一條可直接載入工作室的手鍊：主星 12mm 置中，其餘四顆左右
// 對稱各一，白水晶 8mm 補到 14cm 手圍的八成五上下。
function lineupItems(positions: Position[]): DesignItem[] {
  const [core, inner, action, pattern, theme] = positions.map((p) => p.stone.id);
  const s = (id: string, mm: number): DesignItem => ({ kind: "stone", id, mm, uid: nextUid() });
  return [
    s(inner, 10), s(pattern, 10), s("clear", 8), s(action, 10), s(theme, 10),
    s(core, 12),
    s(theme, 10), s(action, 10), s("clear", 8), s(pattern, 10), s(inner, 10),
    s("clear", 8),
  ];
}

// Kimi 個人化解讀的三態：null＝不可用（沒 key／失敗，靜靜用內建文案）、
// "loading"＝生成中、Reading＝已送達。
type AiReading = { overall: string; stones: { role: string; line: string }[]; blessing: string };

export default function Quiz({ onLoadDesign, onHome }: {
  onLoadDesign: (items: DesignItem[], wrist: number) => void;
  onHome: () => void;
}) {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [theme, setTheme] = useState<EnergyType | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReturnType<typeof buildLineup> | null>(null);
  const [ai, setAi] = useState<AiReading | "loading" | null>(null);

  const submit = () => {
    if (!name.trim()) { setError("留個稱呼，結果才知道要寫給誰"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) { setError("請選擇你的生日"); return; }
    setError("");
    const r = buildLineup(birthday, theme);
    setResult(r);
    fetch("/api/quiz-lead", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), birthday, theme: r.themeKey, email: email.trim(), stones: r.positions.map((p) => p.stone.id).join(",") }),
    }).catch(() => {});
    // AI 個人化解讀：拿得到就逐段換上；拿不到（沒設 key、超時、超量）
    // 就維持內建文案，頁面不顯示任何錯誤——解讀是加分項，不是依賴。
    setAi("loading");
    const zhOf = (k: EnergyType) => ENERGY_META.find((e) => e.key === k)!.zh;
    fetch("/api/quiz-reading", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(), birthday, life: r.life, persona: r.entry.persona, theme: zhOf(r.themeKey),
        positions: r.positions.map((p) => ({ role: p.role, stone: p.stone.zh, energy: zhOf(p.energy) })),
      }),
    })
      .then(async (res) => (res.ok ? ((await res.json()) as { reading: AiReading }).reading : null))
      .then((reading) => setAi(reading))
      .catch(() => setAi(null));
    window.scrollTo({ top: 0 });
  };

  if (result) {
    const items = lineupItems(result.positions);
    const zhTheme = ENERGY_META.find((e) => e.key === result.themeKey)!;
    const zhLack = ENERGY_META.find((e) => e.key === result.entry.lack)!;
    const pickedOwnTheme = result.themeKey !== result.entry.lack;
    return <div className="quiz">
      <header className="shop-head">
        <button className="wordmark" onClick={onHome}>OMA <span>CRYSTAL</span></button>
        <div className="head-note">CRYSTAL BIRTH READING</div>
        <div className="head-actions"><button className="quiet" onClick={() => setResult(null)}>重測一次</button></div>
      </header>
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

  return <div className="quiz">
    <header className="shop-head">
      <button className="wordmark" onClick={onHome}>OMA <span>CRYSTAL</span></button>
      <div className="head-note">CRYSTAL BIRTH READING</div>
      <div className="head-actions" />
    </header>
    <section className="quiz-form">
      <p className="landing-eyebrow">生日選石</p>
      <h1>你的生日，<br />早就選好了石頭</h1>
      <span className="quiz-sub">一分鐘，從生命靈數算出屬於你的五石陣容——主星、內在、行動、流年，加上一顆補足缺口的意圖石。</span>
      <div className="quiz-fields">
        <label>怎麼稱呼你<input value={name} onChange={(e) => setName(e.target.value)} placeholder="小名或暱稱" maxLength={40} /></label>
        <label>生日<input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} min="1930-01-01" max="2026-12-31" /></label>
        <label className="quiz-theme"><span>此刻最想補的能量（可不選，讓生日決定）</span>
          <span className="quiz-chips">
            {ENERGY_META.map((m) => <button key={m.key} type="button" className={theme === m.key ? "on" : ""} style={{ "--chip": m.color } as React.CSSProperties} onClick={() => setTheme(theme === m.key ? null : m.key)}>{m.zh}</button>)}
          </span>
        </label>
        <label>Email（選填，之後想收到自己的陣容再填）<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      </div>
      {error && <p className="co-error">{error}</p>}
      <button className="landing-cta" onClick={submit}>看我的五石陣容 <i>→</i></button>
    </section>
  </div>;
}
