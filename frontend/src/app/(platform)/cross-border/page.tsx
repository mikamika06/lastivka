import { getCrossBorder, getCrossBorderCases } from "@/lib/api";
import { formatPct } from "@/lib/format";
import { Card, CardTitle, SectionHeading } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/Stat";
import { IconGlobe, IconShield } from "@/components/ui/icons";
import { CrossBorderExplorer } from "@/components/crossborder/CrossBorderExplorer";

export const metadata = { title: "Крос-кордон UA↔EE — Ластівка" };

export default async function CrossBorderPage() {
  const [cb, cases] = await Promise.all([getCrossBorder(), getCrossBorderCases()]);

  return (
    <div className="space-y-6">
      <SectionHeading
        index="07"
        title="Крос-кордон Україна ↔ Естонія"
        subtitle="Дитина, що перетнула кордон, випадає з української системи раніше, ніж потрапляє в естонську. Спільного ідентифікатора немає (УНЗР ≠ isikukood), тож звʼязок — privacy-preserving: кордон перетинає лише зашифрований відбиток (PPRL), не персональні дані."
      />

      {/* KPI крос-кордонного звʼязку */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Дітей у реєстрах Естонії" value={cb.ee_entities} tone="neutral" />
        <KpiCard label="Звʼязано з Україною" value={cb.linked} tone="brand" hint="PPRL Bloom-filter" />
        <KpiCard label="Не знайдено пари" value={cb.ee_unmatched} tone="t1" hint="транслітерація / щілина" />
        <KpiCard label="Рівень звʼязку" value={formatPct(cb.link_rate)} tone="ok" />
      </div>

      {/* як це працює */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CardTitle icon={<IconShield className="h-4 w-4 text-brand" />}>
            Privacy-preserving звʼязок (PPRL)
          </CardTitle>
          <p className="text-sm leading-relaxed text-muted">
            Український і естонський реєстри зіставляються по <strong>зашифрованих Bloom-відбитках</strong>{" "}
            (транслітероване ПІБ + дата народження). Через кордон передається лише оцінка збігу «є / немає»,
            а не імʼя чи код дитини — це єдиний юридично чистий спосіб за GDPR (немає рішення про адекватність
            для України). Естонські дані Рівня 1 (здоровʼя) входять у скоринг лише як сигнал.
          </p>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardTitle icon={<IconGlobe className="h-4 w-4 text-brand" />}>Нові ризики через кордон</CardTitle>
          <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
            <li>• <strong className="text-ink-2">Щілина</strong> — дитина в Естонії, але в жодному сервісі.</li>
            <li>• <strong className="text-ink-2">Без супроводу (UASC)</strong> — перетин без законного опікуна.</li>
            <li>• <strong className="text-ink-2">Розрив освіти</strong> — вийшла з укр. школи, не в естонській.</li>
            <li>• <strong className="text-ink-2">Розрив медицини</strong> — хронік без прикріплення в EE.</li>
          </ul>
        </Card>
      </div>

      {/* перемикач + кейси */}
      <CrossBorderExplorer cases={cases} />
    </div>
  );
}
