"use client";

import { useState } from "react";
import {
  byChakra, stonePhotos, stonesForEnergy,
  type ChakraKey, type DesignItem, type EnergyType, type Stone,
} from "./catalog";
import { BraceletThumb } from "./shop";
import {
  CONCERNS, LIFE, MBTI_QUESTIONS, MBTI_TYPES, buildDeep, lineupFromIds, mbtiDesc, reduce9, digitsSum, zhOf,
  type DeepResult,
} from "./quiz-logic";

// 選石測驗的三種入口：
//   深度配對 — 生日（生命靈數）× MBTI（4 題快測或直接選型）× 此刻的
//              困擾（對應脈輪失衡）→ 七輪平衡陣容＋AI 深度解讀。沒有
//              AI 也有完整的內建文案版本。
//   許願     — 用自己的話說願望 → AI 從全目錄選五顆（純 AI 功能）
//   合盤     — 兩人生日＋關係 → 各自主石＋共享連結石＋合盤解讀

type DeepReadingText = { overall: string; stones: { role: string; line: string }[]; blessing: string };
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
  const [mode, setMode] = useState<"deep" | "wish" | "pair">("deep");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  // 深度配對
  const [knowMbti, setKnowMbti] = useState(false);
  const [mbtiPick, setMbtiPick] = useState("");
  const [answers, setAnswers] = useState<(0 | 1 | null)[]>([null, null, null, null]);
  const [concerns, setConcerns] = useState<ChakraKey[]>([]);
  const [deepBusy, setDeepBusy] = useState(false);
  const [deepResult, setDeepResult] = useState<DeepResult | null>(null);
  const [deepText, setDeepText] = useState<DeepReadingText | "loading" | null>(null);
  // 許願
  const [wish, setWish] = useState("");
  const [wishBusy, setWishBusy] = useState(false);
  const [wishResult, setWishResult] = useState<WishReading | null>(null);
  // 合盤
  const [relation, setRelation] = useState("閨蜜");
  const [nameB, setNameB] = useState("");
  const [birthdayB, setBirthdayB] = useState("");
  const [pairBusy, setPairBusy] = useState(false);
  const [pairResult, setPairResult] = useState<PairResult | null>(null);

  const reset = () => { setDeepResult(null); setDeepText(null); setWishResult(null); setPairResult(null); setError(""); };

  const submitDeep = async () => {
    if (!name.trim()) { setError("留個稱呼，結果才知道要寫給誰"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) { setError("請選擇你的生日"); return; }
    const mbti = knowMbti
      ? mbtiPick
      : answers.every((a) => a !== null) ? answers.map((a, i) => MBTI_QUESTIONS[i].letters[a as 0 | 1]).join("") : "";
    if (!/^[EI][SN][TF][JP]$/.test(mbti)) { setError(knowMbti ? "選一下你的 MBTI 型號" : "四題都選一下，一題一秒鐘"); return; }
    setError("");
    setDeepBusy(true);
    const r = buildDeep(birthday, mbti, concerns);
    setDeepResult(r);
    setDeepText("loading");
    postJson("/api/quiz-lead", { name: name.trim(), birthday, theme: r.deficits[0], email: email.trim(), stones: r.picks.map((p) => p.stone.id).join(",") }).catch(() => {});
    // AI 深度解讀：拿得到逐段換上；拿不到維持內建文案，不顯示錯誤。
    postJson("/api/deep-reading", {
      name: name.trim(), birthday, life: r.life, persona: r.entry.persona, mbti,
      concerns: concerns.map((c) => byChakra[c].zh),
      positions: r.picks.map((p) => ({ role: p.chakra.zh, stone: p.stone.zh, note: p.deficit ? "此輪偏弱，重點補強" : "維持平衡" })),
    })
      .then(async (res) => (res.ok ? ((await res.json()) as { reading: DeepReadingText }).reading : null))
      .then((reading) => setDeepText(reading))
      .catch(() => setDeepText(null));
    setDeepBusy(false);
    window.scrollTo({ top: 0 });
  };

  const submitWish = async () => {
    if (!name.trim()) { setError("留個稱呼，結果才知道要寫給誰"); return; }
    if (wish.trim().length < 5) { setError("多說一點——願望至少要一句話"); return; }
    setError("");
    setWishBusy(true);
    try {
      const res = await postJson("/api/wish-reading", { name: name.trim(), wish: wish.trim() });
      if (res.status === 503) { setError("AI 顧問暫時休息中——先用深度配對算一條，或晚點再來許願"); return; }
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
    const bondEnergy: EnergyType = relation === "情侶" ? "love" : relation === "家人" ? "protection" : "healing";
    const used = new Set<string>();
    const pick = (key: EnergyType): Stone => {
      const found = stonesForEnergy(key, 10).find((s) => !used.has(s.id)) ?? stonesForEnergy(key, 1)[0];
      used.add(found.id);
      return found;
    };
    const stoneA = pick(entryA.main), stoneB = pick(entryB.main), bond = pick(bondEnergy);
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
    <div className="head-actions">{(deepResult || wishResult || pairResult) && <button className="quiet" onClick={reset}>再算一次</button>}</div>
  </header>;

  // --- 深度配對結果 --------------------------------------------------------
  if (deepResult) {
    const r = deepResult;
    const ai = deepText;
    const fallbackOverall = `${name}，生命靈數 ${r.life} 的${r.entry.persona}——${r.entry.line}${mbtiDesc(r.mbti)}的你，能量最需要照顧的是${r.deficits.map((d) => byChakra[d].zh).join("、")}。這條七輪平衡手鍊從海底輪排到頂輪，偏弱的輪用更大的主珠替你補上。`;
    return <div className="quiz">
      {header("CHAKRA BALANCE READING")}
      <section className="quiz-result">
        <p className="landing-eyebrow">生命靈數 {r.life} · {r.entry.persona} · MBTI {r.mbti}</p>
        <h1>{name} 的七輪平衡陣容</h1>
        {/* 七脈輪能量軸：偏弱的輪標「補」並放大 */}
        <div className="chakra-axis">
          {r.picks.map((p) => <div key={p.chakra.key} className={`ca-dot ${p.deficit ? "weak" : ""} ${p.core ? "core" : ""}`}>
            <i style={{ background: p.chakra.color }} />
            <span>{p.chakra.zh}</span>
            {p.deficit && <b>補</b>}
          </div>)}
        </div>
        {ai === "loading" && <p className="quiz-ai loading">顧問正在為你寫深度解讀…</p>}
        <div className="quiz-ai"><p>{ai && ai !== "loading" ? ai.overall : fallbackOverall}</p><span>— 寫給 {name} 的深度解讀</span></div>
        <div className="quiz-preview"><BraceletThumb items={r.items} wrist={14} /></div>
        <div className="quiz-stones">
          {r.picks.map((p, i) => {
            const aiLine = ai && ai !== "loading" ? ai.stones[i]?.line : null;
            return <div className="quiz-stone" key={p.chakra.key}>
              <img src={stonePhotos[p.stone.id]} alt={p.stone.zh} />
              <div>
                <span className="qs-role" style={{ color: p.chakra.color }}>{p.chakra.zh} · {p.chakra.body}{p.deficit && <b className="qs-weak">重點補強</b>}</span>
                <b className="qs-name">{p.stone.zh} <i>{p.stone.en}</i></b>
                <p>{aiLine ?? p.stone.note ?? `${p.chakra.body}的守位石，替你把${p.chakra.zh}穩穩顧好。`}</p>
              </div>
            </div>;
          })}
        </div>
        {ai && ai !== "loading" && ai.blessing && <p className="quiz-blessing">{ai.blessing}</p>}
        <button className="landing-cta" onClick={() => onLoadDesign(r.items, 14)}>把陣容載入工作室 <i>→</i></button>
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
          {[{ person: a, line: text.a_line, items: itemsA }, { person: b, line: text.b_line, items: itemsB }].map(({ person, line, items }) => <div className="pair-card" key={person.name}>
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
    {header(mode === "deep" ? "CHAKRA BALANCE READING" : mode === "wish" ? "MAKE A WISH" : "TWO OF US")}
    <section className="quiz-form">
      <p className="landing-eyebrow">選石測驗</p>
      {mode === "deep" && <h1>三分鐘，配出<br />只屬於你的七輪平衡</h1>}
      {mode === "wish" && <h1>說個願望，<br />顧問替你選石</h1>}
      {mode === "pair" && <h1>兩個人，<br />一對互相呼應的手鍊</h1>}
      <div className="quiz-modes">
        {([["deep", "深度配對"], ["wish", "說個願望"], ["pair", "兩個人合盤"]] as const).map(([key, label]) => <button
          key={key} type="button" className={mode === key ? "on" : ""} onClick={() => { setMode(key); setError(""); }}
        >{label}</button>)}
      </div>
      {mode === "deep" && <span className="quiz-sub">生日給命盤底色、四題快測看性格怎麼用力、再勾一下此刻的狀態——三個訊號合起來，配出七個脈輪各就各位的一條手鍊。</span>}
      {mode === "wish" && <span className="quiz-sub">用自己的話說：想撐過什麼、想留住什麼、想成為什麼。顧問會讀懂它，從一百多種石頭裡選出剛好的五顆。</span>}
      {mode === "pair" && <span className="quiz-sub">閨蜜、情侶或家人——兩個人的生日各算一條，再共享一顆連結石，戴著就想起彼此。</span>}
      <div className="quiz-fields">
        <label>怎麼稱呼你<input value={name} onChange={(e) => setName(e.target.value)} placeholder="小名或暱稱" maxLength={40} /></label>
        {mode !== "wish" && <label>{mode === "pair" ? "你的生日" : "生日"}<input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} min="1930-01-01" max="2026-12-31" /></label>}
        {mode === "deep" && <>
          <label className="quiz-theme"><span>你知道自己的 MBTI 嗎？</span>
            <span className="quiz-chips">
              <button type="button" className={!knowMbti ? "on" : ""} onClick={() => setKnowMbti(false)}>不知道，快測給我</button>
              <button type="button" className={knowMbti ? "on" : ""} onClick={() => setKnowMbti(true)}>知道，直接選</button>
            </span>
          </label>
          {knowMbti
            ? <label className="quiz-theme"><span>你的型號</span>
              <span className="quiz-chips mbti-grid">
                {MBTI_TYPES.map((t) => <button key={t} type="button" className={mbtiPick === t ? "on" : ""} onClick={() => setMbtiPick(t)}>{t}</button>)}
              </span>
            </label>
            : MBTI_QUESTIONS.map((q, i) => <label className="quiz-theme" key={q.q}><span>{i + 1}. {q.q}</span>
              <span className="quiz-chips">
                {q.a.map((opt, j) => <button key={opt} type="button" className={answers[i] === j ? "on" : ""} onClick={() => setAnswers((v) => v.map((x, k) => k === i ? (j as 0 | 1) : x))}>{opt}</button>)}
              </span>
            </label>)}
          <label className="quiz-theme"><span>此刻的狀態（最多勾三個，可不勾）</span>
            <span className="quiz-chips">
              {CONCERNS.map((c) => <button key={c.key} type="button" className={concerns.includes(c.key) ? "on" : ""} style={{ "--chip": byChakra[c.key].color } as React.CSSProperties}
                onClick={() => setConcerns((v) => v.includes(c.key) ? v.filter((x) => x !== c.key) : v.length < 3 ? [...v, c.key] : v)}>{c.label}</button>)}
            </span>
          </label>
          <label>Email（選填，之後想收到自己的陣容再填）<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        </>}
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
      </div>
      {error && <p className="co-error">{error}</p>}
      {mode === "deep" && <button className="landing-cta" disabled={deepBusy} onClick={submitDeep}>{deepBusy ? "正在配對…" : "看我的七輪平衡陣容 →"}</button>}
      {mode === "wish" && <button className="landing-cta" disabled={wishBusy} onClick={submitWish}>{wishBusy ? "顧問正在讀你的願望…" : "替我選石 →"}</button>}
      {mode === "pair" && <button className="landing-cta" disabled={pairBusy} onClick={submitPair}>{pairBusy ? "正在合盤…" : "看我們的合盤 →"}</button>}
    </section>
  </div>;
}
