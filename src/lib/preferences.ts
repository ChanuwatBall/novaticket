import type { PublicCompanyConfig } from "@/services/api";

export type AppPreferences = {
  oaTitle?: string | null;
  colorPrimary?: string | null;
  colorSecondary?: string | null;
  colorAccent?: string | null;
  colorBackground?: string | null;
  colorText?: string | null;
  fontFamily?: string | null;
  borderRadius?: string | null;
  languageResources?: unknown;
  webIconUrl?: string | null;
  web_icon_url?: string | null;
};

export const configToPreferences = (config: PublicCompanyConfig): AppPreferences => ({
  oaTitle: config.branding?.appTitle || config.branding?.brandName,
  colorPrimary: config.theme?.primaryColor,
  colorSecondary: config.theme?.secondaryColor,
  colorAccent: config.theme?.accentColor,
  colorBackground: config.theme?.backgroundColor,
  colorText: config.theme?.textColor,
  fontFamily: typeof config.theme?.config?.fontFamily === "string"
    ? config.theme.config.fontFamily
    : undefined,
  borderRadius: typeof config.theme?.config?.borderRadius === "string"
    ? config.theme.config.borderRadius
    : undefined,
  webIconUrl: config.branding?.faviconUrl || config.branding?.logoUrl,
});

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
  if (/^(https?:)?\/\//i.test(iconValue) || iconValue.startsWith("/")) return iconValue;
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
  const configuredAccentHex = normalizeHexColor(preferences?.colorAccent);
  const backgroundHex = normalizeHexColor(preferences?.colorBackground);
  const textHex = normalizeHexColor(preferences?.colorText);
  const primaryHsl = hexToHslString(primaryHex);
  const secondaryHsl = hexToHslString(secondaryHex);
  const accentHex = configuredAccentHex || mixHexColors(secondaryHex, "#FFFFFF", 0.85);
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

  const backgroundHsl = backgroundHex && hexToHslString(backgroundHex);
  const textHsl = textHex && hexToHslString(textHex);
  if (backgroundHsl) root.style.setProperty("--background", backgroundHsl);
  if (textHsl) root.style.setProperty("--foreground", textHsl);
  if (preferences?.fontFamily?.trim()) {
    root.style.setProperty("--app-font-family", preferences.fontFamily.trim());
    root.style.fontFamily = `${preferences.fontFamily.trim()}, sans-serif`;
  }
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(preferences?.borderRadius?.trim() || "")) {
    root.style.setProperty("--radius", preferences!.borderRadius!.trim());
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
