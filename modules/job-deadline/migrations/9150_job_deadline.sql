-- job-deadline：报名截止倒计时。每条招聘公告一行，按截止日期排；item_id 唯一，避免同一公告重复入库。
CREATE TABLE IF NOT EXISTS job_deadline (
  item_id text PRIMARY KEY,
  title text NOT NULL,
  company text,
  category text,
  deadline date NOT NULL,
  source_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
