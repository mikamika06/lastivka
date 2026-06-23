"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "./I18nProvider";
import { setLocaleCookie, type Locale } from "@/lib/i18n";

const OPTS: Locale[] = ["uk", "en"];

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();

  const set = (l: Locale) => {
    if (l === locale) return;
    setLocaleCookie(l);
    router.refresh();
  };

  return (
    <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold">
      {OPTS.map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          aria-pressed={locale === l}
          className={`rounded-md px-2 py-1 transition ${
            locale === l ? "bg-primary text-primary-fg" : "text-muted hover:text-ink"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
