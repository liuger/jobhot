// 从 site/brand/logo.svg 重新生成品牌位图：icon.png(512)、icon-192.png、apple-icon.png(180)、favicon.ico(16/32/48)。
// 背景与旧版一致：纯黑底上放卡片。改了 logo.svg 的配色后跑一次：node24 node.exe scripts/render-brand-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const brand = join(here, "..", "site", "brand");
const svg = readFileSync(join(brand, "logo.svg"));

async function png(size) {
  const bg = await sharp({ create: { width: size, height: size, channels: 4, background: "#000000" } }).png().toBuffer();
  return sharp(svg, { density: 96 })
    .resize(size, size)
    .composite([{ input: bg, blend: "dest-over" }])
    .png()
    .toBuffer();
}

// ICO 容器：ICONDIR + ICONDIRENTRY×n + 各尺寸 PNG（Vista 起支持 PNG 载荷）。
function ico(buffers) {
  const n = buffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(n, 4);
  const entries = Buffer.alloc(16 * n);
  let offset = 6 + 16 * n;
  const parts = [header, entries];
  buffers.forEach((buf, i) => {
    const size = buf.size;
    const e = entries.subarray(i * 16, (i + 1) * 16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    parts.push(buf);
  });
  return Buffer.concat(parts);
}

const icon512 = await png(512);
writeFileSync(join(brand, "icon.png"), icon512);
writeFileSync(join(brand, "icon-192.png"), await png(192));
writeFileSync(join(brand, "apple-icon.png"), await png(180));
const icoSizes = [16, 32, 48];
const icoBufs = [];
for (const s of icoSizes) icoBufs.push(Object.assign(await png(s), { size: s }));
writeFileSync(join(brand, "favicon.ico"), ico(icoBufs));
console.log("brand icons regenerated: icon.png, icon-192.png, apple-icon.png, favicon.ico");
