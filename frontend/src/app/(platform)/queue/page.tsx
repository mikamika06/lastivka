import { getQueue, scopeAndRedact } from "@/lib/api";
import { getT, getLocale, pageTitle } from "@/lib/i18n.server";
import { getSession } from "@/lib/session.server";
import { SectionHeading } from "@/components/ui/Card";
import { QueueExplorer } from "@/components/queue/QueueExplorer";

export async function generateMetadata() {
  return { title: await pageTitle({ uk: "Черга реагування", en: "Response queue" }) };
}

export default async function QueuePage() {
  const [all, session, t, locale] = await Promise.all([getQueue(), getSession(), getT(), getLocale()]);
  const items = scopeAndRedact(all, session, locale); // територіальна ізоляція + вирізання ПІБ із сесії

  const regional = session?.role === "regional";
  return (
    <div className="space-y-6">
      <SectionHeading
        index="02"
        title={t({ uk: "Черга реагування", en: "Response queue" })}
        subtitle={
          session
            ? `${t(session.scopeLabel)} · ${items.length} ${t(
                regional
                  ? { uk: "знеособлених кейсів (без ПІБ)", en: "de-identified cases (no PII)" }
                  : { uk: "кейсів за вашою територією", en: "cases in your territory" },
              )}`
            : t({
                uk: "Список дітей, упорядкований за терміновістю.",
                en: "Children ordered by urgency.",
              })
        }
      />
      <QueueExplorer items={items} />
    </div>
  );
}
