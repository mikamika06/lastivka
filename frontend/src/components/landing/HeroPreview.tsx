import { SwallowMark } from "@/components/ui/Logo";
import { LockIcon } from "@/components/ui/badges";

/** Превʼю продукту для hero: кейс «дитина у щілині» зібраний із силосів. */
export function HeroPreview() {
  const silos = ["ВПО", "ЄДЕБО", "eHealth", "АІКОМ", "ДРАЦС"];
  return (
    <div className="relative">
      {/* плаваючі чіпи реєстрів */}
      <div className="pointer-events-none absolute -left-6 top-6 hidden flex-col gap-2 sm:flex">
        {silos.slice(0, 3).map((s, i) => (
          <span
            key={s}
            className="animate-fade-up rounded-lg border border-line bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-ink-2 shadow-xs backdrop-blur"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute -right-4 top-16 hidden flex-col gap-2 sm:flex">
        {silos.slice(3).map((s, i) => (
          <span
            key={s}
            className="animate-fade-up rounded-lg border border-line bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-ink-2 shadow-xs backdrop-blur"
            style={{ animationDelay: `${(i + 3) * 120}ms` }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* стос карток (черга) */}
      <div className="absolute inset-x-6 -bottom-3 h-28 rounded-2xl border border-line bg-surface/70" />
      <div className="absolute inset-x-3 -bottom-1.5 h-32 rounded-2xl border border-line bg-surface/85" />

      {/* головна картка кейсу */}
      <div className="card relative animate-fade-up p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-ink text-white">
              <SwallowMark className="h-3.5 w-3.5" />
            </span>
            Черга реагування
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-faint">
            <span className="h-1.5 w-1.5 animate-[pulse-soft_1.5s_ease_infinite] rounded-full bg-ok" />
            live
          </span>
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
              score <span className="font-semibold tnum text-ink-2">2.41</span>
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-paper/40 p-3">
          <p className="text-[11px] font-medium text-muted">Доведено перетином реєстрів:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>ВПО → переміщення</Chip>
            <Chip>ЄДЕБО → вихід зі школи</Chip>
            <Chip>eHealth → декларацію закрито</Chip>
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted">
            <LockIcon className="h-3 w-3 text-lock" />
            Дані Рівня-1 — лише як PSI-булеан
          </p>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink">
      {children}
    </span>
  );
}
