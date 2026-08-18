-- 效能索引：目錄查詢（active 過濾＋sort 排序）每個訪客都會打到，
-- 給它們正式的索引；orders 既有的兩個索引不變。
CREATE INDEX IF NOT EXISTS idx_stones_active_sort ON stones(active, sort);
CREATE INDEX IF NOT EXISTS idx_accessories_active_sort ON accessories(active, sort);
CREATE INDEX IF NOT EXISTS idx_products_series_sort ON products(series_id, sort);

-- design_uses（0003）從未被任何程式讀寫——當初規劃的 /api/track/use
-- 端點沒有實作。刪掉，讓 schema 不再說謊。
DROP TABLE IF EXISTS design_uses;
