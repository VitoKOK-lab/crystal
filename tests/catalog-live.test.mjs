// Hydration of the live database catalog into the baked-in module data.
// The invariants under test: the admin 設定 page's numbers reach pricing,
// one malformed section costs only that section, and a material row that
// arrives without a photo falls back to the baked photo (or is dropped)
// instead of poisoning the whole payload.
import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./esbuild-import.mjs";

const { live, catalog, series } = await importCompiled("tests/fixtures/live-entry.ts");

const stoneRow = (id, over = {}) => ({
  id, zh: "測試石", en: "Test Stone", energy_zh: "守護", price: 300, note: "",
  energies: JSON.stringify({ wealth: 1, love: 1, healing: 1, protection: 1, focus: 1, power: 1 }),
  photo: `/materials/${id}.png`, ...over,
});
const accessoryRow = (id, over = {}) => ({
  id, zh: "測試隔珠", en: "Test Spacer", type: "spacer", metal: "gold", price: 100, note: "",
  photo: `/materials/${id}.png`, stock: 5, ...over,
});

test("settings hydrate into pricing even when other sections fail", () => {
  const before = catalog.stones.length;
  live.hydrate({
    stones: [], accessories: [], series: [], products: [], // materials section throws (empty)
    settings: { base_fee: "800", shipping_fee: "100", free_shipping_over: "2500" },
  });
  assert.deepEqual(catalog.pricing, { baseFee: 800, shippingFee: 100, freeShippingOver: 2500 });
  assert.equal(catalog.stones.length, before, "failed materials section left baked data alone");
});

test("non-numeric settings are ignored, keeping the previous values", () => {
  live.hydrate({ stones: [], accessories: [], series: [], products: [], settings: { base_fee: "8oo", shipping_fee: "-5" } });
  assert.deepEqual(catalog.pricing, { baseFee: 800, shippingFee: 100, freeShippingOver: 2500 });
});

test("a malformed series tone skips only the series section", () => {
  const seriesBefore = series.SERIES.length;
  live.hydrate({
    stones: [], accessories: [],
    series: [{ id: "broken", tone: "{not json" }],
    products: [{ id: "p", series_id: "broken", name: "x", tagline: "", style: "balanced", wrist: 14, spec: "rose.l" }],
    settings: { base_fee: "680" },
  });
  assert.equal(series.SERIES.length, seriesBefore, "baked series survive a broken payload");
  assert.equal(catalog.pricing.baseFee, 680, "later sections still ran");
});

test("a row without a photo falls back to the baked photo; an unknown one is dropped", () => {
  const bakedRosePhoto = catalog.stonePhotos.rose;
  live.hydrate({
    stones: [stoneRow("rose", { photo: "" }), stoneRow("brand-new-stone", { photo: "" })],
    accessories: [accessoryRow("gold-hex", { photo: "/img/uploads/accessory/gold-hex-1.png" })],
    series: [], products: [],
  });
  assert.equal(catalog.stones.length, 1, "the photo-less unknown stone is hidden, not fatal");
  assert.equal(catalog.byStone.rose.zh, "測試石", "database fields replaced the baked row");
  assert.equal(catalog.stonePhotos.rose, bakedRosePhoto, "baked photo fills the gap");
  assert.equal(catalog.byStone["brand-new-stone"], undefined);
  assert.equal(catalog.accessoryPhotos["gold-hex"], "/img/uploads/accessory/gold-hex-1.png");
  assert.equal(catalog.accessoryStock["gold-hex"], 5);
});
