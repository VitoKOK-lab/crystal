-- Cache for the Kimi-generated personalised birthday readings. One row per
-- distinct (name, birthday, theme) request hash: identical retakes are free
-- and instant, and the created_at column doubles as the data for the daily
-- generation cap that protects the API budget.
CREATE TABLE IF NOT EXISTS quiz_readings (
  key TEXT PRIMARY KEY,
  reading TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quiz_readings_created ON quiz_readings (created_at);
