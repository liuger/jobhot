// job-deadline 后端：每天扫一遍近 120 天的招聘类公告，从标题/摘要/正文里抽「报名截止日期」入库；
// /api/jobs/deadline/list 给页面数据。只收未来 400 天内（或刚截止 14 天内的），页面按剩余天数排列。
//
// 为什么单独建表而不是让 structure.md 多吐字段：structure.md 的输出契约是固定的五项
// （category/tags/subjects/scope/fact），改它会牵动下游整条链路。截止日期是个强格式字段，
// 用正则抽反而比模型更稳、更便宜，也方便人工复核——这也是上游 standard-countdown 的做法。
import type { FastifyInstance } from "fastify";
import { sql } from "@aihot/backend/db";
import { defineServerModule } from "@aihot/backend/modules";

import { CATEGORIES, extractCompany, extractDeadline } from "./extract.ts";

async function scan(): Promise<{ kept: number }> {
  const rows = await sql<{ id: string; title: string; title_zh: string | null; summary: string | null; body: string | null; source_name: string; category: string | null }[]>`
    SELECT a.id, a.title, an.title_zh, an.summary_zh AS summary, a.body_text AS body, s.name AS source_name, an.category
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    JOIN LATERAL (
      SELECT category, title_zh, summary_zh FROM analyses x
      WHERE x.article_id = a.id ORDER BY x.id DESC LIMIT 1
    ) an ON true
    WHERE a.published_at > now() - interval '120 days'`;

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const horizon = iso(new Date(today.getTime() + 400 * 86400_000));
  const floor = iso(new Date(today.getTime() - 14 * 86400_000));

  let kept = 0;
  for (const r of rows) {
    // 类别在 JS 侧筛，避免依赖驱动对数组参数的处理
    if (!r.category || !(CATEGORIES as readonly string[]).includes(r.category)) continue;
    const haystack = `${r.title}\n${r.title_zh ?? ""}\n${r.summary ?? ""}\n${(r.body ?? "").slice(0, 6000)}`;
    const deadline = extractDeadline(haystack);
    if (!deadline) continue;
    if (deadline > horizon || deadline < floor) continue;

    await sql`INSERT INTO job_deadline (item_id, title, company, category, deadline, source_name, updated_at)
      VALUES (${r.id}, ${r.title_zh || r.title}, ${extractCompany(r.title)}, ${r.category}, ${deadline}, ${r.source_name}, now())
      ON CONFLICT (item_id) DO UPDATE SET
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        category = EXCLUDED.category,
        deadline = EXCLUDED.deadline,
        source_name = EXCLUDED.source_name,
        updated_at = now()`;
    kept += 1;
  }

  // 清掉已截止超过 30 天的，避免表无限增长；刚截止的留着，读者还要回看
  await sql`DELETE FROM job_deadline WHERE deadline < current_date - 30`;
  return { kept };
}

interface Row {
  item_id: string;
  title: string;
  company: string | null;
  category: string | null;
  deadline: string;
  source_name: string | null;
  days: number;
}

export const JOB_DEADLINE_MODULE = defineServerModule({
  name: "job-deadline",
  http: (app: FastifyInstance) => {
    app.get("/api/jobs/deadline/list", async (req, reply) => {
      const q = req.query as { category?: string; days?: string };
      const limitDays = Number(q.days) > 0 ? Number(q.days) : 400;
      const cat = q.category && (CATEGORIES as readonly string[]).includes(q.category) ? q.category : null;
      // 分类筛选走两条独立查询，避免在模板里拼可选的 SQL 片段
      // limitDays 要显式转 int：驱动把参数发成 unknown，date + unknown 会让 PG 报「运算符不唯一」(42725)
      const rows = cat
        ? await sql<Row[]>`
            SELECT item_id, title, company, category,
              to_char(deadline, 'YYYY-MM-DD') AS deadline,
              source_name,
              (deadline - current_date) AS days
            FROM job_deadline
            WHERE deadline <= current_date + ${limitDays}::int
              AND deadline >= current_date - 14
              AND category = ${cat}
            ORDER BY deadline ASC
            LIMIT 200`
        : await sql<Row[]>`
            SELECT item_id, title, company, category,
              to_char(deadline, 'YYYY-MM-DD') AS deadline,
              source_name,
              (deadline - current_date) AS days
            FROM job_deadline
            WHERE deadline <= current_date + ${limitDays}::int
              AND deadline >= current_date - 14
            ORDER BY deadline ASC
            LIMIT 200`;
      return reply
        .header("cache-control", "public, max-age=300")
        .header("content-type", "application/json")
        .send({ items: rows });
    });
  },
  schedules: [{ name: "job-deadline.scan", cron: "30 4 * * *", run: scan }],
});
