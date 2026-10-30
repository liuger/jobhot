-- 分类筛选（/deadline 的赛道 tab）走这条
CREATE INDEX CONCURRENTLY IF NOT EXISTS job_deadline_category_idx ON job_deadline (category, deadline);
