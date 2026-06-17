import { SectionHeading } from "@/components/ui/Card";
import { MyQueueExplorer } from "@/components/caseload/MyQueueExplorer";
import { getT } from "@/lib/i18n.server";

export const metadata = { title: "Моя черга — Ластівка" };

export default async function MyQueuePage() {
  const t = await getT();
  return (
    <div className="space-y-6">
      <SectionHeading
        index="06"
        title={t({ uk: "Кабінет фахівця", en: "Specialist workspace" })}
        subtitle={t({
          uk: "Особиста черга фахівця: найтерміновіші діти зі строками реагування та фіксацією рішення по кожній.",
          en: "The specialist's personal queue: the most urgent children with response deadlines and a logged decision for each.",
        })}
      />
      <MyQueueExplorer />
    </div>
  );
}
