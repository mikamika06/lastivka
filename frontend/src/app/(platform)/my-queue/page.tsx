import { SectionHeading } from "@/components/ui/Card";
import { MyQueueExplorer } from "@/components/caseload/MyQueueExplorer";

export const metadata = { title: "Моя черга — Ластівка" };

export default function MyQueuePage() {
  return (
    <div className="space-y-6">
      <SectionHeading
        index="06"
        title="Моя черга"
        subtitle="Персональна черга наглядача: топ кейсів за терміновістю з дедлайнами реагування та фіксацією рішення."
      />
      <MyQueueExplorer />
    </div>
  );
}
