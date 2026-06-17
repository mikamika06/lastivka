import { SectionHeading } from "@/components/ui/Card";
import { MyQueueExplorer } from "@/components/caseload/MyQueueExplorer";
import { getMyQueue, getCaseload } from "@/lib/api";
import { getCurrentUser, getScope } from "@/lib/auth.server";
import { getT } from "@/lib/i18n.server";

export const metadata = { title: "My queue — Lastivka" };

export default async function MyQueuePage() {
  const t = await getT();
  const [scope, user] = await Promise.all([getScope(), getCurrentUser()]);
  const [queue, caseload] = await Promise.all([getMyQueue(scope), getCaseload()]);

  return (
    <div className="space-y-6">
      <SectionHeading
        index="06"
        title={t({ uk: "Кабінет фахівця", en: "Specialist workspace" })}
        subtitle={t({
          uk: "Особиста черга фахівця: найтерміновіші діти своєї громади зі строками реагування та фіксацією рішення по кожній.",
          en: "The specialist's personal queue: the most urgent children in their own hromada, with response deadlines and a logged decision for each.",
        })}
      />
      <MyQueueExplorer
        queue={queue}
        deadlines={caseload?.deadlines ?? null}
        workerName={user?.name ?? null}
        hromada={user?.hromada ?? null}
        oblast={user?.oblast ?? null}
      />
    </div>
  );
}
