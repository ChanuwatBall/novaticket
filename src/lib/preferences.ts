type AppPreferences = {
  oaTitle?: string | null;
  colorPrimary?: string | null;
  colorSecondary?: string | null;
  languageResources?: unknown;
  webIconUrl?: string | null;
  web_icon_url?: string | null;
};

type PreferenceContainer = {
  data?: unknown;
  payload?: unknown;
  result?: unknown;
  preference?: unknown;
  preferences?: unknown;
  company?: unknown;
  config?: unknown;
  settings?: unknown;
};

const PREFERENCES_STORAGE_KEY = "preferences";

const DEFAULT_TITLE = "NOVA Express";
const DEFAULT_PRIMARY = "#144986";
const DEFAULT_SECONDARY = "#F37021";

const isHexColor = (value?: string | null) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value ?? "");

const isDataUrl = (value?: string | null) => /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value?.trim() ?? "");

const looksLikeBase64 = (value?: string | null) => /^[A-Za-z0-9+/=\s]+$/.test(value?.trim() ?? "");

const normalizeHexColor = (value?: string | null, fallback?: string) => {
  if (!isHexColor(value)) return fallback ?? null;

  const hex = value!.trim();
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
  }

  return hex.toUpperCase();
};

const normalizeIconUrl = (value?: string | null) => {
  const iconValue = value?.trim();
  if (!iconValue) return null;
  if (isDataUrl(iconValue)) return iconValue;
  if (looksLikeBase64(iconValue)) return `data:image/png;base64,${iconValue.replace(/\s+/g, "")}`;
  return null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100,
  };
};

const hexToHslString = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
};

const mixHexColors = (baseHex: string, targetHex: string, weight: number) => {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);
  if (!base || !target) return baseHex;

  const blend = clamp(weight, 0, 1);
  const toChannel = (from: number, to: number) => Math.round(from + (to - from) * blend);

  const toHex = (value: number) => value.toString(16).padStart(2, "0").toUpperCase();

  return `#${toHex(toChannel(base.r, target.r))}${toHex(toChannel(base.g, target.g))}${toHex(toChannel(base.b, target.b))}`;
};

const PREFERENCE_KEYS = new Set([
  "oaTitle",
  "colorPrimary",
  "colorSecondary",
  "system",
  "booking",
  "loyalty",
  "languageResources",
  "theme",
  "webIconUrl",
  "web_icon_url",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const looksLikePreferences = (value: unknown): value is AppPreferences => {
  if (!isRecord(value)) return false;
  return Object.keys(value).some((key) => PREFERENCE_KEYS.has(key));
};

export const resolvePreferences = (input: unknown): AppPreferences | null => {
  const queue: unknown[] = [input];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!isRecord(current) || visited.has(current)) continue;

    visited.add(current);

    if (looksLikePreferences(current)) {
      return current as AppPreferences;
    }

    const container = current as PreferenceContainer;
    queue.push(
      container.data,
      container.payload,
      container.result,
      container.preference,
      container.preferences,
      container.company,
      container.config,
      container.settings,
    );
  }

  return null;
};

export const getStoredPreferences = (): AppPreferences | null => {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Unable to parse stored preferences", error);
    return null;
  }
};

export const storePreferences = (preferences: AppPreferences) => {
  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
};

export const applyPreferences = (preferences?: AppPreferences | null) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const title = preferences?.oaTitle?.trim() || DEFAULT_TITLE;
  const iconUrl = normalizeIconUrl(preferences?.web_icon_url ?? preferences?.webIconUrl);
  const primaryHex = normalizeHexColor(preferences?.colorPrimary, DEFAULT_PRIMARY) ?? DEFAULT_PRIMARY;
  const secondaryHex = normalizeHexColor(preferences?.colorSecondary, DEFAULT_SECONDARY) ?? DEFAULT_SECONDARY;
  const primaryHsl = hexToHslString(primaryHex);
  const secondaryHsl = hexToHslString(secondaryHex);
  const accentHex = mixHexColors(secondaryHex, "#FFFFFF", 0.85);
  const accentHsl = hexToHslString(accentHex);

  document.title = title;

  if (iconUrl) {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    favicon.href = iconUrl;
    favicon.type = "image/png";
  }

  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--ring", primaryHsl);
    root.style.setProperty("--sidebar-primary", primaryHsl);
  }

  if (secondaryHsl) {
    root.style.setProperty("--secondary", secondaryHsl);
    root.style.setProperty("--brand-orange", secondaryHex);
  }

  if (accentHsl) {
    root.style.setProperty("--accent", accentHsl);
  }

  root.style.setProperty("--brand-mid-blue", primaryHex);
  root.style.setProperty("--brand-blue", mixHexColors(primaryHex, "#FFFFFF", 0.12));
  root.style.setProperty("--brand-navy", mixHexColors(primaryHex, "#000000", 0.18));
  root.style.setProperty("--brand-light-orange", mixHexColors(secondaryHex, "#FFFFFF", 0.2));
  root.style.setProperty(
    "--brand-gradient",
    `linear-gradient(135deg, ${mixHexColors(primaryHex, "#FFFFFF", 0.12)} 0%, ${primaryHex} 52%, ${secondaryHex} 100%)`,
  );
};
