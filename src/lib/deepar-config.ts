/** DeepAR Web SDK — face lenses & background blur (TikTok/Snapchat-style AR). */
export const DEEPAR_VERSION = "5.6.22";

export const DEEPAR_ROOT_PATH = `https://cdn.jsdelivr.net/npm/deepar@${DEEPAR_VERSION}/`;

function trimLicenseKey(key: string | undefined): string | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (trimmed.length < 10 || trimmed.includes("your-deepar")) return null;
  return trimmed;
}

export function isLocalDeepARHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * DeepAR keys are bound to the domain registered in developer.deepar.ai.
 * Use NEXT_PUBLIC_DEEPAR_LICENSE_KEY for production (e.g. your-app.vercel.app).
 * Use NEXT_PUBLIC_DEEPAR_LICENSE_KEY_LOCAL for a separate localhost web app key.
 */
export function getDeepARLicenseKey(hostname?: string): string | null {
  const production = trimLicenseKey(process.env.NEXT_PUBLIC_DEEPAR_LICENSE_KEY);
  const local = trimLicenseKey(process.env.NEXT_PUBLIC_DEEPAR_LICENSE_KEY_LOCAL);

  const host =
    hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");

  if (isLocalDeepARHost(host)) {
    return local ?? production;
  }

  return production ?? local;
}

export function isDeepARConfigured(hostname?: string): boolean {
  return !!getDeepARLicenseKey(hostname);
}

export function getDeepARLicenseDomainHint(hostname?: string): string {
  const host =
    hostname ?? (typeof window !== "undefined" ? window.location.hostname : "localhost");

  if (host === "127.0.0.1") {
    return 'Open http://localhost:3000 instead of 127.0.0.1, or create a DeepAR web app with domain "127.0.0.1".';
  }

  if (isLocalDeepARHost(host)) {
    return 'Create a Web app at developer.deepar.ai with domain "localhost" and set NEXT_PUBLIC_DEEPAR_LICENSE_KEY_LOCAL (or use a production key if your plan allows localhost).';
  }

  return `Create a Web app at developer.deepar.ai with domain "${host}" (no https://) and use that app\'s license key in NEXT_PUBLIC_DEEPAR_LICENSE_KEY.`;
}

export function formatDeepARError(message: string, hostname?: string): string {
  if (!/license/i.test(message)) return message;
  const host =
    hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return `DeepAR license not valid on "${host}". ${getDeepARLicenseDomainHint(host)}`;
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
