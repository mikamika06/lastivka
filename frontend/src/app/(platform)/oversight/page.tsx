import { getQueue, scopeAndRedact } from "@/lib/api";
import { getSession } from "@/lib/session.server";
import { SectionHeading, Card } from "@/components/ui/Card";
import { QueueExplorer } from "@/components/queue/QueueExplorer";

export const metadata = { title: "Наглядова панель — Ластівка" };

export default async function OversightPage() {
  const [all, session] = await Promise.all([getQueue(), getSession()]);
  const items = scopeAndRedact(all, session);

  return (
    <div className="space-y-6">
      <SectionHeading
        index="10"
        title="Наглядова панель"
        subtitle="Уповноважений ВРУ з прав людини: максимально доступний за законом обсяг — зведена картина по всіх територіях з персональними даними, повні особові справи та доказова база."
      />
      <Card className="px-4 py-3 text-xs leading-relaxed text-muted">
        Там, де закон забороняє зміст (досудове розслідування, лікарська таємниця), система показує лише
        захищений сигнал без розкриття реєстру, типу чи підстави — навіть наглядовий доступ не пробиває
        ці межі. Решта даних доступна повністю в межах статутних повноважень нагляду.
      </Card>
      <QueueExplorer items={items} />
    </div>
  );
}
