import { getQueue } from "@/lib/api";
import { getScope } from "@/lib/auth.server";
import { getT } from "@/lib/i18n.server";
import { SectionHeading } from "@/components/ui/Card";
import { QueueExplorer } from "@/components/queue/QueueExplorer";

export const metadata = { title: "Response queue — Lastivka" };

export default async function QueuePage() {
  const scope = await getScope();
  const items = await getQueue(scope);
  const t = await getT();

  return (
    <div className="space-y-6">
      <SectionHeading
        index="02"
        title={t({ uk: "Черга реагування", en: "Response queue" })}
        subtitle={t({
          uk: "Список дітей, упорядкований за терміновістю, для соціального працівника. Кожна картка розкривається в пояснення — система пояснює кожне рішення.",
          en: "A list of children ordered by urgency for the social worker. Each card expands into an explanation — the system explains every decision.",
        })}
      />
      <QueueExplorer items={items} />
    </div>
  );
}
