import { getQueue, scopeAndRedact } from "@/lib/api";
import { getT, pageTitle } from "@/lib/i18n.server";
import { getSession } from "@/lib/session.server";
import { SectionHeading } from "@/components/ui/Card";
import { QueueExplorer } from "@/components/queue/QueueExplorer";

export async function generateMetadata() {
  return { title: await pageTitle({ uk: "Наглядова панель", en: "Oversight dashboard" }) };
}

export default async function OversightPage() {
  const [all, session, t] = await Promise.all([getQueue(), getSession(), getT()]);
  const items = scopeAndRedact(all, session);

  return (
    <div className="space-y-6">
      <SectionHeading index="10" title={t({ uk: "Наглядова панель", en: "Oversight panel" })} />
      <QueueExplorer items={items} />
    </div>
  );
}
