// 线上验收 v2：环的颜色（正确的选择器）、点击后等待路由完成再读 URL。
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto("https://jobhot.cn/", { waitUntil: "networkidle", timeout: 45000 });

const info = await page.evaluate(() => {
  const svg = document.querySelector("aside svg");
  const ringPath = svg?.querySelector("g > g > path");
  const dot = svg?.querySelector("g > g > circle");
  return {
    ringStroke: ringPath ? getComputedStyle(ringPath).stroke : null,
    ringWidth: ringPath ? getComputedStyle(ringPath).strokeWidth : null,
    dotFill: dot ? getComputedStyle(dot).fill : null,
    accentVar: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    inkColor: svg ? getComputedStyle(svg.querySelector("path")).stroke : null,
  };
});
console.log(JSON.stringify(info, null, 2));

// 切到 /hot，点 logo，等路由完成
await page.goto("https://jobhot.cn/hot", { waitUntil: "networkidle", timeout: 45000 });
const before = page.url();
await page.click("aside a[aria-label]");
await page.waitForFunction(() => location.pathname === "/", null, { timeout: 5000 }).catch(() => {});
const after = page.url();
const spinning = await page.evaluate(() => !!document.querySelector(".logo-spin"));
console.log(`click: ${before} -> ${after} | logo-spin present: ${spinning}`);

await page.waitForTimeout(150);
await page.screenshot({ path: "E:/Data/WorkBuddy/Liuger/jobhot-live-spin.png", clip: { x: 0, y: 0, width: 280, height: 130 } });

await browser.close();
