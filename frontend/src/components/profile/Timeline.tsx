"use client";

import type { TimelineEvent } from "@/lib/types";
import { regName } from "@/lib/registries";
import { formatDate } from "@/lib/format";
import { LockIcon } from "@/components/ui/badges";
import { useTx, useLocale } from "@/components/providers/I18nProvider";

export function Timeline({ events }: Readonly<{ events: TimelineEvent[] }>) {
  const t = useTx();
  const locale = useLocale();
  if (events.length === 0) {
    return <p className="text-sm text-muted">{t({ uk: "Подій для відображення немає.", en: "No events to display." })}</p>;
  }

  return (
    <ol className="relative space-y-5 pl-6">
      <span className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-line" aria-hidden="true" />
      {events.map((e, i) => (
        <li key={`${e.date}-${e.registry}-${i}`} className="relative">
          <span
            className={`absolute -left-[23px] top-1 grid h-4 w-4 place-items-center rounded-full ring-4 ring-surface ${
              e.level1 ? "bg-lock" : "bg-brand"
            }`}
          >
            {e.level1 && <LockIcon className="h-2.5 w-2.5 text-white" />}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <time className="text-xs font-medium tnum text-muted">{formatDate(e.date, locale)}</time>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                e.level1 ? "bg-lock-soft text-lock-ink" : "bg-brand-soft text-brand-ink"
              }`}
            >
              {regName(e.registry, locale)}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-2">{e.label}</p>
          {e.level1 && (
            <p className="mt-1 text-[11px] text-lock-ink/80">
              {t({
                uk: "Найчутливіші дані: видно лише сигнал «є / немає», без доступу до вмісту. Повний доступ — лише за рішенням суду або в межах лікарської таємниці.",
                en: "Most sensitive data: only a yes/no signal is visible, with no access to the content. Full access only by court order or within medical confidentiality.",
              })}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
