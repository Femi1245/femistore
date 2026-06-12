// One-off: crop the generated Zumelia logo square and emit all icon sizes.
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/make-brand-icons.mjs <source-image>");
  process.exit(1);
}

const trimmed = await sharp(source).trim().toBuffer();
const meta = await sharp(trimmed).metadata();
const size = Math.max(meta.width, meta.height);

const square = await sharp(trimmed)
  .resize(size, size, {
    fit: "contain",
    background: { r: 244, g: 232, b: 212, alpha: 1 },
  })
  .png()
  .toBuffer();

const out = (p) => path.join(root, p);

await sharp(square).resize(1024, 1024).png().toFile(out("public/images/zumelia.png"));
await sharp(square).resize(512, 512).png().toFile(out("src/app/icon.png"));
await sharp(square).resize(180, 180).png().toFile(out("src/app/apple-icon.png"));
await sharp(square).resize(32, 32).png().toFile(out("scripts/favicon-32.png"));

const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const s of pwaSizes) {
  await sharp(square).resize(s, s).png().toFile(out(`public/pwa/icon-${s}.png`));
}

console.log("Generated zumelia.png, icon.png, apple-icon.png, favicon-32.png, and PWA icons");
