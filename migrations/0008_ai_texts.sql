-- Shared cache for every Kimi-generated text (design poems, wish readings,
-- pair readings; the birthday reading keeps its own 0007 table). One row
-- per (kind, request hash): identical requests are free and instant, and
-- created_at drives the per-kind daily generation caps.
CREATE TABLE IF NOT EXISTS ai_texts (
  key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_texts_kind_created ON ai_texts (kind, created_at);
