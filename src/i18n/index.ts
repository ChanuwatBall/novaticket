import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, resources } from "./resources";

const storedLanguage =
  typeof localStorage !== "undefined"
    ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
    : null;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: storedLanguage || DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
    saveMissing: false,
    missingKeyHandler: undefined,
  });

i18n.on("languageChanged", (language) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language || DEFAULT_LANGUAGE;
}

if (typeof window !== "undefined") {
  const nativeAlert = window.alert.bind(window);
  window.alert = (message?: unknown) => {
    if (typeof message === "string") {
      nativeAlert(i18n.t(message, { defaultValue: message }));
      return;
    }
    nativeAlert(message);
  };
}

export default i18n;
