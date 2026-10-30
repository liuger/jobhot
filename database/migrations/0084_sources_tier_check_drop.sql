-- ARCHIVE: a source with no publish date cannot be judged for freshness, so it is kept for the archive
-- (/all and item pages) and never becomes 精选. The tier carries that rule: industry/selection.ts gives
-- it no threshold, so it is not scored at all. Two migrations, one statement each (migration-safety).
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_tier_check;
