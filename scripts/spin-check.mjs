// 验证 .logo-spin 是否真的绕环心转：定格 0 / 155 / 310 / 465ms 四帧截图 + 读计算后的 transform。
import { chromium } from "playwright";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 34 434 172"><g fill="none" stroke-width="32" stroke-linejoin="miter" stroke-linecap="butt">
  <path d="M80 40 V120 A64 64 0 0 1 16 184" stroke="#202a30"/>
  <g class="logo-spin"><path d="M236 61 A66 66 0 1 0 269 94" stroke="#176b75" stroke-width="36"/><circle cx="210" cy="120" r="13" fill="#176b75" stroke="none"/></g>
  <path d="M340 40 V200 M324 56 H382 A30 30 0 0 1 382 116 H324 M324 120 H386 A32 32 0 0 1 386 184 H324" stroke="#202a30" stroke-linejoin="round"/>
</g></svg>`;

const html = `<!doctype html><html><head><style>
  body{margin:0;background:#faf9f6;display:flex;align-items:center;justify-content:center;height:100vh}
  svg{height:120px;width:auto}
  @keyframes spin-once{to{transform:rotate(360deg)}}
  .logo-spin{transform-box:view-box;transform-origin:210px 120px;animation:spin-once 620ms cubic-bezier(0.55,0,0.35,1);animation-play-state:paused}
</style></head><body>${svg}</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 300 }, deviceScaleFactor: 2 });
await page.setContent(html);

for (const t of [0, 155, 310, 465]) {
  await page.evaluate((ms) => {
    const g = document.querySelector(".logo-spin");
    g.style.animationDelay = `-${ms}ms`;
  }, t);
  await page.waitForTimeout(120);
  const box = await page.locator("svg").boundingBox();
  await page.screenshot({ path: `E:/Data/WorkBuddy/Liuger/jobhot/scripts/spin-${t}.png`, clip: box });
}

const rows = [];
for (const t of [0, 155, 310]) {
  const m = await page.evaluate((ms) => {
    const g = document.querySelector(".logo-spin");
    g.style.animationDelay = `-${ms}ms`;
    const cs = getComputedStyle(g);
    return `${cs.transform} | origin=${cs.transformOrigin} | box=${cs.transformBox}`;
  }, t);
  rows.push(`${t}ms → ${m}`);
}
console.log(rows.join("\n"));
await browser.close();
