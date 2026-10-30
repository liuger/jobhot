-- /deadline 按 remaining days 排序、按 deadline 过滤
CREATE INDEX CONCURRENTLY IF NOT EXISTS job_deadline_deadline_idx ON job_deadline (deadline);
