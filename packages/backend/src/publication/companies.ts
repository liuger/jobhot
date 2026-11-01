// 热招企业榜：过去窗口内公开列表上新出现的岗位，按企业聚合计数。
// 招聘公告不会被多家信源共同报道，事件热度榜（events/hot.ts）在招聘语境下常年凑不满条目；
// 企业的新岗位数才是这里自己的"热度"。排序：岗位多者在前，同数按信源权重、最新岗位时间。
import type { CompanyStripEntry, HotCompaniesResponse } from "@aihot/contracts/site";
import { tierRank } from "../events/hot.ts";
import { sql } from "../db.ts";
import { listedCondition } from "./scope.ts";

export const COMPANIES_WINDOW_HOURS = 48;
export const COMPANIES_BOARD_SIZE = 10;
export const COMPANIES_STRIP_SIZE = 5;

/** 与精选同一套层级门槛：归档源（无日期、批量回填）和只做跳转的源不上榜。 */
const TIER_EXCLUDED = ["EXCLUDE_MP", "ARCHIVE"];

interface Row {
  id: string;
  title: string;
  source_name: string;
  tier: string | null;
  at: Date;
}

/** "招商证券·社会招聘" → 招商证券；没有间隔号的源名原样作为企业名。 */
function companyOf(sourceName: string): string {
  const i = sourceName.indexOf("·");
  return i > 0 ? sourceName.slice(0, i) : sourceName;
}

/**
 * 一次查询取齐窗口内全部可列出岗位，在内存里按企业聚合：行数是几百的量级，
 * 再按企业分组回表取每个企业的最新岗位并不比这更省，反而慢。
 */
export async function loadHotCompanies(now = new Date()): Promise<HotCompaniesResponse> {
  const rows = await sql<Row[]>`
    SELECT p.article_id AS id, p.title, s.name AS source_name, s.tier,
           coalesce(p.timeline_at, p.published_at, p.discovered_at) AS at
    FROM publications p JOIN sources s ON s.id = p.source_id
    WHERE ${listedCondition(now)} AND s.participation_mode <> 'isolated'
      AND coalesce(s.tier, '') NOT IN ${sql(TIER_EXCLUDED)}
      AND coalesce(p.timeline_at, p.published_at, p.discovered_at) >= ${now}::timestamptz - make_interval(hours => ${COMPANIES_WINDOW_HOURS})`;

  type Agg = { positions: number; tier: string | null; latest: Row | null; sources: Set<string> };
  const byCompany = new Map<string, Agg>();
  for (const r of rows) {
    const company = companyOf(r.source_name);
    const a = byCompany.get(company) ?? { positions: 0, tier: null, latest: null, sources: new Set<string>() };
    a.positions += 1;
    // 权重取该企业所有渠道里最好的一个（tierRank 越小越好）。
    if (r.tier && (a.tier === null || tierRank(r.tier) < tierRank(a.tier))) a.tier = r.tier;
    a.sources.add(r.source_name);
    if (!a.latest || r.at.getTime() > a.latest.at.getTime()) a.latest = r;
    byCompany.set(company, a);
  }

  const entries: CompanyStripEntry[] = [...byCompany]
    .sort(([ca, a], [cb, b]) =>
      b.positions - a.positions ||
      tierRank(a.tier ?? undefined) - tierRank(b.tier ?? undefined) ||
      (b.latest?.at.getTime() ?? 0) - (a.latest?.at.getTime() ?? 0) ||
      ca.localeCompare(cb))
    .slice(0, COMPANIES_BOARD_SIZE)
    .map(([company, a], i) => ({
      rank: i + 1,
      company,
      tier: a.tier,
      positions: a.positions,
      latest: { id: a.latest!.id, title: a.latest!.title, at: a.latest!.at.toISOString() },
      sourceNames: [...a.sources],
    }));
  return { computedAt: now.toISOString(), windowHours: COMPANIES_WINDOW_HOURS, entries };
}

/** 首页顶部条：榜单的前几名；一条都凑不齐时返回 null，首页不渲染这块。 */
export async function loadCompanyStrip(now = new Date()): Promise<CompanyStripEntry[] | null> {
  const board = await loadHotCompanies(now);
  return board.entries.length ? board.entries.slice(0, COMPANIES_STRIP_SIZE) : null;
}
