import Link from "next/link";
import { SwallowMark } from "@/components/ui/Logo";
import { NAV } from "@/components/layout/nav";

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
                <SwallowMark className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold text-ink">Ластівка</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Заздалегідь захищаємо права дитини, із захистом персональних даних. Бачимо, коли дитина
              реально позбавлена своїх прав, за збігом сигналів з кількох реєстрів — щоб вона не зникла
              у щілині між відомствами й країнами.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">Система</h4>
            <ul className="mt-3 space-y-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-sm text-ink-2 transition hover:text-brand">
                    {n.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">Контекст</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-2">
              <li>Українсько-естонське партнерство</li>
              <li>AI Hackathon · 16–18.06.2026</li>
              <li>Сумісність із Trembita / X-Road (державна шина обміну даними)</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
          <p>
            <span className="font-medium text-muted">Етика:</span> Підтримка рішень, не вирок.
            Бачимо, коли дитина реально позбавлена прав (записана в школі чи ні), а не
            «прогнозуємо злочинність». Зрозумілий індекс терміновості — система пояснює кожне рішення,
            а останнє слово завжди за людиною.
          </p>
          <p className="mt-2">
            Демонстрація на <span className="font-medium text-muted">синтетичних</span> даних,
            структурно ідентичних реальним реєстрам. Жодних справжніх персональних даних.
          </p>
        </div>
      </div>
    </footer>
  );
}
