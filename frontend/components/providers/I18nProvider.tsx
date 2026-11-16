"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { MESSAGES, type Messages } from "@/lib/i18n";
import { formatDate, formatPrice } from "@/lib/client/format";
import { setErrorTexts } from "@/lib/client/api";

type I18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** The current locale's dictionary, e.g. `m.home.lead` or `m.nav.basket(3)`. */
  m: Messages;
  formatPrice: (value: number) => string;
  formatDate: (value: string | null | undefined, withTime?: boolean) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // Persisted in a cookie so the server renders <html lang> and the first paint in this language.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18n>(() => {
    setErrorTexts(MESSAGES[locale].errors);
    return {
      locale,
      setLocale,
      m: MESSAGES[locale],
      formatPrice: (v) => formatPrice(v, locale),
      formatDate: (v, withTime) => formatDate(v, withTime, locale),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
