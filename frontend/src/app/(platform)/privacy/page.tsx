import { getMetrics } from "@/lib/api";
import { violName } from "@/lib/registries";
import { formatNumber, formatPct } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n.server";
import { Card, CardTitle, SectionHeading, Pill } from "@/components/ui/Card";
import { MiniStat } from "@/components/ui/Stat";
import { LockIcon } from "@/components/ui/badges";
import { IconShield, IconCheck, IconLayers } from "@/components/ui/icons";

export const metadata = { title: "Захист даних і якість — Ластівка" };

export default async function PrivacyPage() {
  const t = await getT();
  const locale = await getLocale();
  const metrics = await getMetrics();
  const o = metrics.detection.overall;
  const rows = Object.entries(metrics.detection.per_violation)
    .map(([k, m]) => ({ key: k, ...m }))
    .sort((a, b) => b.precision - a.precision);

  return (
    <div className="space-y-6">
      <SectionHeading
        index="04"
        title={t({ uk: "Захист даних і якість системи", en: "Data protection and system quality" })}
        subtitle={t({
          uk: "Чому системі можна довіряти: вона зіставляє дітей, не розкриваючи персональні дані, і чесно показує, наскільки точно працює.",
          en: "Why the system is trustworthy: it matches children without revealing personal data, and honestly shows how accurately it works.",
        })}
      />

      {/* приватне зіставлення */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <CardTitle icon={<LockIcon className="h-4 w-4 text-lock" />}>
              {t({ uk: "Як ми зіставляємо дитину, не розкриваючи її дані", en: "How we match a child without revealing their data" })}
            </CardTitle>
            <p className="text-sm leading-relaxed text-ink-2">
              {t({
                uk: "Реєстри порівнюють не самі імена, а їхні зашифровані цифрові відбитки. Тобто система розуміє, що в двох реєстрах — та сама дитина, але не бачить ні імені, ні номерів. Зіставлення стійке до різного написання: «Олександр», «Oleksandr» чи «Alexander» система впізнає як одну людину.",
                en: "Registries compare not the names themselves, but their encrypted digital fingerprints. The system understands that two registries hold the same child, yet sees neither names nor numbers. Matching is robust to different spellings: it recognises «Олександр», «Oleksandr» or «Alexander» as one person.",
              })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="brand">{t({ uk: "За зашифрованими відбитками", en: "By encrypted fingerprints" })}</Pill>
              <Pill tone="brand">{t({ uk: "Стійко до різного написання імені", en: "Robust to name spelling variations" })}</Pill>
              <Pill tone="neutral">{t({ uk: "Без доступу до самих імен", en: "No access to the names themselves" })}</Pill>
            </div>
            <div className="mt-5 rounded-xl border border-lock/20 bg-lock-soft/60 p-4">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-lock-ink">
                <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t({
                    uk: "Найчутливіші дані (кримінальні провадження, медицина) система отримує лише як сигнал «є / немає» — без доступу до вмісту. Повний доступ можливий тільки за рішенням суду чи в межах лікарської таємниці. Це єдиний законний спосіб користуватися такими даними.",
                    en: "The most sensitive data (criminal proceedings, medical records) reaches the system only as a «yes / no» signal — with no access to the content. Full access is possible only by court order or within medical confidentiality. This is the only lawful way to use such data.",
                  })}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MiniStat label={t({ uk: "Перевірено пар записів", en: "Record pairs checked" })} value={formatNumber(metrics.privacy.n_pairs, locale)} tone="neutral" />
            <MiniStat
              label={t({ uk: "Точність зіставлення", en: "Matching precision" })}
              value={metrics.privacy.precision.toFixed(2)}
              tone="ok"
            />
            <MiniStat label={t({ uk: "Повнота", en: "Recall" })} value={metrics.privacy.recall.toFixed(2)} tone="brand" />
          </div>
        </div>
      </Card>

      {/* якість виявлення */}
      <Card className="p-5 sm:p-6">
        <CardTitle
          icon={<IconShield className="h-4 w-4 text-brand" />}
          hint={t({ uk: "звірено з відомими випадками", en: "verified against known cases" })}
        >
          {t({ uk: "Наскільки точно система виявляє кожен тип порушення", en: "How accurately the system detects each type of violation" })}
        </CardTitle>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3 font-medium">{t({ uk: "Порушення", en: "Violation" })}</th>
                <th className="px-2 py-2 text-center font-medium">{t({ uk: "Вірно", en: "Correct" })}</th>
                <th className="px-2 py-2 text-center font-medium">{t({ uk: "Хибні", en: "False" })}</th>
                <th className="px-2 py-2 text-center font-medium">{t({ uk: "Пропущено", en: "Missed" })}</th>
                <th className="px-3 py-2 font-medium">{t({ uk: "Точність", en: "Precision" })}</th>
                <th className="px-3 py-2 font-medium">{t({ uk: "Повнота", en: "Recall" })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line-2 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink">{violName(r.key, locale)}</td>
                  <td className="px-2 text-center tnum text-ink-2">{r.tp}</td>
                  <td className="px-2 text-center tnum text-muted">{r.fp}</td>
                  <td className="px-2 text-center tnum text-muted">{r.fn}</td>
                  <td className="px-3 py-2">
                    <MetricBar value={r.precision} color="var(--color-brand)" />
                  </td>
                  <td className="px-3 py-2">
                    <MetricBar value={r.recall} color="var(--color-brand-2)" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          {t({
            uk: "Точність — яка частка тривог справдилась (менше марних тривог). Повнота — яку частку реальних випадків система вловила (менше пропусків).",
            en: "Precision is the share of alerts that proved true (fewer false alarms). Recall is the share of real cases the system caught (fewer misses).",
          })}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-ok/20 bg-ok-soft/60 px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ok text-white">
            <IconCheck className="h-4 w-4" />
          </span>
          <p className="text-sm text-ok-ink">
            {t({ uk: "Загалом:", en: "Overall:" })} <span className="font-bold">{t({ uk: "точність", en: "precision" })} {o.precision.toFixed(2)}</span> ·{" "}
            <span className="font-bold">{t({ uk: "повнота", en: "recall" })} {o.recall.toFixed(2)}</span> ·{" "}
            <span className="font-bold">{t({ uk: "загальна якість", en: "overall quality" })} {o.f1.toFixed(2)}</span> — {t({ uk: "перевірено на", en: "verified on" })}{" "}
            {formatNumber(metrics.matching.true_children, locale)} {t({ uk: "синтетичних дітях із заздалегідь відомими порушеннями.", en: "synthetic children with violations known in advance." })}
          </p>
        </div>
      </Card>

      {/* збирання дитини з реєстрів */}
      <Card className="p-5 sm:p-6">
        <CardTitle icon={<IconLayers className="h-4 w-4 text-brand" />} hint={t({ uk: "як дитина збирається з реєстрів", en: "how a child is assembled from registries" })}>
          {t({ uk: "Збирання дитини з різних реєстрів", en: "Assembling a child from different registries" })}
        </CardTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label={t({ uk: "Профілів зібрано", en: "Profiles assembled" })} value={formatNumber(metrics.matching.entities, locale)} />
          <MiniStat
            label={t({ uk: "Зібрано в один профіль", en: "Merged into one profile" })}
            value={formatPct(metrics.matching.reconstruction_rate, 1)}
            tone="ok"
          />
          <MiniStat label={t({ uk: "Без помилок зіставлення", en: "Without matching errors" })} value={formatNumber(metrics.matching.pure_clusters, locale)} />
          <MiniStat label={t({ uk: "Знайдено за схожістю імені", en: "Found by name similarity" })} value={formatNumber(metrics.matching.fuzzy_attached, locale)} tone="brand" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {t({
            uk: "Якщо в дитини є єдиний номер запису (УНЗР) — записи зводяться точно. Якщо номера немає (немовлята, звернення на гарячі лінії) — система знаходить ту саму дитину за збігом імені та дати народження. Вона працює лише з даними реєстрів і ніколи не бачить «повної картини» згори.",
            en: "If a child has a single record number (UNZR), the records are merged precisely. If there is no number (newborns, hotline reports), the system finds the same child by a match of name and date of birth. It works only with registry data and never sees the «full picture» from above.",
          })}
        </p>
      </Card>
    </div>
  );
}

function MetricBar({ value, color }: Readonly<{ value: number; color: string }>) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="w-9 text-xs font-semibold tnum text-ink-2">{value.toFixed(2)}</span>
    </div>
  );
}
