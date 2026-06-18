import { getQueue, getFederatedStats } from "@/lib/api";
import { SectionHeading } from "@/components/ui/Card";
import { FederatedExplorer } from "@/components/federated/FederatedExplorer";

export const metadata = { title: "Федеративна детекція (LRA) — Ластівка" };

export default async function FederatedPage() {
  const [items, stats] = await Promise.all([getQueue(), getFederatedStats()]);
  return (
    <div className="space-y-6">
      <SectionHeading
        index="LRA"
        title="Федеративна детекція (compute-to-data)"
        subtitle="Як це працює у проді: кожен реєстр-сховище рахує сигнали ЛОКАЛЬНО (LRA-вузол) і віддає лише похідний сигнал, не сирі дані. C1-агрегатор зводить за псевдонімом і застосовує ті самі правила. Той самий результат, що централізовано — але дані не перетинають межу реєстру."
      />
      <FederatedExplorer items={items} stats={stats} />
    </div>
  );
}
