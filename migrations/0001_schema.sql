-- OMA CRYSTAL e-commerce foundation (Phase 1).
-- Applied automatically by CI: wrangler d1 migrations apply oma-crystal --remote
-- Spec: docs/superpowers/specs/2026-08-14-ecommerce-upgrade-design.md

CREATE TABLE stones (
  id TEXT PRIMARY KEY,
  zh TEXT NOT NULL,
  en TEXT NOT NULL,
  energy_zh TEXT NOT NULL,          -- 主打能量標籤（守護/財富…）
  price INTEGER NOT NULL,           -- 基礎價（large 尺寸）
  note TEXT NOT NULL DEFAULT '',
  energies TEXT NOT NULL,           -- JSON: {wealth,love,healing,protection,focus,power}
  photo TEXT NOT NULL,              -- /materials/... path (R2 key once uploads move there)
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

-- Per-stone size list with per-size stock. Replaces the hard-coded
-- small/large/xlarge trio; the seed reproduces it so the studio's current
-- behaviour is unchanged until the admin edits sizes.
CREATE TABLE stone_sizes (
  stone_id TEXT NOT NULL REFERENCES stones(id),
  mm REAL NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (stone_id, mm)
);

CREATE TABLE accessories (
  id TEXT PRIMARY KEY,
  zh TEXT NOT NULL,
  en TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('spacer','charm')),
  metal TEXT NOT NULL CHECK (metal IN ('gold','silver')),
  price INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  en TEXT NOT NULL,
  tone TEXT NOT NULL,               -- JSON: full SeriesTone + copy blob
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
  id TEXT NOT NULL,
  series_id TEXT NOT NULL REFERENCES series(id),
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  style TEXT NOT NULL,
  wrist REAL NOT NULL,
  spec TEXT NOT NULL,               -- same compact notation the studio decodes
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (series_id, id)
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,              -- OMA-xxxxx
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','making','shipped','done','cancelled')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  wrist_cm REAL,
  note TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL,              -- JSON order lines
  base_fee INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT '',
  ecpay_trade_no TEXT NOT NULL DEFAULT '',
  ref_code TEXT NOT NULL DEFAULT ''  -- affiliate attribution foundation
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Affiliate foundation only: the payout backend is future scope, but every
-- order carries ref_code from day one so history is never lost.
CREATE TABLE affiliates (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO settings (key, value) VALUES
  ('base_fee', '680'),
  ('shipping_fee', '120'),
  ('free_shipping_over', '3000');
