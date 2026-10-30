-- Validates the tier check added NOT VALID in 0085 (sources is a small table; this takes a brief lock).
ALTER TABLE sources VALIDATE CONSTRAINT sources_tier_check;
