import { getQueue } from "@/lib/api";
import { getSession } from "@/lib/session.server";
import { SectionHeading, Card } from "@/components/ui/Card";
import { violName } from "@/lib/registries";

export const metadata = { title: "Вхідні сигнали — Ластівка" };

// Домен кожної вертикалі: які порушення стосуються її компетенції (адресний сигнал).
const VERTICAL_DOMAIN: Record<string, string[]> = {
  EHEALTH: ["P1_physical_home", "F3_neglect", "W2_psych_trauma", "F6_sexual_abuse", "W8_medical_access"],
  EDEBO: ["W3_out_of_education", "F4_child_labor", "E1_bullying", "E4_inclusion"],
  ERDR: ["P1_physical_home", "F6_sexual_abuse", "W7_trafficking", "F1_psych_violence"],
};

export default async function InboxPage() {
  const [all, session] = await Promise.all([getQueue(), getSession()]);
  const reg = session?.vertical ?? "EHEALTH";
  const domain = VERTICAL_DOMAIN[reg] ?? VERTICAL_DOMAIN.EHEALTH;

  // адресні сигнали: лише ті, що стосуються власної вертикалі; без крос-реєстрового змісту
  const signals = all
    .filter((i) => i.violations.some((v) => domain.includes(v)))
    .slice(0, 30)
    .map((i) => ({
      ref: `СИГ-${String(i.entity_id).padStart(5, "0")}`,
      flags: i.violations.filter((v) => domain.includes(v)),
      tier: i.tier,
    }));

  return (
    <div className="space-y-6">
      <SectionHeading
        index="11"
        title="Вхідні сигнали вашої вертикалі"
        subtitle="Ви бачите лише власний реєстр і адресні сигнали у межах своєї компетенції. Крос-реєстрові дані інших вертикалей недоступні — вони надходять лише як адресне повідомлення, а не як перегляд."
      />
      <Card className="px-4 py-3 text-xs leading-relaxed text-muted">
        Це не браузер кейсів. Ваша роль — джерело й отримувач адресних сигналів: подати обовʼязкове
        повідомлення до служби у справах дітей та поліції за ознаками ризику та опрацювати зворотні запити
        у межах власної вертикалі.
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
          Адресні сигнали ({signals.length})
        </div>
        <div className="divide-y divide-line">
          {signals.map((s) => (
            <div key={s.ref} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="font-mono text-xs text-faint">{s.ref}</span>
              <span className="flex flex-wrap gap-1">
                {s.flags.map((v) => (
                  <span key={v} className="rounded-md border border-line bg-paper-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                    {violName(v)}
                  </span>
                ))}
              </span>
              <span className="ml-auto text-xs text-muted">передано до ССД та поліції</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
