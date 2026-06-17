import type { TimelineEvent } from "@/lib/types";
import { regName } from "@/lib/registries";
import { formatDate } from "@/lib/format";
import { LockIcon } from "@/components/ui/badges";

export function Timeline({ events }: Readonly<{ events: TimelineEvent[] }>) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">Подій для відображення немає.</p>;
  }

  return (
    <ol className="relative space-y-5 pl-6">
      <span className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-line" aria-hidden="true" />
      {events.map((e) => (
        <li key={`${e.date}-${e.registry}`} className="relative">
          <span
            className={`absolute -left-[23px] top-1 grid h-4 w-4 place-items-center rounded-full ring-4 ring-surface ${
              e.level1 ? "bg-lock" : "bg-brand"
            }`}
          >
            {e.level1 && <LockIcon className="h-2.5 w-2.5 text-white" />}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <time className="text-xs font-medium tnum text-muted">{formatDate(e.date)}</time>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                e.level1 ? "bg-lock-soft text-lock-ink" : "bg-brand-soft text-brand-ink"
              }`}
            >
              {regName(e.registry)}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-2">{e.label}</p>
          {e.level1 && (
            <p className="mt-1 text-[11px] text-lock-ink/80">
              Рівень-1: сигнал отримано як PSI-булеан. Повний доступ — за законним правом
              (ухвала суду / медична таємниця).
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
