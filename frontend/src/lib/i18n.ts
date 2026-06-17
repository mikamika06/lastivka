/** Спільна частина i18n (без next/headers — безпечно для клієнта й сервера). */
export type Locale = "uk" | "en";

export interface Msg {
  uk: string;
  en: string;
}

export const LOCALE_COOKIE = "lang";

export function pick(locale: Locale, m: Msg): string {
  return locale === "en" ? m.en : m.uk;
}

/** Записати локаль у cookie (клієнт). Винесено з компонента навмисно. */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
