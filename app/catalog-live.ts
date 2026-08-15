// Phase 1 of the data migration: the catalog module keeps shipping with the
// baked-in data (instant first paint, and the only data source on hosts with
// no API, like the legacy GitHub Pages build), but at boot we try to replace
// it with the live database catalog from /api/catalog. Hydration happens
// BEFORE React mounts, so every component still reads plain module data and
// nothing about their render logic changes.
//
// Fallback ladder: live API → last-good copy in localStorage → baked-in.
import { accessories, accessoryPhotos, byAccessory, byStone, stonePhotos, stones, type Accessory, type Stone } from "./catalog";
import { SERIES, bySeries, type Product, type Series } from "./series";

type StoneRow = { id: string; zh: string; en: string; energy_zh: string; price: number; note: string; energies: string; photo: string };
type AccessoryRow = { id: string; zh: string; en: string; type: Accessory["type"]; metal: Accessory["metal"]; price: number; note: string; photo: string };
type SeriesRow = { id: string; tone: string };
type ProductRow = { id: string; series_id: string; name: string; tagline: string; style: Product["style"]; wrist: number; spec: string };
type CatalogPayload = {
  stones: StoneRow[];
  accessories: AccessoryRow[];
  series: SeriesRow[];
  products: ProductRow[];
};

const CACHE_KEY = "oma-catalog-v1";

export async function loadLiveCatalog(): Promise<void> {
  const payload = await fetchPayload();
  if (!payload) return;
  try {
    hydrate(payload);
  } catch (err) {
    // A malformed payload must never take the site down — the baked-in
    // catalog is always a complete, working dataset.
    console.warn("live catalog skipped, using built-in data:", err);
  }
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

function hydrate(p: CatalogPayload) {
  if (!p.stones?.length || !p.accessories?.length) throw new Error("empty catalog");

  const newStones: Stone[] = p.stones.map((r) => ({
    id: r.id, zh: r.zh, en: r.en, group: r.energy_zh, price: r.price, note: r.note,
    energy: JSON.parse(r.energies) as Stone["energy"],
  }));
  const newAccessories: Accessory[] = p.accessories.map((r) => ({
    id: r.id, zh: r.zh, en: r.en, type: r.type, metal: r.metal, price: r.price, note: r.note,
  }));
  // Photos must stay complete for every id — the catalog module throws on
  // missing coverage at import for exactly this invariant.
  for (const r of [...p.stones, ...p.accessories]) if (!r.photo) throw new Error(`no photo for ${r.id}`);

  stones.splice(0, stones.length, ...newStones);
  replaceRecord(byStone, newStones.map((s) => [s.id, s]));
  replaceRecord(stonePhotos, p.stones.map((r) => [r.id, r.photo]));
  accessories.splice(0, accessories.length, ...newAccessories);
  replaceRecord(byAccessory, newAccessories.map((a) => [a.id, a]));
  replaceRecord(accessoryPhotos, p.accessories.map((r) => [r.id, r.photo]));

  if (p.series?.length && p.products?.length) {
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
}
