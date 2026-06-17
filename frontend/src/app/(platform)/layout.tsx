import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { UserProvider } from "@/components/providers/UserProvider";
import { getCurrentUser } from "@/lib/auth.server";

export default async function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // middleware вже захищає ці маршрути; це другий рубіж на випадок прямого виклику
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <UserProvider user={user}>
      <AppShell>{children}</AppShell>
    </UserProvider>
  );
}
