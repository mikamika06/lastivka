import { getQueue } from "@/lib/api";
import { getT, getLocale, pageTitle } from "@/lib/i18n.server";
import { getSession } from "@/lib/session.server";
import { SectionHeading, Card } from "@/components/ui/Card";
import { violName } from "@/lib/registries";

export async function generateMetadata() {
  return { title: await pageTitle({ uk: "Вхідні сигнали", en: "Incoming signals" }) };
}

// Домен кожної вертикалі: які порушення стосуються її компетенції (адресний сигнал).
const VERTICAL_DOMAIN: Record<string, string[]> = {
  EHEALTH: ["P1_physical_home", "F3_neglect", "W2_psych_trauma", "F6_sexual_abuse", "W8_medical_access"],
  EDEBO: ["W3_out_of_education", "F4_child_labor", "E1_bullying", "E4_inclusion"],
  ERDR: ["P1_physical_home", "F6_sexual_abuse", "W7_trafficking", "F1_psych_violence"],
};

export default async function InboxPage() {
  const [all, session, t, locale] = await Promise.all([getQueue(), getSession(), getT(), getLocale()]);
  const reg = session?.vertical ?? "EHEALTH";
  const domain = VERTICAL_DOMAIN[reg] ?? VERTICAL_DOMAIN.EHEALTH;

  // адресні сигнали: лише ті, що стосуються власної вертикалі; без крос-реєстрового змісту
  const signals = all
    .filter((i) => i.violations.some((v) => domain.includes(v)))
    .slice(0, 30)
    .map((i) => ({
      ref: `${locale === "en" ? "SIG" : "СИГ"}-${String(i.entity_id).padStart(5, "0")}`,
      flags: i.violations.filter((v) => domain.includes(v)),
      tier: i.tier,
    }));

  return (
    <div className="space-y-6">
      <SectionHeading index="11" title={t({ uk: "Вхідні сигнали вашої вертикалі", en: "Incoming signals for your vertical" })} />
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
          {t({ uk: "Адресні сигнали", en: "Targeted signals" })} ({signals.length})
        </div>
        <div className="divide-y divide-line">
          {signals.map((s) => (
            <div key={s.ref} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-sm">
              <span className="min-w-0 truncate font-mono text-xs text-faint">{s.ref}</span>
              <span className="flex min-w-0 flex-wrap gap-1">
                {s.flags.map((v) => (
                  <span key={v} className="rounded-md border border-line bg-paper-2 px-1.5 py-0.5 text-xs font-medium text-ink-2">
                    {violName(v, locale)}
                  </span>
                ))}
              </span>
              <span className="w-full text-xs text-muted sm:ml-auto sm:w-auto">{t({ uk: "передано до ССД та поліції", en: "referred to SSD and police" })}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
