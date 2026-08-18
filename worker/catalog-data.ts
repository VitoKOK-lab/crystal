// 目錄六表的批次讀取——公開 /api/catalog 與後台 /api/admin/catalog
// 唯二的差別是「要不要含下架列」，其餘（表、排序、settings 過濾）完全
// 相同，共用一份查詢才不會兩邊漂移。session_% 設定列（簽名金鑰）在
// 這裡就被濾掉，任何呼叫端都拿不到。
import { Env } from "./lib";

export type CatalogTables = {
  stones: Record<string, unknown>[];
  stoneSizes: Record<string, unknown>[];
  accessories: Record<string, unknown>[];
  series: Record<string, unknown>[];
  products: Record<string, unknown>[];
  settings: Record<string, string>;
};

export async function catalogTables(env: Env, { includeInactive = false } = {}): Promise<CatalogTables> {
  const w = includeInactive ? "" : " WHERE active=1";
  const [stones, sizes, accessories, series, products, settings] = await Promise.all([
    env.DB.prepare(`SELECT * FROM stones${w} ORDER BY sort`).all(),
    env.DB.prepare(`SELECT * FROM stone_sizes${w} ORDER BY stone_id, mm`).all(),
    env.DB.prepare(`SELECT * FROM accessories${w} ORDER BY sort`).all(),
    env.DB.prepare(`SELECT * FROM series${w} ORDER BY sort`).all(),
    env.DB.prepare(`SELECT * FROM products${w} ORDER BY series_id, sort`).all(),
    env.DB.prepare("SELECT key, value FROM settings WHERE key NOT LIKE 'session_%'").all(),
  ]);
  return {
    stones: stones.results,
    stoneSizes: sizes.results,
    accessories: accessories.results,
    series: series.results,
    products: products.results,
    settings: Object.fromEntries(settings.results.map((r) => [r.key as string, r.value as string])),
  };
}
