import { getDashboardStats, getMetrics, getCrossBorder } from "@/lib/api";
import { violName, TIER_META, TIER_COLOR, CHART_PALETTE } from "@/lib/registries";
import { formatPct, formatNumber, pluralLoc } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n.server";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard, MiniStat } from "@/components/ui/Stat";
import { HBar } from "@/components/charts/HBar";
import { Donut } from "@/components/charts/Donut";
import { IconArrowRight, IconShield, IconGlobe } from "@/components/ui/icons";
import Link from "next/link";

export const metadata = { title: "Управлінська панель — Ластівка" };

export default async function DashboardPage() {
  const [stats, metrics, crossborder] = await Promise.all([
    getDashboardStats(),
    getMetrics(),
    getCrossBorder(),
  ]);
  const t = await getT();
  const locale = await getLocale();
  const o = metrics.detection.overall;

  const violData = stats.byViolation.map((v, i) => ({
    label: violName(v.key, locale),
    value: v.count,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  const regionData = stats.byRegion.map((r) => ({
    label: locale === "en" ? `${r.key} oblast` : `${r.key} обл.`,
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
        index="01"
        title={t({ uk: "Управлінська панель", en: "Management dashboard" })}
        subtitle={t({
          uk: "Загальна картина для керівника: масштаб, структура ризиків і наскільки точно працює система.",
          en: "The big picture for managers: scale, risk structure, and how accurately the system works.",
        })}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label={t({ uk: "Сьогодні · T0", en: "Today · T0" })}
          value={stats.kpis.t0}
          tone="t0"
          hint={t({ uk: "Реагувати негайно", en: "Respond immediately" })}
        />
        <KpiCard
          label={t({ uk: "Цей тиждень · T1", en: "This week · T1" })}
          value={stats.kpis.t1}
          tone="t1"
          hint={t({ uk: "Запланувати втручання", en: "Plan intervention" })}
        />
        <KpiCard
          label={t({ uk: "Спостереження · T2", en: "Watch · T2" })}
          value={stats.kpis.t2}
          tone="t2"
          hint={t({ uk: "Тримати в полі зору", en: "Keep monitoring" })}
        />
        <KpiCard
          label={t({ uk: "Негайні", en: "Immediate" })}
          value={stats.kpis.immediate}
          tone="t0"
          hint={t({ uk: "Торгівля, депортація, насильство", en: "Trafficking, deportation, violence" })}
        />
      </div>

      {/* charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardTitle hint={t({ uk: "кількість дітей", en: "number of children" })}>
            {t({ uk: "Розподіл за типами порушень", en: "Distribution by violation type" })}
          </CardTitle>
          <HBar data={violData} />
        </Card>
        <Card className="p-5">
          <CardTitle hint={t({ uk: "за терміновістю", en: "by urgency" })}>
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
          <CardTitle hint={t({ uk: "топ-10", en: "top 10" })}>
            {t({ uk: "Географія сигналів за регіонами", en: "Signal geography by region" })}
          </CardTitle>
          <HBar data={regionData} />
        </Card>

        <Card className="p-5">
          <CardTitle
            icon={<IconShield className="h-4 w-4 text-brand" />}
            hint={t({ uk: "заздалегідь відомі випадки", en: "known cases" })}
          >
            {t({ uk: "Якість моделі", en: "Model quality" })}
          </CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label={t({ uk: "Точність", en: "Precision" })} value={o.precision.toFixed(2)} tone="brand" />
            <MiniStat label={t({ uk: "Повнота", en: "Recall" })} value={o.recall.toFixed(2)} tone="brand" />
            <MiniStat
              label={t({ uk: "Загальна якість (F1)", en: "Overall quality (F1)" })}
              value={o.f1.toFixed(2)}
              tone="brand"
            />
            <MiniStat
              label={t({ uk: "Зіставлення", en: "Matching" })}
              value={formatPct(metrics.matching.reconstruction_rate)}
              tone="ok"
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {t({
              uk: "Показники як підтвердження довіри: точність і повнота виміряні на заздалегідь відомих порушеннях, які навмисно додали для перевірки.",
              en: "Metrics as proof of trust: precision and recall are measured on known violations that were deliberately added for validation.",
            })}
          </p>
          <Link
            href="/privacy"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            {t({ uk: "Деталі приватності та якості", en: "Privacy and quality details" })}
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      {/* крос-кордон UA↔EE (фаза 4) */}
      {crossborder.ee_entities > 0 && (
        <Card className="overflow-hidden border-brand/30">
          <div className="flex items-center gap-2 border-b border-line bg-brand-soft/40 px-5 py-3">
            <span aria-hidden className="text-base">🇺🇦↔🇪🇪</span>
            <h3 className="font-display text-sm font-bold text-ink">
              {t({ uk: "Крос-кордон: діти між Україною та Естонією", en: "Cross-border: children between Ukraine and Estonia" })}
            </h3>
          </div>
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              label={t({ uk: "Видно естонським реєстрам", en: "Seen by Estonian registries" })}
              value={formatNumber(crossborder.ee_entities, locale)}
              tone="brand"
            />
            <MiniStat
              label={t({ uk: "Звʼязано з профілем в Україні", en: "Linked to a Ukrainian profile" })}
              value={formatNumber(crossborder.linked, locale)}
              tone="ok"
            />
            <MiniStat
              label={t({ uk: "У щілині — пари не знайдено", en: "In the gap — no match found" })}
              value={formatNumber(crossborder.ee_unmatched, locale)}
              tone="t1"
            />
            <MiniStat
              label={t({ uk: "Частка звʼязування", en: "Link rate" })}
              value={formatPct(crossborder.link_rate)}
              tone="brand"
            />
          </div>
          <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-xs leading-relaxed text-muted">
            <IconGlobe className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>
              {t({
                uk: "Дитина, що переїхала до Естонії, не зникає з поля зору: приватне зіставлення (PPRL) звʼязує її профілі без обміну іменами — між країнами передається лише сигнал збігу. 30 дітей поки «у щілині»: вони є в Естонії, але пари в Україні не знайдено.",
                en: "A child who moved to Estonia does not drop off the radar: privacy-preserving matching (PPRL) links their profiles without exchanging names — only the match signal crosses borders. 30 children are still “in the gap”: present in Estonia, but no Ukrainian match found.",
              })}
            </span>
          </p>
        </Card>
      )}

      <p className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted">
        <span className="font-medium text-ink-2">
          {t({ uk: "Підтримка рішень, не вирок.", en: "Decision support, not a verdict." })}
        </span>{" "}
        {t({
          uk: "Система розставляє пріоритети й пояснює кожне рішення; остаточне рішення щодо дитини ухвалює відповідальний спеціаліст.",
          en: "The system prioritises and explains every decision; the final decision about a child is made by the responsible specialist.",
        })}
      </p>
    </div>
  );
}
