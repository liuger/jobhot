// jobhot 字标：JOB —— 几何等线大写，O 换成「缺口环 + 中心圆点」（RingMark 造型）。
// 环与圆点取 var(--accent)（随主题走），J / B 取 currentColor（墨色）。
// 设计参数：笔画 32（环 36 做视觉补偿）、cap 高 160（y 56–184）、光学字距圆-直 30。
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const OUT = dirname(fileURLToPath(import.meta.url));

const S = 32;
const CAP_TOP = 56;
const CAP_BOT = 184;
const MID = 120;
const INK_TOP = CAP_TOP - S / 2;

const glyphs = [
  // J：竖笔（顶端补到 40，与 O 齐顶）+ 深钩 r64
  { name: "J", w: 96, gapR: 30, ink: true, d: "M80 40 V120 A64 64 0 0 1 16 184" },
  // 缺口环（代替 O）：缺口在右上，环加粗 36，环心即字位 (x+84, 120)，中心圆点 r13
  { name: "RING", w: 168, gapR: 30, ink: false, ring: true, d: "M110 61 A66 66 0 1 0 143 94" },
  // B：竖笔贯穿 40–200，两碗横笔从 x=0 起（补齐左上/左下角），上小下大碗
  {
    name: "B",
    w: 110,
    gapR: 0,
    ink: true,
    round: true,
    d: "M16 40 V200 M0 56 H58 A30 30 0 0 1 58 116 H0 M0 120 H62 A32 32 0 0 1 62 184 H0",
  },
];

let x = 0;
const parts = [];
for (const g of glyphs) {
  const color = g.ink ? "currentColor" : "var(--accent)";
  if (g.ring) {
    parts.push(`<path d="${g.d}" fill="none" stroke="${color}" stroke-width="36" stroke-linecap="butt" transform="translate(${x} 0)"/>`);
    parts.push(`<circle cx="${x + 84}" cy="${MID}" r="13" fill="${color}"/>`);
  } else {
    const joinAttr = g.round ? ' stroke-linejoin="round"' : ' stroke-linejoin="miter"';
    parts.push(`<path d="${g.d}" fill="none" stroke="${color}" stroke-width="${S}"${joinAttr} stroke-linecap="butt" transform="translate(${x} 0)"/>`);
  }
  x += g.w + g.gapR;
}
const W = x;
// 画布要包住最高的墨迹：环外径 = r66 + 笔画 18 = 84 → 36–204；字母 40–200。上下各留 2。
const VB_Y = 34;
const H = 172;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${VB_Y} ${W} ${H}" role="img" aria-label="jobhot">${parts.join("")}</svg>`;
writeFileSync(join(OUT, "jobhot-logotype-job.svg"), svg);
console.log(W + "x" + H);
