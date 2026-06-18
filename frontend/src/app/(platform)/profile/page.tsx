import { getQueue, scopeAndRedact } from "@/lib/api";
import { getSession } from "@/lib/session.server";
import { SectionHeading } from "@/components/ui/Card";
import { ProfileExplorer } from "@/components/profile/ProfileExplorer";

export const metadata = { title: "Профіль дитини — Ластівка" };

export default async function ProfilePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ id?: string }>;
}>) {
  const [all, session, sp] = await Promise.all([getQueue(), getSession(), searchParams]);
  const items = scopeAndRedact(all, session); // лише діти своєї території (з сесії)
  const requestedId = sp.id ? Number(sp.id) : undefined;
  // IDOR: крос-громадний ?id= поза скоупом — ігноруємо (не показуємо чужу дитину)
  const initialId = requestedId && items.some((i) => i.entity_id === requestedId) ? requestedId : undefined;

  return (
    <div className="space-y-6">
      <SectionHeading
        index="03"
        title="Профіль дитини"
        subtitle="Як система «бачить» дитину, зібрану з різних реєстрів — не зливаючи персональні дані в одну спільну базу."
      />
      <ProfileExplorer key={initialId ?? "default"} items={items} initialId={initialId} pii={session?.pii ?? true} canSeeFamily={session?.role === "ssd" || session?.role === "police"} />
    </div>
  );
}
