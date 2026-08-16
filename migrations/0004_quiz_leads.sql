-- 生日選石測驗: each completed quiz saves a lead (name + birthday + the
-- lineup we recommended). Email is optional — the quiz works without it.
CREATE TABLE quiz_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  birthday TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  stones TEXT NOT NULL DEFAULT ''
);
