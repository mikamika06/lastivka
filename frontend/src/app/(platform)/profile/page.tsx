import { getQueue } from "@/lib/api";
import { SectionHeading } from "@/components/ui/Card";
import { ProfileExplorer } from "@/components/profile/ProfileExplorer";

export const metadata = { title: "Профіль дитини — Ластівка" };

export default async function ProfilePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ id?: string }>;
}>) {
  const [items, sp] = await Promise.all([getQueue(), searchParams]);
  const initialId = sp.id ? Number(sp.id) : undefined;

  return (
    <div className="space-y-6">
      <SectionHeading
        index="01"
        title="Профіль дитини"
        subtitle="Як система «бачить» дитину, зібрану з силосованих реєстрів — без злиття персональних даних у спільну базу."
      />
      <ProfileExplorer key={initialId ?? "default"} items={items} initialId={initialId} />
    </div>
  );
}
