// /deadline：报名截止倒计时页。未截止的按剩余天数从近到远排列，三天内标红；
// 已截止的默认收起，点开才看。
import { useEffect, useState } from "react";
import { SITE } from "@aihot/site";

interface Row {
  item_id: string;
  title: string;
  company: string | null;
  category: string | null;
  deadline: string;
  source_name: string | null;
  days: number;
}

/** 五条赛道的筛选项，顺序与 industry/taxonomy.ts 的 CATEGORIES 一致。 */
const TABS: ReadonlyArray<{ key: string | null; label: string }> = [
  { key: null, label: "全部" },
  { key: "soe", label: "央国企校招" },
  { key: "public", label: "事业单位" },
  { key: "returnee", label: "留学生专场" },
  { key: "esg", label: "ESG双碳" },
  { key: "intern", label: "日常实习" },
];

function daysLabel(days: number): { text: string; tone: "hot" | "amber" | "ok" | "muted" } {
  if (days < 0) return { text: `已截止 ${-days} 天`, tone: "muted" };
  if (days === 0) return { text: "今天截止", tone: "hot" };
  if (days <= 3) return { text: `只剩 ${days} 天`, tone: "hot" };
  if (days <= 7) return { text: `还有 ${days} 天`, tone: "amber" };
  return { text: `还有 ${days} 天`, tone: "ok" };
}

const TONE_CLASS: Record<"hot" | "amber" | "ok" | "muted", string> = {
  hot: "bg-hot-soft text-hot",
  amber: "bg-amber-soft text-amber-ink",
  ok: "bg-ok-soft text-ok-ink",
  muted: "bg-surface-2 text-ink-4",
};

export default function DeadlinePage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    setRows(null);
    setShowExpired(false);
    const qs = tab ? `?category=${tab}` : "";
    fetch(`/api/jobs/deadline/list${qs}`)
      .then((r) => r.json())
      .then((d: { items: Row[] }) => setRows(d.items))
      .catch(() => setRows([]));
  }, [tab]);

  const list = rows ?? [];
  const open = list.filter((r) => r.days >= 0);
  const expired = list.filter((r) => r.days < 0);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-[28px] font-bold tracking-[0.04em] text-ink">报名截止倒计时</h1>
      <p className="mt-3 text-[14.5px] leading-[1.8] text-ink-3">
        还有哪些公告来得及投？按报名截止日期从近到远排列，三天内标红提醒。数据来自{SITE.name}收录的招聘公告，自动抽取截止日期，
        以公告原文为准。
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key ?? "all"}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1 text-[13px] transition-colors ${
                active ? "bg-accent text-white" : "bg-surface-2 text-ink-3 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {rows === null ? (
        <p className="mt-10 text-[14px] text-ink-4">加载中…</p>
      ) : list.length === 0 ? (
        <p className="mt-10 rounded-xl border border-line bg-surface px-5 py-6 text-center text-[14px] text-ink-3">
          暂无收录中的公告。有新公告并写明报名截止日期后，会自动出现在这里。
        </p>
      ) : (
        <>
          <ul className="mt-8">
            {open.map((r) => {
              const d = daysLabel(r.days);
              return (
                <li key={r.item_id} className="border-b border-line py-4">
                  <div className="flex items-baseline gap-3">
                    <span className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.5] text-ink">
                      <a href={`/items/${r.item_id}`} className="transition-colors hover:text-accent">
                        {r.title}
                      </a>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TONE_CLASS[d.tone]}`}>
                      {d.text}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-4">
                    {r.company ? `${r.company} · ` : ""}
                    截止 {r.deadline}
                    {r.source_name ? ` · 来源：${r.source_name}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>

          {expired.length > 0 && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowExpired((v) => !v)}
                aria-expanded={showExpired}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] text-ink-3 transition-colors hover:border-ink-4"
              >
                <span>已截止的公告 · {expired.length} 条</span>
                <span className="text-[12.5px] text-ink-4">{showExpired ? "收起 ▲" : "点击查看 ▼"}</span>
              </button>
              {showExpired && (
                <ul>
                  {expired.map((r) => {
                    const d = daysLabel(r.days);
                    return (
                      <li key={r.item_id} className="border-b border-line py-4">
                        <div className="flex items-baseline gap-3">
                          <span className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.5] text-ink-3">
                            <a href={`/items/${r.item_id}`} className="transition-colors hover:text-accent">
                              {r.title}
                            </a>
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TONE_CLASS[d.tone]}`}>
                            {d.text}
                          </span>
                        </div>
                        <p className="mt-1 text-[12.5px] text-ink-4">
                          {r.company ? `${r.company} · ` : ""}
                          截止 {r.deadline}
                          {r.source_name ? ` · 来源：${r.source_name}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
