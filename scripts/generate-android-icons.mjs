#!/usr/bin/env node
/**
 * Generate Android launcher icons from public/images/zumelia.png
 * Usage: node scripts/generate-android-icons.mjs
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "images", "zumelia.png");
const res = join(root, "android", "app", "src", "main", "res");

const densities = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

const foregroundSizes = [
  { folder: "mipmap-mdpi", size: 108 },
  { folder: "mipmap-hdpi", size: 162 },
  { folder: "mipmap-xhdpi", size: 216 },
  { folder: "mipmap-xxhdpi", size: 324 },
  { folder: "mipmap-xxxhdpi", size: 432 },
];

async function writePng(path, size, insetRatio = 0) {
  const inset = Math.round(size * insetRatio);
  const inner = size - inset * 2;
  const logo = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: { r: 250, g: 248, b: 245, alpha: 1 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 250, g: 248, b: 245, alpha: 1 },
    },
  })
    .composite([{ input: logo, left: inset, top: inset }])
    .png()
    .toFile(path);
}

async function main() {
  for (const { folder, size } of densities) {
    const dir = join(res, folder);
    await mkdir(dir, { recursive: true });
    await writePng(join(dir, "ic_launcher.png"), size, 0.08);
    await writePng(join(dir, "ic_launcher_round.png"), size, 0.12);
  }

  for (const { folder, size } of foregroundSizes) {
    const dir = join(res, folder);
    await mkdir(dir, { recursive: true });
    // Adaptive icon foreground — logo centered with padding
    await writePng(join(dir, "ic_launcher_foreground.png"), size, 0.18);
  }

  // Splash drawables — full logo on cream
  const splashTargets = [
    "drawable/splash.png",
    "drawable-port-mdpi/splash.png",
    "drawable-port-hdpi/splash.png",
    "drawable-port-xhdpi/splash.png",
    "drawable-port-xxhdpi/splash.png",
    "drawable-port-xxxhdpi/splash.png",
    "drawable-land-mdpi/splash.png",
    "drawable-land-hdpi/splash.png",
    "drawable-land-xhdpi/splash.png",
    "drawable-land-xxhdpi/splash.png",
    "drawable-land-xxxhdpi/splash.png",
  ];

  for (const rel of splashTargets) {
    const out = join(res, rel);
    await mkdir(dirname(out), { recursive: true });
    await sharp(src)
      .resize(512, 512, { fit: "contain", background: { r: 250, g: 248, b: 245, alpha: 1 } })
      .extend({
        top: 256,
        bottom: 256,
        left: 256,
        right: 256,
        background: { r: 250, g: 248, b: 245, alpha: 1 },
      })
      .png()
      .toFile(out);
  }

  // Adaptive icon background color
  await writeFile(
    join(res, "values", "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FAF8F5</color>
</resources>
`,
  );

  console.log("✓ Android icons + splash generated from public/images/zumelia.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
