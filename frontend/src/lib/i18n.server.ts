import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, pick, type Locale, type Msg } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  // English is the default; users can opt into Ukrainian via the language toggle.
  return c.get(LOCALE_COOKIE)?.value === "uk" ? "uk" : "en";
}

/** Серверний переклад, привʼязаний до локалі запиту: t({uk, en}). */
export async function getT(): Promise<(m: Msg) => string> {
  const locale = await getLocale();
  return (m: Msg) => pick(locale, m);
}
