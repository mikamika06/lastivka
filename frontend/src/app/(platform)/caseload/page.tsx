import { getCaseload } from "@/lib/api";
import { formatNumber, formatPct } from "@/lib/format";
import type { Tier } from "@/lib/types";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/Stat";
import { TierBadge } from "@/components/ui/badges";
import { IconScale } from "@/components/ui/icons";

export const metadata = { title: "Навантаження по службах — Ластівка" };

export default async function CaseloadPage() {
  const cl = await getCaseload();

  if (!cl) {
    return (
      <div className="space-y-6">
        <SectionHeading index="05" title="Навантаження по службах" />
        <div className="card grid place-items-center py-16 text-sm text-muted">Дані недоступні.</div>
      </div>
    );
  }

  const s = cl.summary;

  return (
    <div className="space-y-6">
      <SectionHeading
        index="05"
        title="Навантаження по службах"
        subtitle="Розподіл черги по кейсворкерах ССД: територіальна маршрутизація + ємність за нормативом. Де перелив понад ємність — бракує штатних одиниць."
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="font-medium text-ink">{formatNumber(cl.total_caseworkers)} кейсворкерів</span>
        <span className="text-faint">·</span>
        <span>норматив ємності — {cl.capacity_per_worker} активних сімей на фахівця</span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Кейсів усього" value={s.total_cases} tone="neutral" />
        <KpiCard label="Призначено" value={s.assigned} tone="brand" hint="у межах ємності" />
        <KpiCard label="Перелив" value={s.overflow} tone="t1" hint="понад ємність" />
        <KpiCard label="Невкрите T0/T1" value={s.urgent_uncovered} tone="t0" hint="термінові без фахівця" />
        <KpiCard label="Бракує працівників" value={s.extra_workers_needed} tone="t0" hint="щоб покрити перелив" />
      </div>

      {/* дедлайни */}
      <Card className="p-5 sm:p-6">
        <CardTitle hint="законодавчі строки реагування">Дедлайни за рівнем</CardTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {(["T0", "T1", "T2"] as Tier[]).map((t) => (
            <div key={t} className="rounded-xl border border-line bg-paper/40 p-4">
              <div className="flex items-center justify-between">
                <TierBadge tier={t} withHorizon={false} />
                <span className="font-display text-sm font-bold text-ink">{cl.deadlines[t]?.label}</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{cl.deadlines[t]?.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* таблиця областей */}
      <Card className="p-5 sm:p-6">
        <CardTitle icon={<IconScale className="h-4 w-4 text-brand" />} hint="сортування за напругою">
          Напруга по областях
        </CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3 font-medium">Область</th>
                <th className="px-2 py-2 text-center font-medium">Фахівці</th>
                <th className="px-2 py-2 text-center font-medium">Кейси</th>
                <th className="px-2 py-2 text-center font-medium">T0</th>
                <th className="px-2 py-2 text-center font-medium">T1</th>
                <th className="px-2 py-2 text-center font-medium">T2</th>
                <th className="px-3 py-2 font-medium">Завантаження</th>
                <th className="px-2 py-2 text-center font-medium">Перелив</th>
                <th className="px-2 py-2 text-center font-medium">Бракує</th>
              </tr>
            </thead>
            <tbody>
              {cl.oblast_stats.map((o) => (
                <tr key={o.oblast} className="border-b border-line-2 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink">
                    {o.oblast}
                    {o.urgent_uncovered > 0 && (
                      <span className="ml-2 rounded bg-t0-soft px-1.5 py-0.5 text-[10px] font-semibold text-t0-ink">
                        {o.urgent_uncovered} терм. без фахівця
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
        <p className="mt-4 text-xs leading-relaxed text-muted">
          «Завантаження» = частка зайнятої ємності служби. Понад 100% кейси переливаються на район/область
          і генерують сигнал «потрібні штатні одиниці». Маршрутизація — за місцем проживання дитини.
        </p>
      </Card>
    </div>
  );
}

function utilColor(value: number): string {
  if (value >= 1) return "var(--color-t0)";
  if (value >= 0.85) return "var(--color-t1)";
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
