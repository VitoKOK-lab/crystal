// 選石測驗純邏輯＋分類學（脈輪/顏色）的單元測試。這些函式決定客人
// 拿到哪七顆石頭——之前完全沒有測試網。
import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./esbuild-import.mjs";

const logic = await importCompiled("app/quiz-logic.ts");
const catalog = await importCompiled("app/catalog.tsx");
const { buildDeep, lineupFromIds, reduce9, digitsSum, LIFE, CONCERNS } = logic;
const { CHAKRA_META, chakraOf, stonesForChakra, colorGroupOf, COLOR_GROUPS, stones, strandArcMM, capacityForWrist } = catalog;

// --- 生命靈數 ---------------------------------------------------------------

test("digitsSum + reduce9 derive the life number from a birthday", () => {
  assert.equal(digitsSum("1995-08-16"), 39);
  assert.equal(reduce9(39), 3, "39 → 12 → 3");
  assert.equal(reduce9(digitsSum("2000-01-01")), 4);
  assert.equal(reduce9(9), 9);
  assert.equal(reduce9(0), 9, "all-zero input falls to 9, never 0");
  for (let n = 1; n <= 9; n++) assert.ok(LIFE[n], `life number ${n} has a persona entry`);
});

// --- buildDeep：七輪陣容 ----------------------------------------------------

test("buildDeep picks exactly one stone per chakra, no duplicates", () => {
  const r = buildDeep("1995-08-16", "INFJ", ["root"]);
  assert.equal(r.picks.length, 7);
  assert.deepEqual(r.picks.map((p) => p.chakra.key), CHAKRA_META.map((c) => c.key), "海底輪→頂輪順序");
  const ids = r.picks.map((p) => p.stone.id);
  assert.equal(new Set(ids).size, 7, "no stone appears twice");
});

test("a customer-voiced concern (×2) outranks MBTI and life-number signals (×1)", () => {
  // INTJ 的 MBTI 缺口票：I→solar, N→root, T→heart, J→sacral（各 1 票）；
  // 生命靈數 3（表達者）缺 wealth→solar（1 票）→ solar 共 2 票。
  // 客人親口勾「喉輪」×2 —— 權重並列時，重點輪必須包含喉輪。
  const r = buildDeep("1995-08-16", "INTJ", ["throat"]);
  assert.ok(r.deficits.includes("throat"), "spoken concern must make the deficit list");
  // 三票的困擾一定壓過所有單票訊號。
  const r2 = buildDeep("1995-08-16", "INTJ", ["throat", "crown", "heart"]);
  assert.equal(r2.deficits.length, 3);
  assert.ok(["throat", "crown", "heart"].includes(r2.deficits[0]), "top deficit comes from concerns");
});

test("deficit chakras get bigger beads: core 12mm, deficit 10mm, rest 8mm", () => {
  const r = buildDeep("1995-08-16", "INFJ", ["heart"]);
  for (let i = 0; i < 7; i++) {
    const p = r.picks[i];
    const expected = p.core ? 12 : p.deficit ? 10 : 8;
    assert.equal(r.items[i].mm, expected, `${p.chakra.key} bead size`);
  }
});

test("the padded strand fills most of a real 14cm bracelet", () => {
  const r = buildDeep("1990-12-31", "ESFP", ["crown"]);
  const widths = r.items.map((it) => it.mm);
  const cap = capacityForWrist(14, widths);   // 珠心圈，不是手圍本身
  const arc = strandArcMM(widths, cap);
  assert.ok(arc <= cap, `must fit: ${arc.toFixed(1)} of ${cap.toFixed(1)}mm`);
  assert.ok(arc >= cap * 0.78, `must not be sparse: ${(100 * arc / cap).toFixed(0)}%`);
  assert.ok(r.items.length <= 20, "hard cap on item count");
  assert.ok(r.items.slice(7).every((it) => it.id === "clear"), "padding is clear quartz");
});

test("every CONCERNS chip maps to a real chakra", () => {
  const keys = new Set(CHAKRA_META.map((c) => c.key));
  for (const c of CONCERNS) assert.ok(keys.has(c.key), c.label);
});

// --- lineupFromIds：五石陣容 ------------------------------------------------

test("lineupFromIds builds the symmetric 12-piece lineup with the core at centre", () => {
  const items = lineupFromIds(["rose", "moon", "sunstone", "lapis", "citrine"]);
  assert.equal(items.length, 12);
  assert.equal(items[5].id, "rose", "core stone sits at the centre");
  assert.equal(items[5].mm, 12, "core is the 12mm focal");
  assert.ok(items.every((it) => it.uid !== undefined), "every piece carries a uid");
});

// --- 七脈輪分類 -------------------------------------------------------------

test("chakra overrides beat the keyword cascade", () => {
  assert.equal(chakraOf("blue-tiger-eye"), "third-eye", "override wins over the tiger-eye→solar rule");
  assert.equal(chakraOf("moss"), "heart", "moss reaches heart via the override");
  assert.equal(chakraOf("tiger-eye"), "solar");
  assert.equal(chakraOf("obsidian"), "root");
  assert.equal(chakraOf("clear"), "crown", "white quartz family falls through to crown");
});

test("every baked stone maps to a real chakra and all seven chakras have a pool", () => {
  const keys = new Set(CHAKRA_META.map((c) => c.key));
  for (const s of stones) assert.ok(keys.has(chakraOf(s.id)), s.id);
  for (const c of CHAKRA_META) {
    assert.ok(stonesForChakra(c.key).length > 0, `${c.key} must have at least one stone or buildDeep throws`);
  }
});

// --- 顏色分群 ---------------------------------------------------------------

test("colorGroupOf lands every stone in a real colour group", () => {
  const groups = new Set(COLOR_GROUPS.map((g) => g.key));
  for (const s of stones) assert.ok(groups.has(colorGroupOf(s.id)), s.id);
  assert.equal(colorGroupOf("no-such-stone"), "white", "unknown ids default to 白透, never crash");
});
