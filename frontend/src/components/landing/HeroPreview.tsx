import { SwallowMark } from "@/components/ui/Logo";
import { LockIcon } from "@/components/ui/badges";

/** Превʼю продукту для hero: дитина «у щілині», зібрана з окремих реєстрів. */
export function HeroPreview() {
  return (
    <div className="card animate-fade-up p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-fg">
            <SwallowMark className="h-3.5 w-3.5" />
          </span>{" "}
          Черга реагування
        </span>
        <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-muted">демо</span>
      </div>

      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-12 w-1 rounded-full bg-t0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">Ткаченко Софія</span>
            <span className="text-xs text-faint">8 років · Харківська обл.</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {["Вимушене переміщення", "Поза освітою", "Обмеження медицини"].map((v) => (
              <span key={v} className="rounded-md bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-t0-soft px-2.5 py-1 text-xs font-semibold text-t0-ink ring-1 ring-t0-line">
            <span className="h-1.5 w-1.5 rounded-full bg-t0" /> T0
          </span>
          <span className="mt-1 text-[11px] text-faint">
            індекс терміновості <span className="font-semibold tnum text-ink-2">2.41</span>
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-paper/50 p-3">
        <p className="text-[11px] font-medium text-muted">Підтверджено збігом сигналів з кількох реєстрів:</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>ВПО → переміщення</Chip>
          <Chip>ЄДЕБО → вихід зі школи</Chip>
          <Chip>eHealth → декларацію закрито</Chip>
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted">
          <LockIcon className="h-3 w-3 text-lock" />
          Найчутливіші дані (Рівень 1) — лише сигнал «є / немає», повний доступ за рішенням суду
        </p>
      </div>
    </div>
  );
}

function Chip({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink">
      {children}
    </span>
  );
}
