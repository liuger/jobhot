// 站点的字标、圆环标记和朱砂印：页面用 Wordmark 画站名（size 是高度，单位像素），RingMark 是小标记，
// 转起来就是加载动画，Seal 是「砚」字朱砂印，用在报头落款等处。
// Wordmark 已换成正式 Logo：岗位卡片标记（LogoMark）+ 站名，导航侧栏、手机顶栏、后台登录页共用；
// 文字颜色随 currentColor 走，明暗两种主题都正常。
import { useId } from "react";
import { SITE } from "../site.ts";
import { LogoMark } from "./LogoMark.tsx";

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  // 同一页面会同时挂桌面侧栏和手机顶栏两份 Wordmark，LogoMark 里的 clipPath 用 id 区分，这里保证唯一。
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <span
      className={`inline-flex items-center font-semibold leading-none tracking-[-0.01em] ${className}`}
      style={{ gap: Math.round(size * 0.34) }}
      aria-label={title}
      role="img"
    >
      <LogoMark size={size} id={`logo-${uid}`} title={title} />
      <span aria-hidden="true" style={{ fontSize: Math.round(size * 0.72) }}>
        {SITE.name}
      </span>
    </span>
  );
}

/** A ring with a dot; spinning, it is the loader. */
export function RingMark({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g style={spinning ? { transformOrigin: "12px 12px", animation: "spin-slow 1.1s linear infinite" } : undefined}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="42 15" />
      </g>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

/** 「砚」字朱砂印：红底白字、微微歪斜，像钤在纸上的印。 */
export function Seal({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[22%] font-kai font-bold text-[#fdf8ec] shadow-[inset_0_1px_0_rgba(0,0,0,0.18)] ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.56), background: "var(--hot)", transform: "rotate(-2.5deg)" }}
      aria-hidden="true"
    >
      砚
    </span>
  );
}
