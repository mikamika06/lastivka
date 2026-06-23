import { getQueue } from "@/lib/api";
import { getScope } from "@/lib/auth.server";
import { getT } from "@/lib/i18n.server";
import { SectionHeading } from "@/components/ui/Card";
import { ProfileExplorer } from "@/components/profile/ProfileExplorer";

export const metadata = { title: "Child profile — Lastivka" };

export default async function ProfilePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ id?: string }>;
}>) {
  const scope = await getScope();
  const [items, sp, t] = await Promise.all([getQueue(scope), searchParams, getT()]);
  const initialId = sp.id ? Number(sp.id) : undefined;

  return (
    <div className="space-y-6">
      <SectionHeading
        index="03"
        title={t({ uk: "Профіль дитини", en: "Child profile" })}
        subtitle={t({
          uk: "Як система «бачить» дитину, зібрану з різних реєстрів — не зливаючи персональні дані в одну спільну базу.",
          en: "How the system “sees” a child assembled from different registries — without merging personal data into one shared database.",
        })}
      />
      <ProfileExplorer key={initialId ?? "default"} items={items} initialId={initialId} scope={scope} />
    </div>
  );
}
