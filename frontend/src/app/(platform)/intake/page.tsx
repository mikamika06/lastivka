import { getIntake } from "@/lib/api";
import { getT, pageTitle } from "@/lib/i18n.server";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/Stat";
import { IconPulse, IconShield } from "@/components/ui/icons";

export async function generateMetadata() {
  return { title: await pageTitle({ uk: "Інтейк звернень", en: "Reports intake" }) };
}

export default async function IntakePage() {
  const data = await getIntake();
  const t = await getT();
  const cases = data.cases ?? [];
  const corroborated = cases.filter((c) => c.corroborated).length;
  const unconfirmed = cases.filter((c) => c.malicious_suspected).length;
  const urgent = cases.filter((c) => c.urgent).length;

  return (
    <div className="space-y-6">
      <SectionHeading index="08" title={t({ uk: "Інтейк звернень", en: "Reports intake" })} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t({ uk: "Звернень отримано", en: "Reports received" })} value={data.n_reports} tone="neutral" />
        <KpiCard label={t({ uk: "Підтверджено крос-реєстрово", en: "Corroborated cross-registry" })} value={corroborated} tone="brand" />
        <KpiCard label={t({ uk: "Невідкладних (≤3 год)", en: "Immediate (≤3 h)" })} value={urgent} tone="t1" />
        <KpiCard label={t({ uk: "Анонімні без підтвердження", en: "Anonymous, unconfirmed" })} value={unconfirmed} tone="ok" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CardTitle icon={<IconPulse className="h-4 w-4 text-brand" />}>{t({ uk: "Канали звернень", en: "Report channels" })}</CardTitle>
          <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
            {Object.entries(data.channels).map(([code, label]) => (
              <li key={code}>
                • <strong className="text-ink-2">{code}</strong> — {t(label)}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardTitle icon={<IconShield className="h-4 w-4 text-brand" />}>{t({ uk: "Тріаж і строки реагування", en: "Triage and response deadlines" })}</CardTitle>
          <p className="text-sm leading-relaxed text-muted">
            {t({
              uk: "Реєстрація звернення — негайно; оцінка рівня безпеки — ≤1 доба (ПКМУ №585/2020); невідкладна загроза — ≤3 год (ПКМУ №1513/2025). Кейси ранжуються за дедлайном, крос-реєстровим підтвердженням і кількістю каналів.",
              en: "Report registration — immediately; safety-level assessment — ≤1 day (CMU Reg. No. 585/2020); immediate threat — ≤3 h (CMU Reg. No. 1513/2025). Cases are ranked by deadline, cross-registry corroboration and number of channels.",
            })}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
          {t({ uk: "Попередні кейси зі звернень", en: "Preliminary cases from reports" })} ({cases.length})
        </div>
        <div className="divide-y divide-line">
          {cases.slice(0, 40).map((c, i) => (
            <div key={`${c.child_pseudonym}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-sm">
              <span className="min-w-0 truncate font-mono text-xs text-faint">{c.child_pseudonym}</span>
              <span className="flex flex-wrap gap-1">
                {c.channels.map((ch) => (
                  <span key={ch} className="rounded-md border border-line bg-paper-2 px-1.5 py-0.5 text-xs font-medium text-ink-2">{ch}</span>
                ))}
              </span>
              {c.corroborated && (
                <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-semibold text-brand-ink">{t({ uk: "підтверджено", en: "corroborated" })}</span>
              )}
              {c.malicious_suspected && (
                <span className="rounded-md border border-line px-1.5 py-0.5 text-xs font-medium text-faint">{t({ uk: "без підтвердження", en: "unconfirmed" })}</span>
              )}
              {c.urgent && (
                <span className="rounded-md border border-brand-line bg-surface px-1.5 py-0.5 text-xs font-semibold text-brand">{t({ uk: "невідкладно", en: "immediate" })}</span>
              )}
              <span className="w-full text-xs text-muted sm:ml-auto sm:w-auto">{t(c.reaction_deadline)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
