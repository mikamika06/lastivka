import { AppShell } from "@/components/layout/AppShell";

export default function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
