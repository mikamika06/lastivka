"use client";

import { useUser } from "@/components/providers/UserProvider";
import { ROLE_LABEL } from "@/lib/auth";
import { oblastLabel } from "@/lib/registries";
import { logout } from "@/app/login/actions";
import { useTx, useLocale } from "@/components/providers/I18nProvider";
import { IconProfile } from "@/components/ui/icons";

/** Картка поточного користувача + вихід (унизу бічної панелі). */
export function UserMenu() {
  const user = useUser();
  const t = useTx();
  const locale = useLocale();
  if (!user) return null;

  const scopeLabel = user.hromada
    ? `${user.hromada} (${oblastLabel(user.oblast, locale)})`
    : oblastLabel(user.oblast, locale);

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          <IconProfile className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="truncate text-[11px] text-muted">{t(ROLE_LABEL[user.role])}</p>
        </div>
      </div>
      <p className="mt-2 truncate text-[11px] text-faint">{scopeLabel}</p>
      <form action={logout} className="mt-2.5">
        <button
          type="submit"
          className="w-full rounded-lg border border-line bg-paper/50 px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-ink-2"
        >
          {t({ uk: "Вийти", en: "Sign out" })}
        </button>
      </form>
    </div>
  );
}
