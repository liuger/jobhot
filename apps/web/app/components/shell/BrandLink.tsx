// 站点的字标入口：点一下立刻回首页，同时缺口环转一圈当反馈（不挡跳转）。
// 桌面侧栏和手机顶栏共用；cmd/ctrl + 点击、中键等原生行为不拦，照旧开新标签。
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { SITE } from "@aihot/site";
import { Wordmark } from "@aihot/site/brand/Logo.tsx";

/** 与 app.css 里 .logo-spin 的动画时长一致，转完清掉状态。 */
const SPIN_MS = 620;

export function BrandLink({ size, className = "" }: { size: number; className?: string }) {
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 开新标签 / 新窗口的点击交给浏览器。
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    // 关了动效的直接回首页，不转。
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate("/");
      return;
    }
    // 立即回首页，环在背后转完一圈；转动中重复点击只跳转、不重启动画。
    navigate("/");
    if (spinning) return;
    setSpinning(true);
    timer.current = window.setTimeout(() => setSpinning(false), SPIN_MS);
  };

  return (
    <Link to="/" onClick={onClick} aria-label={`${SITE.name} 首页`} className={className}>
      <Wordmark size={size} spin={spinning} />
    </Link>
  );
}
