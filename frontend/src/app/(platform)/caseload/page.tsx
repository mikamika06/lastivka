import { getCaseload, oblastName } from "@/lib/api";
import { formatNumber, formatPct } from "@/lib/format";
import { getT, getLocale, pageTitle } from "@/lib/i18n.server";
import { getSession } from "@/lib/session.server";
import { TIER_DEADLINE_MSG } from "@/lib/registries";
import type { Tier } from "@/lib/types";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/Stat";
import { TierBadge } from "@/components/ui/badges";
import { IconScale } from "@/components/ui/icons";

export async function generateMetadata() {
  return { title: await pageTitle({ uk: "Навантаження по службах", en: "Service caseload" }) };
}

export default async function CaseloadPage() {
  const session = await getSession();
  const cl = await getCaseload(session);
  const t = await getT();
  const locale = await getLocale();

  if (!cl) {
    return (
      <div className="space-y-6">
        <SectionHeading index="05" title={t({ uk: "Навантаження по службах", en: "Service caseload" })} />
        <div className="card grid place-items-center py-16 text-sm text-muted">
          {t({ uk: "Дані недоступні.", en: "Data unavailable." })}
        </div>
      </div>
    );
  }

  const s = cl.summary;

  return (
    <div className="space-y-6">
      <SectionHeading
        index="05"
        title={t({ uk: "Навантаження по службах", en: "Service caseload" })}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="font-medium text-ink">
          {t({
            uk: `${formatNumber(cl.total_caseworkers, locale)} фахівців`,
            en: `${formatNumber(cl.total_caseworkers, locale)} specialists`,
          })}
        </span>
        <span className="text-faint">·</span>
        <span>
          {t({
            uk: `норматив ємності — ${cl.capacity_per_worker} активних сімей на фахівця`,
            en: `capacity standard — ${cl.capacity_per_worker} active families per specialist`,
          })}
        </span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label={t({ uk: "Дітей у черзі", en: "Children in queue" })} value={s.total_cases} tone="neutral" />
        <KpiCard label={t({ uk: "Призначено", en: "Assigned" })} value={s.assigned} tone="brand" />
        <KpiCard label={t({ uk: "Понад ємність", en: "Over capacity" })} value={s.overflow} tone="t1" />
        <KpiCard label={t({ uk: "Термінові без фахівця", en: "Urgent, unstaffed" })} value={s.urgent_uncovered} tone="t0" />
        <KpiCard label={t({ uk: "Бракує працівників", en: "Specialists short" })} value={s.extra_workers_needed} tone="t0" />
      </div>

      {/* дедлайни */}
      <Card className="p-5 sm:p-6">
        <CardTitle>
          {t({ uk: "Дедлайни за рівнем", en: "Deadlines by tier" })}
        </CardTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {(["T0", "T1", "T2"] as Tier[]).map((tier) => (
            <div key={tier} className="rounded-xl border border-line bg-paper/40 p-4">
              <div className="flex items-center justify-between">
                <TierBadge tier={tier} withHorizon={false} />
                <span className="font-display text-sm font-bold text-ink">{t(TIER_DEADLINE_MSG[tier].label)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* таблиця областей */}
      <Card className="p-5 sm:p-6">
        <CardTitle icon={<IconScale className="h-4 w-4 text-brand" />}>
          {t({ uk: "Напруга по областях", en: "Strain by oblast" })}
        </CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3 font-medium">{t({ uk: "Область", en: "Oblast" })}</th>
                <th className="px-2 py-2 text-center font-medium">{t({ uk: "Фахівці", en: "Specialists" })}</th>
                <th className="px-2 py-2 text-center font-medium">{t({ uk: "Діти", en: "Children" })}</th>
                <th className="px-2 py-2 text-center font-medium">T0</th>
                <th className="px-2 py-2 text-center font-medium">T1</th>
                <th className="px-2 py-2 text-center font-medium">T2</th>
                <th className="px-3 py-2 font-medium">{t({ uk: "Завантаження", en: "Utilisation" })}</th>
                <th className="px-2 py-2 text-center font-medium">{t({ uk: "Понад ємність", en: "Over capacity" })}</th>
                <th className="px-2 py-2 text-center font-medium">{t({ uk: "Бракує", en: "Short" })}</th>
              </tr>
            </thead>
            <tbody>
              {cl.oblast_stats.map((o) => (
                <tr key={o.oblast} className="border-b border-line-2 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink">
                    {oblastName(o.oblast, locale)}
                    {o.urgent_uncovered > 0 && (
                      <span className="ml-2 rounded bg-t0-soft px-1.5 py-0.5 text-xs font-semibold text-t0-ink">
                        {t({
                          uk: `${o.urgent_uncovered} терм. без фахівця`,
                          en: `${o.urgent_uncovered} urgent, unstaffed`,
                        })}
                      </span>
                    )}
                  </td>
                  <td className="px-2 text-center tnum text-ink-2">{o.workers}</td>
                  <td className="px-2 text-center tnum font-semibold text-ink">{o.cases}</td>
                  <td className="px-2 text-center tnum text-t0-ink">{o.t0 || "—"}</td>
                  <td className="px-2 text-center tnum text-t1-ink">{o.t1 || "—"}</td>
                  <td className="px-2 text-center tnum text-muted">{o.t2 || "—"}</td>
                  <td className="px-3 py-2">
                    <UtilBar value={o.utilization} />
                  </td>
                  <td className={`px-2 text-center tnum font-semibold ${o.overflow > 0 ? "text-t1-ink" : "text-faint"}`}>
                    {o.overflow || "—"}
                  </td>
                  <td className={`px-2 text-center tnum font-semibold ${o.extra_workers_needed > 0 ? "text-t0-ink" : "text-faint"}`}>
                    {o.extra_workers_needed ? `+${o.extra_workers_needed}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function utilColor(value: number): string {
  if (value > 1) return "var(--color-t0)"; // перевантаження (перелив)
  if (value >= 0.85) return "var(--color-t1)"; // близько до межі
  return "var(--color-brand)";
}

function UtilBar({ value }: Readonly<{ value: number }>) {
  const pct = Math.round(value * 100);
  const color = utilColor(value);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-xs font-semibold tnum text-ink-2">{formatPct(value)}</span>
    </div>
  );
}
