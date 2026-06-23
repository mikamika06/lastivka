import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/session.server";

export default async function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login"); // демо-гард: без сесії — на вхід
  return <AppShell session={session}>{children}</AppShell>;
}
