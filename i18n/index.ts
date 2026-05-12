import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en";
import bn from "./locales/bn";
import ar from "./locales/ar";
import es from "./locales/es";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" as const },
  { code: "bn", label: "বাংলা", flag: "🇧🇩", dir: "ltr" as const },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" as const },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" as const },
] as const;

export type LangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const STORAGE_KEY = "pinnacle-lang";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        bn: { translation: bn },
        ar: { translation: ar },
        es: { translation: es },
      },
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: STORAGE_KEY,
        caches: ["localStorage"],
      },
      react: { useSuspense: false },
    });
}

export function applyLangSideEffects(lang: string) {
  const cfg = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];
  if (typeof document !== "undefined") {
    document.documentElement.lang = cfg.code;
    document.documentElement.dir = cfg.dir;
  }
}

// apply on initial load
applyLangSideEffects(i18n.language);
i18n.on("languageChanged", applyLangSideEffects);

export default i18n;
