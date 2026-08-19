import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./esbuild-import.mjs";

const catalog = await importCompiled("app/catalog.tsx");
const {
  itemMM, itemPrice, energyScores, dominantOf, rarityOf, parseSpec, buildSpec,
  encodeDesign, decodeDesign, layoutStrand, anglesForWidths, centersForWidths,
  WRIST_CHOICES, pricing, stones, accessories, byStone, byAccessory, ENERGY_META,
  stoneSizes, accessoryStock, sizesFor, stockOf, inStock, sizeWeight, DEFAULT_SIZES,
} = catalog;

test("itemMM sizes stones by BeadSize and accessories by spacer/charm", () => {
  assert.equal(itemMM({ kind: "stone", id: "rose", size: "xlarge" }), 20);
  assert.equal(itemMM({ kind: "stone", id: "rose", size: "large" }), 10);
  assert.equal(itemMM({ kind: "stone", id: "rose", size: "small" }), 8);
  assert.equal(itemMM({ kind: "accessory", id: "gold-hex" }), 5); // spacer
  assert.equal(itemMM({ kind: "accessory", id: "moon-charm" }), 3); // charm
});

test("itemPrice adds the size surcharge on top of the stone's base price", () => {
  const base = byStone.rose.price;
  assert.equal(itemPrice({ kind: "stone", id: "rose", size: "large" }), base + 80);
  assert.equal(itemPrice({ kind: "stone", id: "rose", size: "xlarge" }), base + 320);
  assert.equal(itemPrice({ kind: "stone", id: "rose", size: "small" }), base);
  assert.equal(itemPrice({ kind: "accessory", id: "gold-hex" }), byAccessory["gold-hex"].price);
});

test("rarityOf tiers at the RARITY_TIER boundaries", () => {
  assert.equal(rarityOf(280), "common");
  assert.equal(rarityOf(281), "rare");
  assert.equal(rarityOf(450), "rare");
  assert.equal(rarityOf(451), "legendary");
});

test("energyScores weights by bead size and dominantOf finds the max", () => {
  const items = buildSpec([["rose", "large"]]);
  const scores = energyScores(items);
  assert.equal(scores.love, Math.round(byStone.rose.energy.love * 36));
  assert.equal(dominantOf(scores).key, "love");

  const xlargeScores = energyScores(buildSpec([["rose", "xlarge"]]));
  assert.equal(xlargeScores.love, Math.round(byStone.rose.energy.love * 1.6 * 36));
});

test("parseSpec reads the compact .x/.s/bare size notation", () => {
  const items = parseSpec("rose.x,rose.s,rose,gold-hex");
  assert.deepEqual(items.map((i) => [i.kind, i.id, i.size]), [
    ["stone", "rose", "xlarge"],
    ["stone", "rose", "small"],
    ["stone", "rose", "large"], // bare id defaults to 10mm, same as an explicit ".l"
    ["accessory", "gold-hex", undefined],
  ]);
});

test("encodeDesign/decodeDesign round-trips a design", () => {
  const items = buildSpec([["rose", "large"], ["gold-hex"]]);
  const code = encodeDesign(items, 14);
  const decoded = decodeDesign(code);
  assert.ok(decoded);
  assert.equal(decoded.wrist, 14);
  assert.deepEqual(
    decoded.items.map((i) => [i.kind, i.id, i.size]),
    items.map((i) => [i.kind, i.id, i.size]),
  );
});

// decodeDesign parses the ?d= query param, so it's parsing untrusted input
// straight from a URL a visitor could hand-edit or share.
test("decodeDesign rejects malformed/oversized/unknown untrusted input", () => {
  assert.equal(decodeDesign("13.3|rose.l"), null, "wrist not in WRIST_CHOICES");
  assert.equal(decodeDesign(`13|${Array(20).fill("rose.x").join(",")}`), null, "overflows even the largest wrist");
  assert.equal(decodeDesign("14|not-a-real-id"), null, "unknown id");
  assert.equal(decodeDesign("14|"), null, "empty item list");
  assert.equal(decodeDesign("garbage"), null, "no separator at all");
  assert.equal(decodeDesign(""), null, "empty string");
});

test("every catalogue id round-trips through byStone/byAccessory", () => {
  for (const s of stones) assert.equal(byStone[s.id]?.id, s.id);
  for (const a of accessories) assert.equal(byAccessory[a.id]?.id, a.id);
});

// --- Arc geometry: a bead on a ring takes 2R·asin(w/2R) of circumference,
// more than its diameter — the physical model behind fill, layout and the
// wrist auto-grow.

test("arcWidthMM exceeds the raw diameter, and more so for big beads", () => {
  const smallExcess = catalog.arcWidthMM(8, 140) - 8;
  const bigExcess = catalog.arcWidthMM(20, 140) - 20;
  assert.ok(smallExcess > 0 && smallExcess < 0.1, "8mm bead barely differs");
  assert.ok(bigExcess > 0.5, "20mm bead needs visibly more arc");
  assert.ok(bigExcess > smallExcess);
});

test("a wrist size buys a bead circle bigger than the wrist itself", () => {
  // 手圍只決定「內圈」；珠心圈還要外推半顆珠，粗珠外推得更多。
  const cap8 = catalog.capacityForWrist(14, [8, 8, 8]);
  const cap20 = catalog.capacityForWrist(14, [20, 20, 20]);
  assert.ok(cap8 > 140 + catalog.sizing.easeMM, "centre circle sits outside the inner circle");
  assert.ok(cap20 > cap8, "chunkier beads need a bigger centre circle for the same wrist");
  // 反推回去，成品內圈要等於手圍＋鬆度。
  assert.ok(Math.abs(catalog.innerCircumferenceMM(cap20, [20, 20, 20]) - (140 + catalog.sizing.easeMM)) < 1e-6);
});

test("seven 20mm beads leave room on a 13cm wrist under the honest model", () => {
  const widths = Array(7).fill(20);
  const cap = catalog.capacityForWrist(13, widths);
  assert.ok(catalog.strandArcMM(widths, cap) < cap, "7×20mm does not fill a real 13cm bracelet");
  assert.equal(catalog.fitWristCm(widths, 13), 13, "so 13cm is already an honest fit");
});

test("a 14cm wrist needs ~17 beads of 10mm, not 13", () => {
  // 這是舊模型最大的謊：把手圍當成珠心圈，成品會小整整 π×珠徑。
  let n = 0;
  while (n < 40) {
    const widths = Array(n + 1).fill(10);
    const cap = catalog.capacityForWrist(14, widths);
    if (catalog.strandArcMM(widths, cap) > cap) break;
    n++;
  }
  assert.ok(n >= 16 && n <= 18, `expected ~17 beads, got ${n}`);
});

test("closedLoopCapacityMM makes the pair chords subtend exactly 2π", () => {
  const widths = [20, 10, 20, 8, 20, 10, 20];   // 混尺寸才看得出弦長模型的差別
  const cap = catalog.closedLoopCapacityMM(widths);
  const R = cap / (Math.PI * 2);
  const chords = catalog.chordsFor(widths, true);
  const total = chords.reduce((a, c) => a + 2 * Math.asin(c / (2 * R)), 0);
  assert.ok(Math.abs(total - Math.PI * 2) < 1e-5, `closed loop must land on 2π, got ${total}`);
});

test("solveRingRadiusMM refuses an impossible ring instead of guessing", () => {
  assert.equal(catalog.solveRingRadiusMM([10, 10]), null, "two chords can't close a ring");
});

test("adjacent beads sit exactly tangent, mixed sizes included", () => {
  // 相鄰兩顆的圓心距必須剛好等於 (d₁+d₂)/2 + 繩距——這是「貼合」的定義。
  const widths = [20, 8, 12, 10, 20];
  const cap = catalog.capacityForWrist(15, widths);
  const angles = anglesForWidths(widths, cap);
  const R = cap / (Math.PI * 2);
  for (let i = 0; i < widths.length - 1; i++) {
    const chord = 2 * R * Math.sin((angles[i + 1] - angles[i]) / 2);
    const needed = (widths[i] + widths[i + 1]) / 2 + catalog.sizing.cordGapMM;
    assert.ok(Math.abs(chord - needed) < 1e-6,
      `${widths[i]}mm+${widths[i + 1]}mm: centre distance ${chord.toFixed(4)} should be ${needed.toFixed(4)}`);
  }
});

test("old share links still decode under the new sizing model", () => {
  const decoded = decodeDesign("13|rose.x,rose.x,rose.x,rose.x,rose.x,rose.x,rose.x");
  assert.ok(decoded, "still decodes — old links must not die");
  assert.equal(decoded.items.length, 7);
  assert.equal(decoded.wrist, 13, "7×20mm now genuinely fits the 13cm it claimed");
});

test("layoutStrand agrees with anglesForWidths/centersForWidths on the same items", () => {
  const items = buildSpec([["rose", "large"], ["rose", "large"], ["gold-hex"]]);
  const capacityMM = 140;
  const placed = layoutStrand(items, capacityMM);
  const widths = items.map(itemMM);
  const angles = anglesForWidths(widths, capacityMM);
  const centers = centersForWidths(widths);
  placed.forEach((p, i) => {
    assert.equal(p.mm, widths[i]);
    assert.ok(Math.abs(p.angle - angles[i]) < 1e-9);
  });
  for (let i = 1; i < centers.length; i++) assert.ok(centers[i] > centers[i - 1], "centers must be strictly increasing");
});

test("ENERGY_META/WRIST_CHOICES/pricing have the shape the rest of the app assumes", () => {
  assert.equal(ENERGY_META.length, 6);
  assert.equal(WRIST_CHOICES.length, 19);
  assert.equal(WRIST_CHOICES[0], 13);
  assert.equal(WRIST_CHOICES[WRIST_CHOICES.length - 1], 22);
  assert.deepEqual(pricing, { baseFee: 680, shippingFee: 120, freeShippingOver: 3000 });
});

// --- Admin-defined size ladders (the database can give a stone any set of
// diameters; nothing may hard-code the original 8/10/20 trio).

test("sizesFor falls back to the default ladder until the database supplies one", () => {
  assert.deepEqual(sizesFor("rose").map((s) => s.mm), DEFAULT_SIZES.map((s) => s.mm));
});

test("a custom ladder drives size, price and stock for that stone only", () => {
  stoneSizes["rose"] = [
    { mm: 6, priceDelta: 0, stock: 4 },
    { mm: 12, priceDelta: 150, stock: 0 },
  ];
  try {
    assert.deepEqual(sizesFor("rose").map((s) => s.mm), [6, 12]);
    assert.deepEqual(sizesFor("clear").map((s) => s.mm), DEFAULT_SIZES.map((s) => s.mm), "other stones keep the default");

    const six = { kind: "stone", id: "rose", mm: 6 };
    const twelve = { kind: "stone", id: "rose", mm: 12 };
    assert.equal(itemMM(six), 6, "strand width follows the custom mm");
    assert.equal(itemPrice(six), byStone.rose.price + 0);
    assert.equal(itemPrice(twelve), byStone.rose.price + 150, "price delta comes from the ladder");
    assert.equal(stockOf(six), 4);
    assert.equal(inStock(six), true);
    assert.equal(inStock(twelve), false, "a zero-stock size is unbuyable");
  } finally {
    delete stoneSizes["rose"];
  }
});

test("accessory stock gates availability, defaulting to available", () => {
  const item = { kind: "accessory", id: "gold-hex" };
  assert.equal(inStock(item), true);
  accessoryStock["gold-hex"] = 0;
  try {
    assert.equal(inStock(item), false);
  } finally {
    delete accessoryStock["gold-hex"];
  }
});

test("size weight reproduces the original ladder and interpolates custom sizes", () => {
  assert.equal(sizeWeight(8), 0.8);
  assert.equal(sizeWeight(10), 1);
  assert.ok(Math.abs(sizeWeight(20) - 1.6) < 1e-9);
  assert.ok(sizeWeight(12) > sizeWeight(10) && sizeWeight(12) < sizeWeight(20), "12mm sits between 10 and 20");
});

test("share links round-trip custom sizes and still decode legacy letter links", () => {
  const items = [{ kind: "stone", id: "rose", mm: 12 }, { kind: "accessory", id: "gold-hex" }];
  const code = encodeDesign(items, 17);
  assert.ok(code.includes("rose.12"), `expected explicit mm in ${code}`);
  const back = decodeDesign(code);
  assert.equal(back.items[0].mm, 12);
  assert.equal(itemMM(back.items[0]), 12);

  const legacy = decodeDesign("17|rose.x,clear.l,smoky.s,gold-hex");
  assert.deepEqual(legacy.items.map(itemMM), [20, 10, 8, 5], "old links keep their original sizes");
});

test("parseSpec accepts both legacy letters and numeric sizes", () => {
  const [a, b] = parseSpec("rose.x,rose.12");
  assert.equal(itemMM(a), 20);
  assert.equal(itemMM(b), 12);
});

// The admin's composition editor resolves spec tokens through specTokenMM;
// the storefront resolves them through parseSpec/itemMM. Lock them together.
test("specTokenMM agrees with parseSpec+itemMM for every token form", () => {
  for (const [suffix, want] of [["x", 20], ["s", 8], ["l", 10], [undefined, 10], ["12", 12], ["6.5", 6.5]]) {
    const token = suffix === undefined ? "rose" : `rose.${suffix}`;
    assert.equal(catalog.specTokenMM(suffix), want, `specTokenMM(${suffix})`);
    assert.equal(itemMM(parseSpec(token)[0]), want, `parseSpec(${token})`);
  }
});
