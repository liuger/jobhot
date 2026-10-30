-- Re-add the tier check with ARCHIVE (see 0084_sources_tier_check_drop). NOT VALID keeps the
-- verification off the table lock; 0086 validates the existing rows separately.
ALTER TABLE sources ADD CONSTRAINT sources_tier_check
  CHECK (tier IN ('T1', 'T1_5', 'T2', 'EXCLUDE_MP', 'ARCHIVE')) NOT VALID;
