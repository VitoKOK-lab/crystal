import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./esbuild-import.mjs";

const catalog = await importCompiled("app/catalog.tsx");
const {
  itemMM, itemPrice, energyScores, dominantOf, rarityOf, parseSpec, buildSpec,
  encodeDesign, decodeDesign, layoutStrand, anglesForWidths, centersForWidths,
  WRIST_CHOICES, BASE_FEE, stones, accessories, byStone, byAccessory, ENERGY_META,
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
  assert.equal(decodeDesign("13|rose.x,rose.x,rose.x,rose.x,rose.x,rose.x,rose.x"), null, "overflows capacity");
  assert.equal(decodeDesign("14|not-a-real-id"), null, "unknown id");
  assert.equal(decodeDesign("14|"), null, "empty item list");
  assert.equal(decodeDesign("garbage"), null, "no separator at all");
  assert.equal(decodeDesign(""), null, "empty string");
});

test("every catalogue id round-trips through byStone/byAccessory", () => {
  for (const s of stones) assert.equal(byStone[s.id]?.id, s.id);
  for (const a of accessories) assert.equal(byAccessory[a.id]?.id, a.id);
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

test("ENERGY_META/WRIST_CHOICES/BASE_FEE have the shape the rest of the app assumes", () => {
  assert.equal(ENERGY_META.length, 6);
  assert.equal(WRIST_CHOICES.length, 19);
  assert.equal(WRIST_CHOICES[0], 13);
  assert.equal(WRIST_CHOICES[WRIST_CHOICES.length - 1], 22);
  assert.equal(BASE_FEE, 680);
});
