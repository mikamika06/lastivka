import { getIntake } from "@/lib/api";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/Stat";
import { IconPulse, IconShield } from "@/components/ui/icons";

export const metadata = { title: "Інтейк (передні двері) — Ластівка" };

export default async function IntakePage() {
  const data = await getIntake();
  const cases = data.cases ?? [];
  const corroborated = cases.filter((c) => c.corroborated).length;
  const malicious = cases.filter((c) => c.malicious_suspected).length;
  const urgent = cases.filter((c) => c.urgent).length;

  return (
    <div className="space-y-6">
      <SectionHeading
        index="08"
        title="Інтейк — передні двері системи"
        subtitle="У реальній практиці служби кейси заходять переважно через ПОВІДОМЛЕННЯ: гаряча лінія, сусіди, школа. Повідомлення відкриває попередній кейс, а крос-реєстрова перевірка працює як тріаж і корроборація — пріоритезувати, дедуплікувати, відсіяти «помсту-сусіда». Повідомлення НЕ тягне eHealth/ЄРДР — стіни тримаються."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Звернень отримано" value={data.n_reports} tone="neutral" />
        <KpiCard label="Підтверджено крос-реєстрово" value={corroborated} tone="brand" hint="≥2 кластери / ≥2 канали" />
        <KpiCard label="Невідкладних (≤3 год)" value={urgent} tone="t1" hint="ПКМУ №1513/2025" />
        <KpiCard label="«Помста-сусід» (відсіяно)" value={malicious} tone="ok" hint="анонімне без підтвердження" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CardTitle icon={<IconPulse className="h-4 w-4 text-brand" />}>Канали звернень</CardTitle>
          <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
            {Object.entries(data.channels).map(([code, label]) => (
              <li key={code}>
                • <strong className="text-ink-2">{code}</strong> — {label}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardTitle icon={<IconShield className="h-4 w-4 text-brand" />}>Тріаж і строки реагування</CardTitle>
          <p className="text-sm leading-relaxed text-muted">
            Реєстрація звернення — <strong className="text-ink-2">негайно</strong>; оцінка рівня безпеки —
            <strong className="text-ink-2"> ≤1 доба</strong> (ПКМУ №585/2020); невідкладна загроза —
            <strong className="text-ink-2"> ≤3 год</strong> (ПКМУ №1513/2025). Кейси ранжуються за дедлайном,
            підтвердженням крос-реєстрово та кількістю каналів. Анонімне одиничне звернення без жодного
            крос-реєстрового сигналу позначається як ймовірна «помста-сусід» і НЕ ескалюється у чергу.
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
          Попередні кейси зі звернень ({cases.length})
        </div>
        <div className="divide-y divide-line">
          {cases.slice(0, 40).map((c, i) => (
            <div key={`${c.child_pseudonym}-${i}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="font-mono text-xs text-faint">{c.child_pseudonym}</span>
              <span className="flex gap-1">
                {c.channels.map((ch) => (
                  <span key={ch} className="rounded-md border border-line bg-paper-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{ch}</span>
                ))}
              </span>
              {c.corroborated && (
                <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand-ink">підтверджено</span>
              )}
              {c.malicious_suspected && (
                <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-faint">ймовірна помста</span>
              )}
              {c.urgent && (
                <span className="rounded-md border border-brand-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-brand">невідкладно</span>
              )}
              <span className="ml-auto text-xs text-muted">{c.reaction_deadline}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
