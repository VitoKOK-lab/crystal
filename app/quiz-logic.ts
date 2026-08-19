// 選石測驗的純邏輯：生命靈數、MBTI 缺口對照、三訊號加權投票與七輪
// 組珠。全部是無 React、無網路的純函式——單元測試直接吃這個模組
// （tests/quiz-logic.test.mjs）。
import {
  CHAKRA_META, ENERGY_META, canPadMore, inStock, nextUid, stonesForChakra, stonesForEnergy,
  type ChakraKey, type DesignItem, type EnergyType, type Stone,
} from "./catalog";

export const digitsSum = (s: string) => s.replace(/\D/g, "").split("").reduce((a, d) => a + Number(d), 0);
export const reduce9 = (n: number) => { while (n > 9) n = digitsSum(String(n)); return n || 9; };

// 陣容組珠的工廠——buildDeep 與 lineupFromIds 共用（曾各自定義一份，
// 逐字相同）。
export const stoneItem = (id: string, mm: number): DesignItem => ({ kind: "stone", id, mm, uid: nextUid() });

export type LifeEntry = { persona: string; main: EnergyType; lack: EnergyType; line: string };
// 每個生命靈數的原型：主能量（天生帶著的）與缺口能量（最少照顧到的）。
export const LIFE: Record<number, LifeEntry> = {
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

export const zhOf = (k: EnergyType) => ENERGY_META.find((e) => e.key === k)!.zh;

// --- 深度配對的三個訊號 ----------------------------------------------------

// MBTI 四軸→容易忽略的脈輪（性格的「用力方式」決定哪裡先透支）：
// 外向透支安靜（眉心輪）、內向缺向外的火（太陽神經叢）、直覺型缺落地
// （海底輪）、實感型缺連結（頂輪）、思考型缺心輪、情感型缺表達界線
// （喉輪）、計畫型缺流動玩性（臍輪）、隨性型缺結構（海底輪）。
export const MBTI_DEFICIT: Record<string, ChakraKey> = { E: "third-eye", I: "solar", N: "root", S: "crown", T: "heart", F: "throat", J: "sacral", P: "root" };
export const mbtiDesc = (t: string) => [
  t[0] === "E" ? "能量向外、越熱鬧越有電" : "能量向內、獨處才能充電",
  t[1] === "N" ? "靠直覺和想像看世界" : "靠實感一步一步踩地",
  t[2] === "T" ? "抉擇先講道理" : "抉擇先顧感受",
  t[3] === "J" ? "凡事先排好才安心" : "邊走邊調整最自在",
].join("、");

// 生命靈數缺口能量 → 脈輪。
export const ENERGY_CHAKRA: Record<EnergyType, ChakraKey> = { wealth: "solar", love: "heart", healing: "sacral", protection: "root", focus: "third-eye", power: "root" };

// 此刻的困擾 → 失衡的脈輪（客人語言，不講術語）。
export const CONCERNS: { key: ChakraKey; label: string }[] = [
  { key: "root", label: "睡不安穩、容易焦慮" },
  { key: "sacral", label: "提不起勁、疲憊麻木" },
  { key: "solar", label: "沒自信、一直拖延" },
  { key: "heart", label: "關係卡住、心很累" },
  { key: "throat", label: "有話說不出口" },
  { key: "third-eye", label: "思緒亂、難專注" },
  { key: "crown", label: "迷惘、找不到方向" },
];

export const MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
export const MBTI_QUESTIONS: { q: string; a: [string, string]; letters: [string, string] }[] = [
  { q: "充完電的方式是？", a: ["跟人聚一場、聊開來", "自己安靜待著"], letters: ["E", "I"] },
  { q: "你比較相信？", a: ["眼前的具體事實", "心裡冒出來的直覺"], letters: ["S", "N"] },
  { q: "做重要決定時，先看？", a: ["道理與效率", "感受與關係"], letters: ["T", "F"] },
  { q: "旅行前一晚，你是？", a: ["行程早就排好了", "到了再說比較好玩"], letters: ["J", "P"] },
];

export type DeepPick = { chakra: (typeof CHAKRA_META)[number]; stone: Stone; deficit: boolean; core: boolean };
export type DeepResult = {
  life: number; entry: LifeEntry; mbti: string; deficits: ChakraKey[];
  picks: DeepPick[]; items: DesignItem[];
};

export function buildDeep(birthday: string, mbti: string, concerns: ChakraKey[]): DeepResult {
  const life = reduce9(digitsSum(birthday));
  const entry = LIFE[life];
  // 三訊號加權投票：困擾（客人親口說的）×2、MBTI 傾向 ×1、命盤缺口 ×1。
  const score: Record<ChakraKey, number> = { root: 0, sacral: 0, solar: 0, heart: 0, "third-eye": 0, throat: 0, crown: 0 };
  for (const c of concerns) score[c] += 2;
  for (const letter of mbti) { const c = MBTI_DEFICIT[letter]; if (c) score[c] += 1; }
  score[ENERGY_CHAKRA[entry.lack]] += 1;
  const deficits = (Object.keys(score) as ChakraKey[]).filter((k) => score[k] > 0)
    .sort((a, b) => score[b] - score[a]).slice(0, 3);
  if (!deficits.length) deficits.push(ENERGY_CHAKRA[entry.lack]);

  // 七輪各一顆：同輪多顆時優先挑對頻命盤主能量的；重點輪 10mm、最重
  // 的輪 12mm、其餘 8mm；缺貨往下一顆遞補。
  const used = new Set<string>();
  const picks: DeepPick[] = CHAKRA_META.map((c) => {
    const deficit = deficits.includes(c.key);
    const core = c.key === deficits[0];
    const mm = core ? 12 : deficit ? 10 : 8;
    const pool = stonesForChakra(c.key, entry.main).filter((s) => !used.has(s.id));
    const stone = pool.find((s) => inStock({ kind: "stone", id: s.id, mm })) ?? pool[0] ?? stonesForEnergy(entry.main, 1)[0];
    used.add(stone.id);
    return { chakra: c, stone, deficit, core };
  });
  const items = picks.map((p) => stoneItem(p.stone.id, p.core ? 12 : p.deficit ? 10 : 8));
  // 白水晶 8mm 補到 14cm 手圍的 84% 上下（弧長模型，共用 canPadMore）。
  const widths = () => items.map((it) => it.mm as number);
  while (items.length < 20 && canPadMore(widths(), 14, 0.84)) {
    items.push(stoneItem("clear", 8));
  }
  return { life, entry, mbti, deficits, picks, items };
}

// --- 其餘模式共用 -----------------------------------------------------------

export function lineupFromIds(ids: [string, string, string, string, string]): DesignItem[] {
  const [core, inner, action, pattern, theme] = ids;
  const s = stoneItem;
  return [
    s(inner, 10), s(pattern, 10), s("clear", 8), s(action, 10), s(theme, 10),
    s(core, 12),
    s(theme, 10), s(action, 10), s("clear", 8), s(pattern, 10), s(inner, 10),
    s("clear", 8),
  ];
}

