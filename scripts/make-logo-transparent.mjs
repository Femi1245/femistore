import sharp from "sharp";
import { rename, copyFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.join(root, "public/images/itunt.png");
const tmp = path.join(root, "public/images/itunt.tmp.png");

const THRESHOLD = 235;
const SOFT = 210;

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const avg = (r + g + b) / 3;

  if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
    data[i + 3] = 0;
  } else if (avg >= SOFT) {
    const fade = 1 - (avg - SOFT) / (THRESHOLD - SOFT);
    data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, fade)));
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(tmp);

await rename(tmp, input);

const iconPath = path.join(root, "src/app/icon.png");
await sharp(input).resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(iconPath);

const appleIconPath = path.join(root, "src/app/apple-icon.png");
await sharp(input).resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(appleIconPath);

console.log("Logo background removed:", input);
console.log("Favicon written:", iconPath, appleIconPath);
