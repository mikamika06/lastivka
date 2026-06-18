import { getQueue, getFederatedStats, scopeAndRedact } from "@/lib/api";
import { getSession } from "@/lib/session.server";
import { getT, getLocale, pageTitle } from "@/lib/i18n.server";
import { SectionHeading } from "@/components/ui/Card";
import { FederatedExplorer } from "@/components/federated/FederatedExplorer";

export async function generateMetadata() {
  return { title: await pageTitle({ uk: "Федеративна детекція (LRA)", en: "Federated detection (LRA)" }) };
}

export default async function FederatedPage() {
  const [all, session, t, locale] = await Promise.all([getQueue(), getSession(), getT(), getLocale()]);
  const items = scopeAndRedact(all, session, locale); // ізоляція території + вирізання ПІБ за роллю
  const [stats] = await Promise.all([getFederatedStats()]);
  return (
    <div className="space-y-6">
      <SectionHeading
        index="LRA"
        title={t({ uk: "Федеративна детекція (compute-to-data)", en: "Federated detection (compute-to-data)" })}
        subtitle={t({
          uk: "Кожен реєстр рахує сигнали локально і віддає лише похідний сигнал — не сирі дані. Той самий результат, що централізовано, без перетину межі реєстру.",
          en: "Each registry computes signals locally and emits only a derived signal — never raw data. Same result as centralized, with no data crossing the registry boundary.",
        })}
      />
      <FederatedExplorer items={items} stats={stats} />
    </div>
  );
}
