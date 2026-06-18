"use client";

import { createContext, useContext, type ReactNode } from "react";
import { pick, type Locale, type Msg } from "@/lib/i18n";

const Ctx = createContext<Locale>("en");

export function I18nProvider({ locale, children }: Readonly<{ locale: Locale; children: ReactNode }>) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  return useContext(Ctx);
}

/** Клієнтський переклад: const t = useTx(); t({uk, en}). */
export function useTx(): (m: Msg) => string {
  const locale = useContext(Ctx);
  return (m: Msg) => pick(locale, m);
}
