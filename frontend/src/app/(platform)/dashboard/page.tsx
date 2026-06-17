import { getDashboardStats, getMetrics } from "@/lib/api";
import { violName, TIER_META, TIER_COLOR, CHART_PALETTE } from "@/lib/registries";
import { formatPct, formatNumber, plural } from "@/lib/format";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard, MiniStat } from "@/components/ui/Stat";
import { HBar } from "@/components/charts/HBar";
import { Donut } from "@/components/charts/Donut";
import { IconArrowRight, IconShield } from "@/components/ui/icons";
import Link from "next/link";

export const metadata = { title: "Управлінська панель — Ластівка" };

export default async function DashboardPage() {
  const [stats, metrics] = await Promise.all([getDashboardStats(), getMetrics()]);
  const o = metrics.detection.overall;

  const violData = stats.byViolation.map((v, i) => ({
    label: violName(v.key),
    value: v.count,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  const regionData = stats.byRegion.map((r) => ({
    label: `${r.key} обл.`,
    value: r.count,
    color: "var(--color-brand-2)",
  }));

  const tierData = stats.byTier.map((t) => ({
    label: `${t.tier} · ${TIER_META[t.tier].horizon}`,
    value: t.count,
    color: TIER_COLOR[t.tier],
  }));

  return (
    <div className="space-y-6">
      <SectionHeading
        index="04"
        title="Управлінська панель"
        subtitle="Загальна картина для керівника: масштаб, структура ризиків і знак довіри до моделі."
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="font-medium text-ink">
          {plural(stats.kpis.total, "сигнал", "сигнали", "сигналів")} у черзі
        </span>
        <span className="text-faint">·</span>
        <span>
          {formatNumber(metrics.matching.true_children)} дітей у реєстрах · матчинг зібрав{" "}
          {formatPct(metrics.matching.reconstruction_rate, 0)}
        </span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Сьогодні · T0" value={stats.kpis.t0} tone="t0" hint="Реагувати негайно" />
        <KpiCard label="Цей тиждень · T1" value={stats.kpis.t1} tone="t1" hint="Запланувати втручання" />
        <KpiCard label="Спостереження · T2" value={stats.kpis.t2} tone="t2" hint="Тримати в полі зору" />
        <KpiCard
          label="Негайні [immediate]"
          value={stats.kpis.immediate}
          tone="t0"
          hint="Торгівля, депортація, насильство"
        />
      </div>

      {/* charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardTitle hint="кількість кейсів">Розподіл за типами порушень</CardTitle>
          <HBar data={violData} />
        </Card>
        <Card className="p-5">
          <CardTitle hint="за терміновістю">Рівні черги</CardTitle>
          <div className="pt-2">
            <Donut segments={tierData} centerLabel="у черзі" />
          </div>
        </Card>
      </div>

      {/* charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardTitle hint="топ-10">Географія сигналів за регіонами</CardTitle>
          <HBar data={regionData} />
        </Card>

        <Card className="p-5">
          <CardTitle icon={<IconShield className="h-4 w-4 text-brand" />} hint="ground truth">
            Якість моделі
          </CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Precision" value={o.precision.toFixed(2)} tone="brand" />
            <MiniStat label="Recall" value={o.recall.toFixed(2)} tone="brand" />
            <MiniStat label="F1" value={o.f1.toFixed(2)} tone="brand" />
            <MiniStat label="Матчинг" value={formatPct(metrics.matching.reconstruction_rate)} tone="ok" />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Метрики як «знак довіри»: precision/recall виміряні на синтетичному ground truth із
            підсадженими порушеннями.
          </p>
          <Link
            href="/privacy"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Деталі приватності та якості
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      <p className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted">
        <span className="font-medium text-ink-2">Decision support, не decision making.</span>{" "}
        Система пріоритезує й пояснює; остаточне рішення щодо дитини ухвалює відповідальний
        спеціаліст.
      </p>
    </div>
  );
}
