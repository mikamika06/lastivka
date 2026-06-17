import { SectionHeading } from "@/components/ui/Card";
import { MyQueueExplorer } from "@/components/caseload/MyQueueExplorer";

export const metadata = { title: "Моя черга — Ластівка" };

export default function MyQueuePage() {
  return (
    <div className="space-y-6">
      <SectionHeading
        index="06"
        title="Кабінет фахівця"
        subtitle="Особиста черга фахівця: найтерміновіші діти зі строками реагування та фіксацією рішення по кожній."
      />
      <MyQueueExplorer />
    </div>
  );
}
