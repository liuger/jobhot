import { useLoaderData } from "react-router";
import { IntentLink } from "../components/ui/IntentLink";
import type { CompanyStripEntry, HotCompaniesResponse } from "@aihot/contracts/site";
import { withSubject } from "@aihot/site";
import { cachedPage, loadOr404 } from "../lib/api.server";
import { pageReuse } from "../lib/page-reuse";
import { pageMeta } from "../lib/seo";
import { monthDayTime } from "../lib/format";
import { EmptyState } from "../components/ui/Page";
import { IconChevronDown, IconInfo } from "../components/icons";
import { PhoneBar } from "../components/shell/PhoneBar";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: "hot", name: "热招" };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request }: { request: Request }) {
  return cachedPage(120, { hot: await loadOr404<HotCompaniesResponse>("/api/site/companies", { signal: request.signal }) });
}

export function meta() {
  return pageMeta({
    title: withSubject("热招企业榜"),
    description: `过去 48 小时新岗位最多的企业：按招聘渠道聚合公开列表上的岗位，岗位多者在前。`,
    path: "/hot",
    image: "/og/pages/hot.png",
  });
}

const RANK_COLOR = ["text-rank-1", "text-rank-2", "text-rank-3"];
const rankColor = (rank: number) => RANK_COLOR[rank - 1] ?? "text-rank-rest";
const pad = (rank: number) => String(rank).padStart(2, "0");
const tierLabel = (tier: string | null) => (tier ? tier.replace("_", ".") : null);

/** The whole card opens the company's newest position; the company name carries the link. */
function PositionLink({ e, className }: { e: CompanyStripEntry; className: string }) {
  return (
    <IntentLink viewTransition to={`/items/${e.latest.id}`} className={`transition-colors after:absolute after:inset-0 after:content-[''] ${className}`}>
      {e.company}
    </IntentLink>
  );
}

/** No. 1: the busiest hirer, with its newest positions front and centre. */
function Lead({ e }: { e: CompanyStripEntry }) {
  const tier = tierLabel(e.tier);
  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className={`mono text-[12px] font-bold tracking-[0.16em] ${rankColor(e.rank)}`}>NO.{pad(e.rank)}</span>
        <span className="ml-auto text-[12.5px] text-ink-4">过去 48 小时</span>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold leading-[1.35] tracking-[-0.01em] text-ink sm:text-[24px]">
            <PositionLink e={e} className="group-hover:text-accent" />
          </h2>
          {e.sourceNames.length > 1 && (
            <p className="mt-1.5 line-clamp-1 text-[12.5px] text-ink-4">招聘渠道：{e.sourceNames.join("、")}{tier ? ` · 权重 ${tier}` : ""}</p>
          )}
        </div>
        <div className="text-right">
          <div className="mono text-[38px] font-semibold leading-none tracking-[-0.03em] text-ink">{e.positions}</div>
          <div className="mt-1 text-[11.5px] text-ink-4">个新岗位</div>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-5">
        <p className="min-w-0 flex-[1_1_18rem] line-clamp-2 text-[13.5px] leading-[1.7] text-ink-2">
          <span className="mr-2 text-[12px] font-semibold text-accent">最新岗位</span>
          {e.latest.title}
        </p>
        <span className="whitespace-nowrap text-[12px] text-ink-4">{monthDayTime(e.latest.at)} 发布</span>
      </div>
    </article>
  );
}

/** No. 2 and 3: the same card, smaller, without the latest-position emphasis. */
function Runner({ e }: { e: CompanyStripEntry }) {
  const tier = tierLabel(e.tier);
  return (
    <article className="card card-hover group relative flex flex-col px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className={`mono text-[12px] font-bold tracking-[0.16em] ${rankColor(e.rank)}`}>NO.{pad(e.rank)}</span>
        <span className="ml-auto text-[12.5px] text-ink-4">过去 48 小时</span>
      </div>
      <h2 className="mt-2.5 line-clamp-2 text-[16px] font-[650] leading-[1.5] text-ink">
        <PositionLink e={e} className="group-hover:text-accent" />
        {e.sourceNames.length > 1 && <span className="ml-2 text-[12px] font-normal text-ink-4">{e.sourceNames.length} 个渠道{tier ? ` · 权重 ${tier}` : ""}</span>}
      </h2>
      <div className="mt-auto flex items-end justify-between gap-4 pt-3">
        <p className="min-w-0 line-clamp-1 text-[13px] leading-[1.7] text-ink-2">
          <span className="mr-2 text-[12px] font-semibold text-accent">最新岗位</span>
          {e.latest.title}
        </p>
        <div className="shrink-0 text-right">
          <div className="mono text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink">{e.positions}</div>
          <div className="mt-1 text-[11.5px] text-ink-4">个新岗位</div>
        </div>
      </div>
    </article>
  );
}

/** No. 2 onward: one row each, with its newest position, the day and the count. */
function Row({ e }: { e: CompanyStripEntry }) {
  return (
    <li className="group relative grid grid-cols-[30px_minmax(0,1fr)] items-start gap-x-3 px-4 py-3 transition-colors hover:bg-bg-sunk/70 sm:px-5 lg:grid-cols-[44px_minmax(0,1fr)_auto_88px] lg:items-center lg:gap-x-6 lg:px-6 lg:py-3.5 dark:hover:bg-bg-muted/40">
      <span className={`mono text-[16px] font-semibold leading-[24px] lg:text-[17px] ${rankColor(e.rank)}`} aria-label={`热招排名第 ${e.rank} 位`}>
        {pad(e.rank)}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-[650] leading-[1.55] text-ink">
          <PositionLink e={e} className="group-hover:text-accent" />
          {e.sourceNames.length > 1 && <span className="ml-2 text-[12px] font-normal text-ink-4">{e.sourceNames.length} 个渠道</span>}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[13px] leading-[1.65] text-ink-4">{e.latest.title}</p>
      </div>
      <span className="hidden whitespace-nowrap text-[12px] text-ink-4 lg:block">{monthDayTime(e.latest.at)}</span>
      <span className="mt-1 whitespace-nowrap text-[12.5px] text-ink-4 lg:mt-0 lg:text-right">
        <span className="mono text-[17px] font-semibold text-ink">{e.positions}</span> 个新岗位
      </span>
    </li>
  );
}

/** Opens "榜单是怎么算的" at the foot of the page and brings it into view. */
function showMethod() {
  const method = document.getElementById("hot-method") as HTMLDetailsElement | null;
  if (!method) return;
  method.open = true;
  method.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
}

export default function HotPage() {
  const { hot } = useLoaderData<typeof loader>();
  const [lead, ...rest] = hot.entries;
  const runners = rest.slice(0, 2);
  const others = rest.slice(2);
  return (
    <div className="pb-10">
      <PhoneBar
        title="热招"
        large
        sub={
          <>
            过去 {hot.windowHours} 小时新岗位最多的 {hot.entries.length || 10} 家企业
            {hot.computedAt && (
              <>
                {" · "}
                <span className="num">{monthDayTime(hot.computedAt)}</span> 更新
              </>
            )}
          </>
        }
        actions={
          <button type="button" onClick={showMethod} className="flex h-11 items-center gap-1 px-3 text-[14px] text-accent active:opacity-50">
            <IconInfo size={17} /> 怎么算
          </button>
        }
      />
      <header className="hidden flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-5 pt-1 lg:flex">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-hot">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-hot opacity-30" />
              <span className="relative inline-flex size-2 rounded-full bg-hot" />
            </span>
            招聘热度
          </div>
          <h1 className="mt-1.5 text-[24px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:text-[26px]">{withSubject("热招企业榜")}</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-3">过去 {hot.windowHours} 小时，公开列表上新岗位最多的 {hot.entries.length || 10} 家企业</p>
        </div>
        {hot.computedAt && (
          <p className="text-[12px] text-ink-4">
            <span className="num">{monthDayTime(hot.computedAt)}</span> 更新 · 按新岗位数排序
          </p>
        )}
      </header>

      {!lead ? (
        <div className="card rounded-sheet">
          <EmptyState title="暂时没有热招企业">过去 48 小时内，公开列表上还没有可显示的新岗位。</EmptyState>
        </div>
      ) : (
        <>
          <section aria-label="热招前三" className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
            <div className="grid grid-cols-1 lg:col-span-7 lg:row-span-2 xl:col-span-8">
              <Lead e={lead} />
            </div>
            {runners.map((e) => (
              <div key={e.company} className="grid grid-cols-1 lg:col-span-5 xl:col-span-4">
                <Runner e={e} />
              </div>
            ))}
          </section>

          {others.length > 0 && (
            <section aria-label="其余热招企业" className="mt-6 lg:mt-7">
              <div className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="text-[15px] font-semibold text-ink">
                  继续看 <span className="num font-normal text-ink-4">No.{pad(others[0]!.rank)}–{pad(others[others.length - 1]!.rank)}</span>
                </h2>
                <span className="hidden text-[12px] text-ink-4 lg:block">最新岗位 · 发布时间 · 新岗位数</span>
              </div>
              <ol className="card divide-y divide-line-soft overflow-hidden">
                {others.map((e) => (
                  <Row key={e.company} e={e} />
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      <details id="hot-method" className="disclosure group/method mt-8 scroll-mt-[calc(var(--bar-h)+16px)] text-[12px] text-ink-4">
        <summary className="flex items-center gap-1.5 py-1 transition-colors hover:text-ink-2">
          <IconInfo size={15} />
          榜单是怎么算的？
          <span className="ml-auto inline-flex items-center gap-0.5">
            <span className="group-open/method:hidden">了解榜单</span>
            <span className="hidden group-open/method:inline">收起</span>
            <IconChevronDown size={13} className="transition-transform duration-200 group-open/method:rotate-180" />
          </span>
        </summary>
        <div className="max-w-[760px] space-y-2 pb-2 pl-[21px] pt-2 leading-[1.75] text-ink-3">
          <p>榜单统计过去 48 小时内出现在公开列表上、当前仍可列出的岗位，按企业聚合（同一企业的社会招聘、校园招聘等多个渠道合并计数），新岗位多者在前；数目相同时按信源权重与最新岗位时间排列。</p>
          <p>它衡量的是企业的招聘活跃度，不是岗位质量或规模评分；只统计我们能抓到的公开渠道，不包含未公开发布的岗位。</p>
          <p>点击企业名查看它最新发布的岗位详情；每个岗位的原文都链接到企业官方招聘页面。</p>
        </div>
      </details>
    </div>
  );
}
