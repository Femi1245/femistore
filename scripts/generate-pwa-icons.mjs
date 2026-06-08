import sharp from "sharp";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.join(root, "public/images/itunt.png");
const outDir = path.join(root, "public/pwa");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  await sharp(input)
    .resize(size, size, { fit: "contain", background: { r: 244, g: 232, b: 212, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
}

console.log(`Generated ${sizes.length} PWA icons in public/pwa/`);
