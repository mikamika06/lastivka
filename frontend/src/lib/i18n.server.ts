import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, ROLE_COOKIE, isRole, pick, type Locale, type Role, type Msg } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  return c.get(LOCALE_COOKIE)?.value === "en" ? "en" : "uk";
}

export async function getRole(): Promise<Role> {
  const c = await cookies();
  const v = c.get(ROLE_COOKIE)?.value;
  return isRole(v) ? v : "ssd";
}

/** Серверний переклад, привʼязаний до локалі запиту: t({uk, en}). */
export async function getT(): Promise<(m: Msg) => string> {
  const locale = await getLocale();
  return (m: Msg) => pick(locale, m);
}
