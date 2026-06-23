/** Спільна частина i18n (без next/headers — безпечно для клієнта й сервера). */
export type Locale = "uk" | "en";

export interface Msg {
  uk: string;
  en: string;
}

export const LOCALE_COOKIE = "lang";

export function pick(locale: Locale, m: Msg): string {
  return locale === "en" ? m.en : m.uk;
}

/** Записати локаль у cookie (клієнт). Винесено з компонента навмисно. */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/* ── Роль користувача (рольовий доступ кабінету; дзеркало lastivka/roles.py) ── */
export type Role = "ssd" | "doctor" | "school" | "police" | "parent" | "analyst";

export const ROLE_COOKIE = "role";

export const ROLES: Role[] = ["ssd", "doctor", "school", "police", "parent", "analyst"];

export const ROLE_LABEL: Record<Role, Msg> = {
  ssd: { uk: "ССД (оператор)", en: "SSD (operator)" },
  doctor: { uk: "Лікар (МОЗ)", en: "Doctor (MoH)" },
  school: { uk: "Школа (МОН)", en: "School (MoES)" },
  police: { uk: "Поліція (МВС)", en: "Police (MoIA)" },
  parent: { uk: "Батьки", en: "Parent" },
  analyst: { uk: "Наглядач", en: "Supervisor" },
};

export function isRole(v: string | undefined): v is Role {
  return !!v && (ROLES as string[]).includes(v);
}

export function setRoleCookie(role: Role): void {
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=31536000; samesite=lax`;
}
