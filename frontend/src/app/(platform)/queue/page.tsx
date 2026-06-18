import { getQueue, scopeAndRedact } from "@/lib/api";
import { getT } from "@/lib/i18n.server";
import { getSession } from "@/lib/session.server";
import { SectionHeading } from "@/components/ui/Card";
import { QueueExplorer } from "@/components/queue/QueueExplorer";

export const metadata = { title: "Черга реагування — Ластівка" };

export default async function QueuePage() {
  const [all, session, t] = await Promise.all([getQueue(), getSession(), getT()]);
  const items = scopeAndRedact(all, session); // територіальна ізоляція + вирізання ПІБ із сесії

  const regional = session?.role === "regional";
  return (
    <div className="space-y-6">
      <SectionHeading
        index="02"
        title={t({ uk: "Черга реагування", en: "Response queue" })}
        subtitle={
          session
            ? t({
                uk: `${session.scopeLabel} · ${items.length} ${regional ? "знеособлених кейсів (без ПІБ)" : "кейсів за вашою територією"}. Кожна картка пояснює рішення.`,
                en: `${session.scopeLabel} · ${items.length} ${regional ? "de-identified cases (no PII)" : "cases in your territory"}. Each card explains the decision.`,
              })
            : t({
                uk: "Список дітей, упорядкований за терміновістю. Кожна картка розкривається в пояснення.",
                en: "Children ordered by urgency. Each card expands into an explanation.",
              })
        }
      />
      {regional && (
        <div className="rounded-xl border border-line bg-paper/50 px-4 py-2.5 text-xs text-muted">
          {t({
            uk: "Режим регіонала: персональні дані (ПІБ, УНЗР, дата народження) вирізано в шарі даних. Для роботи з конкретною дитиною — увійдіть як працівник громади.",
            en: "Regional mode: personal data (name, UNZR, DOB) is stripped in the data layer. To work a specific child, sign in as a community worker.",
          })}
        </div>
      )}
      <QueueExplorer items={items} />
    </div>
  );
}
