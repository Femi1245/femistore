/** DeepAR Web SDK — face lenses & background blur (TikTok/Snapchat-style AR). */
export const DEEPAR_VERSION = "5.6.22";

export const DEEPAR_ROOT_PATH = `https://cdn.jsdelivr.net/npm/deepar@${DEEPAR_VERSION}/`;

export function isDeepARConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_DEEPAR_LICENSE_KEY;
  return (
    typeof key === "string" &&
    key.length > 10 &&
    !key.includes("your-deepar") &&
    key !== "your-deepar-license-key"
  );
}

export type LiveAREffect =
  | "ar_none"
  | "ar_aviators"
  | "ar_lion"
  | "ar_koala"
  | "ar_dalmatian"
  | "ar_galaxy"
  | "ar_blur";

export type LiveAREffectKind = "none" | "lens";

export type LiveAREffectDef = {
  id: LiveAREffect;
  label: string;
  swatch: string;
  kind: LiveAREffectKind;
  /** Effect file under `deepar/effects/` (with extension when needed). */
  file?: string;
};

export const LIVE_AR_EFFECTS: LiveAREffectDef[] = [
  { id: "ar_none", label: "Original", kind: "none", swatch: "linear-gradient(135deg,#666,#bbb)" },
  {
    id: "ar_aviators",
    label: "Aviators",
    kind: "lens",
    file: "aviators",
    swatch: "linear-gradient(135deg,#1a1a2e,#e94560)",
  },
  {
    id: "ar_lion",
    label: "Lion",
    kind: "lens",
    file: "lion",
    swatch: "linear-gradient(135deg,#c97b2b,#f4d03f)",
  },
  {
    id: "ar_koala",
    label: "Koala",
    kind: "lens",
    file: "koala",
    swatch: "linear-gradient(135deg,#95a5a6,#ecf0f1)",
  },
  {
    id: "ar_dalmatian",
    label: "Dalmatian",
    kind: "lens",
    file: "dalmatian",
    swatch: "linear-gradient(135deg,#fff,#333)",
  },
  {
    id: "ar_galaxy",
    label: "Galaxy",
    kind: "lens",
    file: "galaxy_background",
    swatch: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
  },
  {
    id: "ar_blur",
    label: "Blur BG",
    kind: "lens",
    file: "background_blur.deepar",
    swatch: "linear-gradient(135deg,#4a5568,#a0aec0)",
  },
];

export type LiveEffectMode = "video" | "ar";

export function getDeepAREffectUrl(effect: LiveAREffect): string | null {
  const def = LIVE_AR_EFFECTS.find((e) => e.id === effect);
  if (!def || def.kind !== "lens" || !def.file) return null;
  return `${DEEPAR_ROOT_PATH}effects/${def.file}`;
}

export function defaultLiveEffectMode(): LiveEffectMode {
  return isDeepARConfigured() ? "ar" : "video";
}
