import { redirect } from "next/navigation";
import { SectionHeading } from "@/components/ui/Card";
import { MyQueueExplorer } from "@/components/caseload/MyQueueExplorer";
import { getT, pageTitle } from "@/lib/i18n.server";
import { getSession } from "@/lib/session.server";

export async function generateMetadata() {
  return { title: await pageTitle({ uk: "Моя черга", en: "My queue" }) };
}

export default async function MyQueuePage() {
  const [t, session] = await Promise.all([getT(), getSession()]);
  // Кабінет фахівця — лише для ролей із ПІБ-доступом (ССД/поліція). Решту відсилаємо на їхній landing.
  if (session && !session.pii) redirect(session.landing);
  return (
    <div className="space-y-6">
      <SectionHeading
        index="06"
        title={t({ uk: "Кабінет фахівця", en: "Specialist workspace" })}
      />
      <MyQueueExplorer oblast={session?.oblast ?? null} />
    </div>
  );
}
