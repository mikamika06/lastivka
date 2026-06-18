import Link from "next/link";
import { SwallowMark } from "@/components/ui/Logo";
import { NAV } from "@/components/layout/nav";
import { getT } from "@/lib/i18n.server";

export async function LandingFooter() {
  const t = await getT();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-fg">
                <SwallowMark className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold text-ink">{t({ uk: "Ластівка", en: "Lastivka" })}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              {t({
                uk: "Заздалегідь захищаємо права дитини, із захистом персональних даних. Бачимо, коли дитина реально позбавлена своїх прав, за збігом сигналів з кількох реєстрів — щоб вона не зникла у щілині між відомствами й країнами.",
                en: "We protect children's rights proactively, with data privacy built in. We see when a child is actually deprived of their rights, by matching signals across several registries — so they don't fall through the cracks between agencies and countries.",
              })}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">{t({ uk: "Система", en: "System" })}</h4>
            <ul className="mt-3 space-y-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-sm text-ink-2 transition hover:text-brand">
                    {t(n.title)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">{t({ uk: "Контекст", en: "Context" })}</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-2">
              <li>{t({ uk: "Українсько-естонське партнерство", en: "Ukrainian-Estonian partnership" })}</li>
              <li>{t({ uk: "16–18.06.2026", en: "16–18.06.2026" })}</li>
              <li>{t({ uk: "Сумісність із Trembita / X-Road (державна шина обміну даними)", en: "Compatible with Trembita / X-Road (the state data exchange bus)" })}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
          <p>
            {t({
              uk: "Працює на синтетичних даних, структурно ідентичних державним реєстрам. Жодних справжніх персональних даних.",
              en: "Runs on synthetic data, structurally identical to state registries. No real personal data whatsoever.",
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
