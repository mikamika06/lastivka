import { getDashboardStats, getMetrics, oblastLabel, oblastName } from "@/lib/api";
import { violName, TIER_HORIZON, TIER_COLOR, chartScale } from "@/lib/registries";
import { formatPct, formatNumber, pluralLoc } from "@/lib/format";
import { getT, getLocale, pageTitle } from "@/lib/i18n.server";
import { getSession } from "@/lib/session.server";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard, MiniStat } from "@/components/ui/Stat";
import { HBar } from "@/components/charts/HBar";
import { Donut } from "@/components/charts/Donut";
import { IconArrowRight, IconShield } from "@/components/ui/icons";
import Link from "next/link";

export async function generateMetadata() {
  return { title: await pageTitle({ uk: "Управлінська панель", en: "Management dashboard" }) };
}

export default async function DashboardPage() {
  const session = await getSession();
  const [stats, metrics] = await Promise.all([getDashboardStats(session), getMetrics()]);
  const t = await getT();
  const locale = await getLocale();

  const violColors = chartScale(stats.byViolation.length);
  const violData = stats.byViolation.map((v, i) => ({
    label: violName(v.key, locale),
    value: v.count,
    color: violColors[i],
  }));

  // Коли скоуп звужено до області (регіонал/ССД) — географія по громадах, інакше по областях.
  const geoStats = stats.scopedToOblast ? stats.byCommunity : stats.byRegion;
  const geoData = geoStats.map((r) => ({
    label: stats.scopedToOblast ? communityLabel(r.key, locale) : oblastLabel(r.key, locale),
    value: r.count,
    color: "var(--color-brand-2)",
  }));
  const scopeOblast = session?.oblast ? oblastName(session.oblast, locale) : null;

  const tierData = stats.byTier.map((row) => ({
    label: `${row.tier} · ${t(TIER_HORIZON[row.tier])}`,
    value: row.count,
    color: TIER_COLOR[row.tier],
  }));

  return (
    <div className="space-y-6">
      <SectionHeading
        index="01"
        title={t({ uk: "Управлінська панель", en: "Management dashboard" })}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {scopeOblast && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-surface px-2.5 py-1 text-xs font-semibold text-brand">
              <IconShield className="h-3.5 w-3.5" />
              {t({ uk: `${scopeOblast} область`, en: `${scopeOblast} oblast` })}
            </span>
            <span className="text-faint">·</span>
          </>
        )}
        <span className="font-medium text-ink">
          {pluralLoc(
            stats.kpis.total,
            { uk: ["сигнал", "сигнали", "сигналів"], en: ["signal", "signals"] },
            locale,
          )}{" "}
          {t({ uk: "у черзі", en: "in queue" })}
        </span>
        <span className="text-faint">·</span>
        <span>
          {formatNumber(metrics.matching.true_children, locale)}{" "}
          {t({ uk: "дітей у реєстрах · зіставлення зібрало", en: "children in registries · matching recovered" })}{" "}
          {formatPct(metrics.matching.reconstruction_rate, 0)}
        </span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <KpiCard label={t({ uk: "Сьогодні · T0", en: "Today · T0" })} value={stats.kpis.t0} tone="t0" />
        <KpiCard label={t({ uk: "Цей тиждень · T1", en: "This week · T1" })} value={stats.kpis.t1} tone="t1" />
        <KpiCard label={t({ uk: "Спостереження · T2", en: "Watch · T2" })} value={stats.kpis.t2} tone="t2" />
        <KpiCard label={t({ uk: "Негайні", en: "Immediate" })} value={stats.kpis.immediate} tone="t0" />
      </div>

      {/* charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardTitle>
            {t({ uk: "Розподіл за типами порушень", en: "Distribution by violation type" })}
          </CardTitle>
          <HBar data={violData} />
        </Card>
        <Card className="p-5">
          <CardTitle>
            {t({ uk: "Рівні черги", en: "Queue tiers" })}
          </CardTitle>
          <div className="pt-2">
            <Donut segments={tierData} centerLabel={t({ uk: "у черзі", en: "in queue" })} />
          </div>
        </Card>
      </div>

      {/* charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardTitle>
            {stats.scopedToOblast
              ? t({ uk: "Географія сигналів за громадами", en: "Signal geography by community" })
              : t({ uk: "Географія сигналів за регіонами", en: "Signal geography by region" })}
          </CardTitle>
          <HBar data={geoData} />
        </Card>

        <Card className="p-5">
          <CardTitle icon={<IconShield className="h-4 w-4 text-brand" />}>
            {t({ uk: "Повнота зібраних даних", en: "Data completeness" })}
          </CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat
              label={t({ uk: "Профілів зібрано", en: "Profiles assembled" })}
              value={formatNumber(metrics.matching.entities, locale)}
              tone="neutral"
            />
            <MiniStat
              label={t({ uk: "Зібрано в один профіль", en: "Merged into one profile" })}
              value={formatPct(metrics.matching.reconstruction_rate)}
              tone="ok"
            />
          </div>
          <Link
            href="/privacy"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            {t({ uk: "Деталі приватності та якості", en: "Privacy and quality details" })}
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>
    </div>
  );
}

/** worker_id «Харківська-3» → «Громада 3» / «Community 3» (без розкриття назви області). */
function communityLabel(workerId: string, locale: "uk" | "en"): string {
  const n = workerId.split("-").pop() ?? workerId;
  return locale === "en" ? `Community ${n}` : `Громада ${n}`;
}
