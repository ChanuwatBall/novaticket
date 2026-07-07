import i18n from "./index";
import { DEFAULT_LANGUAGE, languages, type LanguageOption } from "./resources";

export const LANGUAGE_RESOURCES_UPDATED_EVENT = "language-resources-updated";

type TranslationMap = Record<string, string>;
type RemoteLanguageResources = Record<string, unknown> | Array<unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isTranslationMap = (value: unknown): value is TranslationMap => {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
};

const normalizeLanguageCode = (value: unknown) => {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return code ? code : null;
};

const normalizeLanguageOption = (code: string, value?: Record<string, unknown>): LanguageOption => {
  const configuredLabel = value?.label ?? value?.name ?? value?.nativeName;
  const label = typeof configuredLabel === "string" && configuredLabel.trim() ? configuredLabel.trim() : code.toUpperCase();
  const configuredShortLabel = value?.shortLabel ?? value?.short ?? value?.abbr;
  const shortLabel =
    typeof configuredShortLabel === "string" && configuredShortLabel.trim()
      ? configuredShortLabel.trim()
      : code.toUpperCase();

  return { code, label, shortLabel };
};

const normalizeResourceEntry = (value: unknown): TranslationMap | null => {
  if (isTranslationMap(value)) return value;
  if (!isRecord(value)) return null;

  const translation = value.translation ?? value.translations ?? value.resources ?? value.messages;
  return isTranslationMap(translation) ? translation : null;
};

const normalizeRemoteLanguageResources = (input: unknown) => {
  const bundles: Record<string, TranslationMap> = {};
  const options: LanguageOption[] = [];

  if (!input) return { bundles, options };

  if (Array.isArray(input)) {
    input.forEach((entry) => {
      if (!isRecord(entry)) return;

      const code = normalizeLanguageCode(entry.code ?? entry.language ?? entry.locale ?? entry.lng);
      if (!code) return;

      const translations = normalizeResourceEntry(entry);
      if (translations) {
        bundles[code] = translations;
      }

      options.push(normalizeLanguageOption(code, entry));
    });

    return { bundles, options };
  }

  if (!isRecord(input)) return { bundles, options };

  const explicitLanguages = input.languages ?? input.locales;
  if (Array.isArray(explicitLanguages)) {
    explicitLanguages.forEach((entry) => {
      if (typeof entry === "string") {
        options.push(normalizeLanguageOption(entry));
      } else if (isRecord(entry)) {
        const code = normalizeLanguageCode(entry.code ?? entry.language ?? entry.locale ?? entry.lng);
        if (code) options.push(normalizeLanguageOption(code, entry));
      }
    });
  }

  const resourceContainer = isRecord(input.resources)
    ? input.resources
    : isRecord(input.translations)
      ? input.translations
      : input;

  Object.entries(resourceContainer).forEach(([code, value]) => {
    if (code === "languages" || code === "locales" || code === "resources" || code === "translations") return;

    const translations = normalizeResourceEntry(value);
    if (!translations) return;

    bundles[code] = translations;
    if (!options.some((option) => option.code === code)) {
      options.push(normalizeLanguageOption(code, isRecord(value) ? value : undefined));
    }
  });

  return { bundles, options };
};

export const applyRemoteLanguageResources = (input: unknown) => {
  const { bundles, options } = normalizeRemoteLanguageResources(input as RemoteLanguageResources);

  Object.entries(bundles).forEach(([language, translations]) => {
    i18n.addResourceBundle(language, "translation", translations, true, true);
  });

  if (Object.keys(bundles).length > 0) {
    void i18n.changeLanguage(i18n.language || DEFAULT_LANGUAGE);
  }

  if ((options.length > 0 || Object.keys(bundles).length > 0) && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LANGUAGE_RESOURCES_UPDATED_EVENT));
  }
};

export const getLanguageOptions = () => {
  const optionMap = new Map<string, LanguageOption>();

  languages.forEach((language) => optionMap.set(language.code, language));

  Object.keys(i18n.store.data).forEach((code) => {
    if (!optionMap.has(code)) {
      optionMap.set(code, normalizeLanguageOption(code));
    }
  });

  const activeLanguage = i18n.language || DEFAULT_LANGUAGE;
  if (!optionMap.has(activeLanguage)) {
    optionMap.set(activeLanguage, normalizeLanguageOption(activeLanguage));
  }

  return Array.from(optionMap.values());
};
