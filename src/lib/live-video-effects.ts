export type LiveVideoEffect =
  | "none"
  | "beauty"
  | "smooth"
  | "glow"
  | "rose"
  | "sunset"
  | "neon"
  | "cool"
  | "warm"
  | "vintage"
  | "film"
  | "mono"
  | "vivid"
  | "dramatic";

export type LiveEffectCategory = "basic" | "beauty" | "mood" | "style";

export type LiveVideoEffectDef = {
  id: LiveVideoEffect;
  label: string;
  category: LiveEffectCategory;
  /** Preview swatch gradient for the picker UI */
  swatch: string;
};

/** TikTok-style real-time VIDEO effects (GPU shaders — not static photo filters). */
export const LIVE_VIDEO_EFFECTS: LiveVideoEffectDef[] = [
  { id: "none", label: "Original", category: "basic", swatch: "linear-gradient(135deg,#666,#bbb)" },
  { id: "beauty", label: "Skin", category: "beauty", swatch: "linear-gradient(135deg,#ffb6c1,#fff0f5)" },
  { id: "smooth", label: "Porcelain", category: "beauty", swatch: "linear-gradient(135deg,#f8e0e6,#fff5fa)" },
  { id: "glow", label: "Glow Up", category: "beauty", swatch: "linear-gradient(135deg,#fff5cc,#ffd6e8)" },
  { id: "rose", label: "Pink", category: "beauty", swatch: "linear-gradient(135deg,#ff6b9d,#ffc2e0)" },
  { id: "sunset", label: "Sunset", category: "mood", swatch: "linear-gradient(135deg,#ff512f,#f09819)" },
  { id: "warm", label: "Golden", category: "mood", swatch: "linear-gradient(135deg,#e8c547,#f5deb3)" },
  { id: "cool", label: "Ice", category: "mood", swatch: "linear-gradient(135deg,#2193b0,#6dd5ed)" },
  { id: "neon", label: "Neon", category: "mood", swatch: "linear-gradient(135deg,#ff00cc,#3333ff)" },
  { id: "vivid", label: "HD Pop", category: "style", swatch: "linear-gradient(135deg,#f12711,#f5af19)" },
  { id: "vintage", label: "Y2K", category: "style", swatch: "linear-gradient(135deg,#8b6914,#d4a574)" },
  { id: "film", label: "Cine", category: "style", swatch: "linear-gradient(135deg,#2c2c2c,#8a8a8a)" },
  { id: "mono", label: "Noir", category: "style", swatch: "linear-gradient(135deg,#111,#999)" },
  { id: "dramatic", label: "Shadow", category: "style", swatch: "linear-gradient(135deg,#0f0c29,#302b63)" },
];

export const LIVE_EFFECT_CATEGORIES: { id: LiveEffectCategory; label: string }[] = [
  { id: "basic", label: "Original" },
  { id: "beauty", label: "Face" },
  { id: "mood", label: "Vibe" },
  { id: "style", label: "Cine" },
];
