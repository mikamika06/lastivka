import { getCrossBorder, getCrossBorderCases } from "@/lib/api";
import { getScope } from "@/lib/auth.server";
import { formatPct } from "@/lib/format";
import { getT } from "@/lib/i18n.server";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/Stat";
import { IconGlobe, IconShield } from "@/components/ui/icons";
import { CrossBorderExplorer } from "@/components/crossborder/CrossBorderExplorer";

export const metadata = { title: "Cross-border UA↔EE — Lastivka" };

export default async function CrossBorderPage() {
  const scope = await getScope();
  const [cb, cases, t] = await Promise.all([getCrossBorder(), getCrossBorderCases(scope), getT()]);

  return (
    <div className="space-y-6">
      <SectionHeading
        index="07"
        title={t({ uk: "Крос-кордон Україна ↔ Естонія", en: "Cross-border Ukraine ↔ Estonia" })}
        subtitle={t({
          uk: "Дитина, що перетнула кордон, випадає з української системи раніше, ніж потрапляє в естонську. Спільного ідентифікатора немає (УНЗР ≠ isikukood), тож звʼязок — privacy-preserving: кордон перетинає лише зашифрований відбиток (PPRL), не персональні дані.",
          en: "A child who crosses the border drops out of the Ukrainian system before entering the Estonian one. There is no shared identifier (UNZR ≠ isikukood), so the linkage is privacy-preserving: only an encrypted fingerprint (PPRL) crosses the border, not personal data.",
        })}
      />

      {/* KPI крос-кордонного звʼязку */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t({ uk: "Дітей у реєстрах Естонії", en: "Children in Estonian registries" })} value={cb.ee_entities} tone="neutral" />
        <KpiCard label={t({ uk: "Звʼязано з Україною", en: "Linked to Ukraine" })} value={cb.linked} tone="brand" hint="PPRL Bloom-filter" />
        <KpiCard label={t({ uk: "Не знайдено пари", en: "No match found" })} value={cb.ee_unmatched} tone="t1" hint={t({ uk: "транслітерація / щілина", en: "transliteration / gap" })} />
        <KpiCard label={t({ uk: "Рівень звʼязку", en: "Link rate" })} value={formatPct(cb.link_rate)} tone="ok" />
      </div>

      {/* як це працює */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CardTitle icon={<IconShield className="h-4 w-4 text-brand" />}>
            {t({ uk: "Privacy-preserving звʼязок (PPRL)", en: "Privacy-preserving linkage (PPRL)" })}
          </CardTitle>
          <p className="text-sm leading-relaxed text-muted">
            {t({
              uk: "Український і естонський реєстри зіставляються по зашифрованих Bloom-відбитках (транслітероване ПІБ + дата народження). Через кордон передається лише оцінка збігу «є / немає», а не імʼя чи код дитини — це єдиний юридично чистий спосіб за GDPR (немає рішення про адекватність для України). Естонські дані Рівня 1 (здоровʼя) входять у скоринг лише як сигнал.",
              en: "The Ukrainian and Estonian registries are matched on encrypted Bloom fingerprints (transliterated full name + date of birth). Only a yes/no match score crosses the border — never the child's name or code. This is the only legally clean approach under GDPR (there is no adequacy decision for Ukraine). Estonian Level-1 data (health) enters scoring only as a signal.",
            })}
          </p>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardTitle icon={<IconGlobe className="h-4 w-4 text-brand" />}>
            {t({ uk: "Нові ризики через кордон", en: "New cross-border risks" })}
          </CardTitle>
          <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
            <li>• <strong className="text-ink-2">{t({ uk: "Щілина", en: "Gap" })}</strong> — {t({ uk: "дитина в Естонії, але в жодному сервісі.", en: "child in Estonia but in no service." })}</li>
            <li>• <strong className="text-ink-2">{t({ uk: "Без супроводу (UASC)", en: "Unaccompanied (UASC)" })}</strong> — {t({ uk: "перетин без законного опікуна.", en: "crossed without a legal guardian." })}</li>
            <li>• <strong className="text-ink-2">{t({ uk: "Розрив освіти", en: "Education rupture" })}</strong> — {t({ uk: "вийшла з укр. школи, не в естонській.", en: "left a Ukrainian school, not in an Estonian one." })}</li>
            <li>• <strong className="text-ink-2">{t({ uk: "Розрив медицини", en: "Medical rupture" })}</strong> — {t({ uk: "хронік без прикріплення в EE.", en: "chronic patient with no enrolment in EE." })}</li>
          </ul>
        </Card>
      </div>

      {/* перемикач + кейси */}
      <CrossBorderExplorer cases={cases} />
    </div>
  );
}
