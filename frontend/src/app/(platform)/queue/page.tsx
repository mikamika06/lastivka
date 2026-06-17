import { getQueue } from "@/lib/api";
import { SectionHeading } from "@/components/ui/Card";
import { QueueExplorer } from "@/components/queue/QueueExplorer";

export const metadata = { title: "Черга реагування — Ластівка" };

export default async function QueuePage() {
  const items = await getQueue();

  return (
    <div className="space-y-6">
      <SectionHeading
        index="03"
        title="Черга реагування"
        subtitle="Ранжований список кейсів кейсворкера. Кожна картка розкривається в пояснення — не чорна скриня."
      />
      <QueueExplorer items={items} />
    </div>
  );
}
