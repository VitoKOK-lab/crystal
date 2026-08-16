// Phase 1 of the data migration: the catalog module keeps shipping with the
// baked-in data (instant first paint, and the only data source on hosts with
// no API, like the legacy GitHub Pages build), but at boot we try to replace
// it with the live database catalog from /api/catalog. Hydration happens
// BEFORE React mounts, so every component still reads plain module data and
// nothing about their render logic changes.
//
// Fallback ladder: live API → last-good copy in localStorage → baked-in.
import { accessories, accessoryPhotos, accessoryStock, byAccessory, byStone, pricing, stonePhotos, stoneSizes, stones, type Accessory, type Stone } from "./catalog";
import { SERIES, bySeries, type Product, type Series } from "./series";

type StoneRow = { id: string; zh: string; en: string; energy_zh: string; price: number; note: string; energies: string; photo: string };
type AccessoryRow = { id: string; zh: string; en: string; type: Accessory["type"]; metal: Accessory["metal"]; price: number; note: string; photo: string; stock?: number };
type SizeRow = { stone_id: string; mm: number; price_delta: number; stock: number };
type SeriesRow = { id: string; tone: string };
type ProductRow = { id: string; series_id: string; name: string; tagline: string; style: Product["style"]; wrist: number; spec: string };
type CatalogPayload = {
  stones: StoneRow[];
  stoneSizes?: SizeRow[];
  accessories: AccessoryRow[];
  series: SeriesRow[];
  products: ProductRow[];
  settings?: Record<string, string>;
};

const CACHE_KEY = "oma-catalog-v1";

// The baked-in photo maps, captured before any hydration replaces them: a
// database row that arrives without a photo (a freshly-added material whose
// upload hasn't happened yet) falls back to these instead of poisoning the
// whole payload.
const bakedStonePhotos = { ...stonePhotos };
const bakedAccessoryPhotos = { ...accessoryPhotos };

export async function loadLiveCatalog(): Promise<void> {
  const payload = await fetchPayload();
  if (!payload) return;
  hydrate(payload);
}

async function fetchPayload(): Promise<CatalogPayload | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("/api/catalog", { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) throw new Error(`bad response ${res.status}`);
    const data = (await res.json()) as CatalogPayload;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* storage full/blocked — cache is best-effort */ }
    return data;
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? (JSON.parse(cached) as CatalogPayload) : null;
    } catch {
      return null;
    }
  }
}

function replaceRecord<T>(target: Record<string, T>, entries: [string, T][]) {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, Object.fromEntries(entries));
}

// Hydration runs one section at a time, each in its own guard: one malformed
// section (say, a series tone that fails to parse) must cost only that
// section, never the whole live catalog — the baked-in data for the failed
// part is still a complete, working dataset. Exported for tests.
export function hydrate(p: CatalogPayload) {
  const sections: [string, () => void][] = [
    ["materials", () => hydrateMaterials(p)],
    ["sizes", () => hydrateSizes(p)],
    ["series", () => hydrateSeries(p)],
    ["pricing", () => hydratePricing(p)],
  ];
  for (const [name, run] of sections) {
    try {
      run();
    } catch (err) {
      console.warn(`live catalog: ${name} section skipped, using built-in data:`, err);
    }
  }
}

function hydrateMaterials(p: CatalogPayload) {
  if (!p.stones?.length || !p.accessories?.length) throw new Error("empty catalog");

  // A row with no photo anywhere (not uploaded yet, nothing baked in) is
  // dropped rather than rendered as a blank <img> — and rather than
  // discarding the whole payload, which would silently freeze the site on
  // stale data the moment one new material is half-entered in the admin.
  const keptStones = p.stones.filter((r) => r.photo || bakedStonePhotos[r.id]);
  const keptAccessories = p.accessories.filter((r) => r.photo || bakedAccessoryPhotos[r.id]);
  for (const r of p.stones) if (!keptStones.includes(r)) console.warn(`live catalog: stone ${r.id} has no photo, hidden from the studio`);
  for (const r of p.accessories) if (!keptAccessories.includes(r)) console.warn(`live catalog: accessory ${r.id} has no photo, hidden from the studio`);
  if (!keptStones.length || !keptAccessories.length) throw new Error("no material left with a photo");

  const newStones: Stone[] = keptStones.map((r) => ({
    id: r.id, zh: r.zh, en: r.en, group: r.energy_zh, price: r.price, note: r.note,
    energy: JSON.parse(r.energies) as Stone["energy"],
  }));
  const newAccessories: Accessory[] = keptAccessories.map((r) => ({
    id: r.id, zh: r.zh, en: r.en, type: r.type, metal: r.metal, price: r.price, note: r.note,
  }));

  stones.splice(0, stones.length, ...newStones);
  replaceRecord(byStone, newStones.map((s) => [s.id, s]));
  replaceRecord(stonePhotos, keptStones.map((r) => [r.id, r.photo || bakedStonePhotos[r.id]]));
  accessories.splice(0, accessories.length, ...newAccessories);
  replaceRecord(byAccessory, newAccessories.map((a) => [a.id, a]));
  replaceRecord(accessoryPhotos, keptAccessories.map((r) => [r.id, r.photo || bakedAccessoryPhotos[r.id]]));
  replaceRecord(accessoryStock, keptAccessories.map((r) => [r.id, r.stock ?? Infinity]));
}

// Per-stone size ladders: what diameters the studio offers, what each
// costs, and how many are left. Sorted so the size buttons read small →
// large regardless of the order rows come back in.
function hydrateSizes(p: CatalogPayload) {
  if (!p.stoneSizes?.length) return;
  const ladders = new Map<string, { mm: number; priceDelta: number; stock: number }[]>();
  for (const r of p.stoneSizes) {
    const list = ladders.get(r.stone_id) ?? [];
    list.push({ mm: r.mm, priceDelta: r.price_delta, stock: r.stock });
    ladders.set(r.stone_id, list);
  }
  for (const list of ladders.values()) list.sort((a, b) => a.mm - b.mm);
  replaceRecord(stoneSizes, [...ladders.entries()]);
}

function hydrateSeries(p: CatalogPayload) {
  if (!p.series?.length || !p.products?.length) return;
  const productsBySeries = new Map<string, Product[]>();
  for (const r of p.products) {
    const list = productsBySeries.get(r.series_id) ?? [];
    list.push({ id: r.id, name: r.name, tagline: r.tagline, style: r.style, wrist: r.wrist, spec: r.spec });
    productsBySeries.set(r.series_id, list);
  }
  const newSeries: Series[] = p.series.map((r) => ({
    ...(JSON.parse(r.tone) as Omit<Series, "products">),
    products: productsBySeries.get(r.id) ?? [],
  }));
  SERIES.splice(0, SERIES.length, ...newSeries);
  replaceRecord(bySeries, newSeries.map((s) => [s.id, s]));
}

// The admin 設定 page: stringing fee, shipping fee, free-shipping threshold.
// Digit-validated the same way the admin API validates writes, so a
// corrupted value can never turn the checkout total into NaN.
function hydratePricing(p: CatalogPayload) {
  const s = p.settings;
  if (!s) return;
  const num = (key: string) => (/^\d+$/.test(s[key] ?? "") ? Number(s[key]) : undefined);
  pricing.baseFee = num("base_fee") ?? pricing.baseFee;
  pricing.shippingFee = num("shipping_fee") ?? pricing.shippingFee;
  pricing.freeShippingOver = num("free_shipping_over") ?? pricing.freeShippingOver;
}
