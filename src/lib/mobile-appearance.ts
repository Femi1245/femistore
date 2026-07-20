export type MobileAppearance = {
  showTabLabels: boolean;
  compactSpacing: boolean;
};

const STORAGE_KEY = "zumelia-mobile-appearance";

export const MOBILE_APPEARANCE_EVENT = "zumelia:mobile-appearance";

const DEFAULTS: MobileAppearance = {
  showTabLabels: true,
  compactSpacing: false,
};

export const DEFAULT_MOBILE_APPEARANCE = DEFAULTS;

export function getMobileAppearance(): MobileAppearance {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function setMobileAppearance(patch: Partial<MobileAppearance>): MobileAppearance {
  const next = { ...getMobileAppearance(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(MOBILE_APPEARANCE_EVENT));
  }
  return next;
}
