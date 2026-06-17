import { getMetrics } from "@/lib/api";
import { violName } from "@/lib/registries";
import { formatNumber, formatPct } from "@/lib/format";
import { Card, CardTitle, SectionHeading, Pill } from "@/components/ui/Card";
import { MiniStat } from "@/components/ui/Stat";
import { LockIcon } from "@/components/ui/badges";
import { IconShield, IconCheck, IconLayers } from "@/components/ui/icons";

export const metadata = { title: "Приватність і якість моделі — Ластівка" };

export default async function PrivacyPage() {
  const metrics = await getMetrics();
  const o = metrics.detection.overall;
  const rows = Object.entries(metrics.detection.per_violation)
    .map(([k, m]) => ({ key: k, ...m }))
    .sort((a, b) => b.precision - a.precision);

  return (
    <div className="space-y-6">
      <SectionHeading
        index="02"
        title="Приватність і якість моделі"
        subtitle="Знак довіри: матчинг по зашифрованих відбитках без plaintext + прозора валідація на ground truth."
      />

      {/* PPRL */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <CardTitle icon={<LockIcon className="h-4 w-4 text-lock" />}>
              Privacy-preserving матчинг (PPRL)
            </CardTitle>
            <p className="text-sm leading-relaxed text-ink-2">
              Реєстри зіставляються по <span className="font-semibold text-ink">зашифрованих Bloom-відбитках</span>{" "}
              (Bloom-filter / Dice) — ПІБ та УНЗР не розкриваються. Це fuzzy-матчинг: витримує
              транслітераційний шум, на якому ламається точний збіг.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="brand">Bloom-filter record linkage</Pill>
              <Pill tone="brand">Dice similarity</Pill>
              <Pill tone="neutral">без plaintext</Pill>
            </div>
            <div className="mt-5 rounded-xl border border-lock/20 bg-lock-soft/60 p-4">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-lock-ink">
                <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Дані <span className="font-semibold">Рівня 1</span> (ЄРДР, психіатрія) входять у
                  скоринг лише як <span className="font-semibold">PSI-булеан</span> «сигнал є» — без
                  розкриття вмісту. Повний доступ — за ухвалою суду. Єдиний юридично чистий спосіб
                  (медтаємниця).
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MiniStat label="Пар перевірено" value={formatNumber(metrics.privacy.n_pairs)} tone="neutral" />
            <MiniStat
              label="Precision (без plaintext)"
              value={metrics.privacy.precision.toFixed(2)}
              tone="ok"
            />
            <MiniStat label="Recall" value={metrics.privacy.recall.toFixed(2)} tone="brand" />
          </div>
        </div>
      </Card>

      {/* якість виявлення */}
      <Card className="p-5 sm:p-6">
        <CardTitle
          icon={<IconShield className="h-4 w-4 text-brand" />}
          hint="precision / recall vs синтетичний ground truth"
        >
          Якість виявлення за типами порушень
        </CardTitle>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3 font-medium">Порушення</th>
                <th className="px-2 py-2 text-center font-medium">TP</th>
                <th className="px-2 py-2 text-center font-medium">FP</th>
                <th className="px-2 py-2 text-center font-medium">FN</th>
                <th className="px-3 py-2 font-medium">Precision</th>
                <th className="px-3 py-2 font-medium">Recall</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line-2 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink">{violName(r.key)}</td>
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

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-ok/20 bg-ok-soft/60 px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ok text-white">
            <IconCheck className="h-4 w-4" />
          </span>
          <p className="text-sm text-ok-ink">
            Загалом: <span className="font-bold">precision {o.precision.toFixed(2)}</span> ·{" "}
            <span className="font-bold">recall {o.recall.toFixed(2)}</span> ·{" "}
            <span className="font-bold">F1 {o.f1.toFixed(2)}</span> — валідовано на{" "}
            {formatNumber(metrics.matching.true_children)} синтетичних дітях із підсадженими порушеннями.
          </p>
        </div>
      </Card>

      {/* матчинг */}
      <Card className="p-5 sm:p-6">
        <CardTitle icon={<IconLayers className="h-4 w-4 text-brand" />} hint="відновлення дитини з силосів">
          Матчинг
        </CardTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Сутностей" value={formatNumber(metrics.matching.entities)} />
          <MiniStat
            label="Зібрано в 1"
            value={formatPct(metrics.matching.reconstruction_rate, 1)}
            tone="ok"
          />
          <MiniStat label="Чистих кластерів" value={formatNumber(metrics.matching.pure_clusters)} />
          <MiniStat label="Fuzzy-приєднано" value={formatNumber(metrics.matching.fuzzy_attached)} tone="brand" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Точний union по УНЗР + fuzzy по ПІБ+дата для записів без УНЗР (частина дітей без
          РНОКПП/УНЗР: хаос, гарячі лінії). Матчинг читає лише реєстри, не god-view.
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
