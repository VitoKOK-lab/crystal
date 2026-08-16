-- 靈感藝廊: real load counters per curated design (key = series_id/product_id).
-- Incremented by POST /api/track/use whenever a visitor buys a gallery design
-- or loads it into the studio — honest numbers, unlike certain competitors.
CREATE TABLE design_uses (
  key TEXT PRIMARY KEY,
  uses INTEGER NOT NULL DEFAULT 0
);
