"use client";

import { useRouter } from "next/navigation";
import { useRole } from "./RoleProvider";
import { useTx } from "./I18nProvider";
import { setRoleCookie, ROLES, ROLE_LABEL, type Role } from "@/lib/i18n";

/** Перемикач ролі кабінету — змінює, ЯКІ дані й історію бачить користувач (лікар≠суд). */
export function RoleSwitcher() {
  const role = useRole();
  const router = useRouter();
  const t = useTx();

  const set = (r: Role) => {
    if (r === role) return;
    setRoleCookie(r);
    router.refresh();
  };

  return (
    <label className="inline-flex items-center gap-1.5 text-xs">
      <span className="hidden font-medium text-faint sm:inline">{t({ uk: "Роль", en: "Role" })}</span>
      <select
        value={role}
        onChange={(e) => set(e.target.value as Role)}
        aria-label={t({ uk: "Роль користувача", en: "User role" })}
        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink outline-none transition hover:border-brand-line focus:border-brand"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {t(ROLE_LABEL[r])}
          </option>
        ))}
      </select>
    </label>
  );
}
