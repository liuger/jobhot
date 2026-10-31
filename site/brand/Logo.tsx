// 站点的字标、圆环标记和朱砂印：页面用 Wordmark 画站名（size 是字标高度，单位像素），RingMark 是
// 小标记，转起来就是加载动画，Seal 是「招」字朱砂印，用在报头落款等处。
// 字标是定制矢量字（不用字体渲染）：几何等线大写 JOB，笔画 32（环加粗 36 做视觉补偿）、cap 高 160；
// O 换成「缺口环 + 中心圆点」——即站内加载动画 RingMark 的造型，环与点取 accent 色（随主题变），
// J / B 取 currentColor（跟随文字色，明暗主题都正常）。
// 注意：直线笔画端点是 butt cap，中心线端点即墨迹端点，所以竖笔一律从 40 画到 200（cap 高的墨迹边界）；
// B 的两碗横笔从 x=0 起补齐左角。环外径 84 比字母墨迹上下各多 4，画布取 34–206 全包。
// 设计坐标系 434×172，光学字距圆-直 30。图形标（LogoMark.tsx / logo.svg）只留给 favicon 和 PWA 图标。
import { SITE } from "../site.ts";

export function Wordmark({ size = 26, className = "", title = SITE.name, spin = false }: { size?: number; className?: string; title?: string; spin?: boolean }) {
  return (
    <svg viewBox="0 34 434 172" style={{ height: size, width: "auto" }} role="img" aria-label={title} className={className}>
      <g fill="none" strokeWidth={32} strokeLinejoin="miter" strokeLinecap="butt">
        {/* J：竖笔（顶端与 O 齐顶）+ 深钩 r64 */}
        <path d="M80 40 V120 A64 64 0 0 1 16 184" stroke="currentColor" />
        {/* 缺口环（O）：缺口在右上，环加粗 36；环 + 圆点 = RingMark 的造型，取 accent 色。
            spin 时整组绕环心转一圈（.logo-spin，transform-origin 就是环心 210,120）。 */}
        <g className={spin ? "logo-spin" : undefined}>
          <path d="M236 61 A66 66 0 1 0 269 94" stroke="var(--accent)" strokeWidth={36} />
          <circle cx="210" cy="120" r="13" fill="var(--accent)" stroke="none" />
        </g>
        {/* B：竖笔贯穿 40–200，两碗横笔从左缘起（无缺角），上小下大碗 */}
        <path
          d="M340 40 V200 M324 56 H382 A30 30 0 0 1 382 116 H324 M324 120 H386 A32 32 0 0 1 386 184 H324"
          stroke="currentColor"
          strokeLinejoin="round"
        />
      </g>
    </svg>
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

/** 「招」字朱砂印：红底白字、微微歪斜，像钤在纸上的印。 */
export function Seal({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[22%] font-kai font-bold text-[#fdf8ec] shadow-[inset_0_1px_0_rgba(0,0,0,0.18)] ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.56), background: "var(--hot)", transform: "rotate(-2.5deg)" }}
      aria-hidden="true"
    >
      招
    </span>
  );
}
