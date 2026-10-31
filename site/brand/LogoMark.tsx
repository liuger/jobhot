// jobhot 品牌标记：一张岗位卡片（两白一青三条条目）+ 右上角 hot 角标。
// 几何与 icons/logo.svg 完全一致（1024 设计坐标系），整块内联绘制，不依赖外部图片，也不依赖字体
// （hot 已转成路径轮廓，任何环境打开都是同一字形）。
// 配色跟随站点主题 token：卡片 --bg（暗）、条目 --bg/--accent（暗色青）、角标 --hot（暗色）。
// size 是边长（正方形），要跟着文字走就传 size={20} 之类的小值。
// 同一页面放多个实例时，给 id 传不同值，避免 clipPath 的 id 冲突。
const NAVY = "#13191c";
const BAR_WHITE = "#faf9f6";
const BAR_HOT = "#12ccd8";
const TAG_RED = "#d86a52";
const TAG_TEXT = "#faf9f6";

// 卡片外框与圆角：红角标的裁剪与卡片共用同一组数值，边缘严丝合缝
const CARD = { x: 227, y: 236, w: 569, h: 551, r: 19 };
// 三条条目的位置与长度（x, y, w），高度统一 42、圆角取半高
const BARS: Array<[number, number, number]> = [
  [326, 368, 194],
  [326, 490, 374],
  [326, 612, 258],
];

export function LogoMark({
  size = 32,
  className = "",
  title = "jobhot",
  id = "jobhot-logo",
}: {
  size?: number;
  className?: string;
  title?: string;
  id?: string;
}) {
  const clipId = `${id}-card`;
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} rx={CARD.r} />
        </clipPath>
      </defs>

      {/* 卡片本体 */}
      <rect x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} rx={CARD.r} fill={NAVY} />

      {/* 三条职位条目：前两条米白，最后一条橙（当天的热榜） */}
      {BARS.map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={42} rx={21} fill={i === 2 ? BAR_HOT : BAR_WHITE} />
      ))}

      {/* 右上角 hot 角标：直角三角被卡片圆角轮廓裁切，顶角与卡片圆角完全贴合 */}
      <polygon points="796,362 796,236 670,236" fill={TAG_RED} clipPath={`url(#${clipId})`} />

      {/* hot 字样：顺时针 45° 沿斜边排，路径轮廓，无字体依赖 */}
      <path
        transform="translate(759.10 272.90) rotate(45) scale(0.01855469 -0.01855469) translate(-1743.50 -745.50)"
        fill={TAG_TEXT}
        d="M762.0 0V584Q762.0 737 645.0 737Q588.0 737 558.0 693.5Q528.0 650 528.0 582V0H102.0V1516H528.0V885H532.0Q587.0 964 665.5 1006.5Q744.0 1049 834.0 1049Q1000.0 1049 1087.0 942.5Q1174.0 836 1174.0 629V0Z M2505.0 530Q2505.0 271 2348.5 123.0Q2192.0 -25 1911.0 -25Q1632.0 -25 1476.5 119.5Q1321.0 264 1321.0 518Q1321.0 681 1394.0 801.0Q1467.0 921 1602.0 985.0Q1737.0 1049 1913.0 1049Q2095.0 1049 2228.5 982.0Q2362.0 915 2433.5 796.0Q2505.0 677 2505.0 530ZM2073.0 528Q2073.0 737 1913.0 737Q1753.0 737 1753.0 518Q1753.0 287 1915.0 287Q2073.0 287 2073.0 528Z M3385.0 14Q3356.0 0 3290.0 -12.5Q3224.0 -25 3131.0 -25Q2953.0 -25 2852.5 73.0Q2752.0 171 2752.0 352V729H2591.0V1024H2752.0V1225L3172.0 1341V1024H3385.0V729H3172.0V422Q3172.0 287 3279.0 287Q3329.0 287 3385.0 309Z"
      />
    </svg>
  );
}

/** 标记 + 站名，横向组合。导航条、页脚落款等处用这个；站名颜色随 currentColor 走，明暗主题都正常。 */
export function LogoLockup({
  size = 28,
  className = "",
  name = "jobhot",
  gap = 10,
}: {
  size?: number;
  className?: string;
  name?: string;
  gap?: number;
}) {
  return (
    <span className={`inline-flex items-center font-semibold leading-none tracking-[-0.01em] ${className}`} style={{ gap }}>
      <LogoMark size={size} id="jobhot-lockup" />
      <span style={{ fontSize: Math.round(size * 0.72) }}>{name}</span>
    </span>
  );
}
