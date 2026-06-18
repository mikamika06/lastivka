"use client";

import { useRouter } from "next/navigation";
import { clearSessionCookie, type Persona } from "@/lib/session";
import { useTx } from "./I18nProvider";

export function SessionBadge({ session }: Readonly<{ session: Persona | null }>) {
  const router = useRouter();
  const t = useTx();
  if (!session) return null;

  const logout = () => {
    clearSessionCookie();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2.5">
      <span className="hidden items-center gap-2 sm:flex">
        <span className={`h-1.5 w-1.5 rounded-full ${session.pii ? "bg-brand" : "bg-faint"}`} />
        <span className="text-xs">
          <span className="font-semibold text-ink">{session.name}</span>
          <span className="text-faint"> · {session.scopeLabel}</span>
        </span>
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
          session.pii ? "bg-brand-soft text-brand-ink" : "border border-line text-faint"
        }`}>
          {session.role === "regional" ? t({ uk: "знеособлено", en: "de-identified" }) : t({ uk: "з ПІБ", en: "with PII" })}
        </span>
      </span>
      <button
        onClick={logout}
        className="rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-muted transition hover:text-ink"
      >
        {t({ uk: "Вийти", en: "Sign out" })}
      </button>
    </div>
  );
}
