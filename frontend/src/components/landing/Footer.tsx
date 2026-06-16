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
              <span className="font-display text-lg font-extrabold text-ink">Ластівка</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Проактивний privacy-preserving захист прав дитини. Виявляємо об&apos;єктивну депривацію
              прав на перетині держреєстрів — щоб дитина не зникла у щілині між відомствами й країнами.
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
              <li>AI GovTech Hackathon · 16–18.06.2026</li>
              <li>Сумісність із Trembita / X-Road</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
          <p>
            <span className="font-medium text-muted">Етика:</span> Decision support, не decision making.
            Виявляємо об&apos;єктивну депривацію прав (дитина записана в школі чи ні), а не
            «прогнозуємо злочинність». Прозорий адитивний score, людина в циклі.
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
