import { getQueue } from "@/lib/api";
import { SectionHeading } from "@/components/ui/Card";
import { QueueExplorer } from "@/components/queue/QueueExplorer";

export const metadata = { title: "Черга реагування — Ластівка" };

export default async function QueuePage() {
  const items = await getQueue();

  return (
    <div className="space-y-6">
      <SectionHeading
        index="02"
        title="Черга реагування"
        subtitle="Список дітей, упорядкований за терміновістю, для соціального працівника. Кожна картка розкривається в пояснення — система пояснює кожне рішення."
      />
      <QueueExplorer items={items} />
    </div>
  );
}
