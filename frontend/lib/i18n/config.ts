/** Locale settings shared by server and client code (no React here). */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

/** Native names, shown in the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/**
 * Picks a supported locale from a cookie value, falling back to the
 * Accept-Language header (e.g. "fr-CH,fr;q=0.9,en;q=0.8"), then the default.
 */
export function resolveLocale(cookieValue?: string | null, acceptLanguage?: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((p) => p.lang && !Number.isNaN(p.q))
    .sort((a, b) => b.q - a.q);
  const match = preferred.find((p) => isLocale(p.lang));
  return match ? (match.lang as Locale) : DEFAULT_LOCALE;
}
