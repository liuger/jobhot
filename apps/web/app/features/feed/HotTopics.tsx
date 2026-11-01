import { Link } from "react-router";
import type { CompanyStripEntry } from "@aihot/contracts/site";
import { IconArrowRight } from "../../components/icons";
import { monthDayTime } from "../../lib/format";

/**
 * 首页顶部的热招企业条，保持安静：一枚 live 点、带色的名次与企业名，第二行是最新的一个岗位，
 * 右侧是窗口内的新岗位数。整行 hover 亮起，点击落到该企业最新的岗位上。手机只看前三，
 * 信息流从首屏开始。
 */
export function HotTopics({ entries }: { entries: CompanyStripEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section
      aria-labelledby="hot-companies"
      className="card relative mb-4 overflow-hidden bg-[radial-gradient(120%_90%_at_100%_0%,var(--hot-soft),transparent_55%)] px-3.5 pb-1 pt-2.5 lg:mb-6 lg:px-5 lg:pb-2 lg:pt-3.5"
    >
      <div className="flex items-center justify-between lg:mb-1">
        <h2 id="hot-companies" className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-hot opacity-40" />
            <span className="relative inline-flex size-2 rounded-full bg-hot" />
          </span>
          热招企业
        </h2>
        <Link to="/hot" className="group -my-2 -mr-1.5 inline-flex h-10 items-center gap-1 px-1.5 text-[12.5px] text-ink-3 transition-colors hover:text-accent lg:my-0 lg:mr-0 lg:h-auto lg:px-0">
          完整榜单 <IconArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
      <ol>
        {entries.slice(0, 5).map((e, i) => (
          <li key={e.company} className={i >= 3 ? "max-sm:hidden" : undefined}>
            <Link viewTransition
              to={`/items/${e.latest.id}`}
              className="group -mx-2 grid min-h-10 sm:min-h-0 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-tile px-2 py-1.5 transition-colors hover:bg-bg-sunk/70 active:bg-bg-sunk sm:grid-cols-[24px_minmax(0,1fr)_auto_auto] sm:gap-x-4 sm:py-2 dark:hover:bg-bg-muted/40"
            >
              <span className="num flex items-center justify-center text-[14px] font-bold leading-none text-rank-rest">
                {e.rank}
              </span>
              <span className="min-w-0">
                <span className="block line-clamp-1 text-[14.5px] font-semibold leading-[1.5] text-ink transition-colors group-hover:text-accent lg:text-[14px]">{e.company}</span>
                <span className="block line-clamp-1 text-[12px] leading-snug text-ink-4">{e.latest.title}</span>
              </span>
              <span className="hidden whitespace-nowrap text-[12px] text-ink-4 sm:block">{monthDayTime(e.latest.at)}</span>
              <span className="whitespace-nowrap text-right text-[12.5px] text-ink-4">
                <span className="num text-[13.5px] font-semibold text-ink-2">{e.positions}</span> 个新岗位
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
