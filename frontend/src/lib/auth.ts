/**
 * Демо-аутентифікація та рольовий доступ (без реального backend).
 * Тут — лише типи, перелік демо-користувачів і чисті функції доступу,
 * безпечні і для сервера, і для клієнта (без next/headers).
 *
 * Сесія зберігається у cookie (див. auth.server.ts), захист маршрутів —
 * у middleware.ts. Скоуп даних (громада/область) застосовується у lib/api.ts.
 */
import type { Msg } from "./i18n";

export const SESSION_COOKIE = "lastivka_session";

/** Дві ролі демо (за docs/ROLE_ACCESS_MATRIX.md). */
export type Role = "community" | "regional";

/**
 * Скоуп користувача.
 * - community: бачить персональні дані ЛИШЕ своєї громади (hromada).
 * - regional: бачить агрегати по області (oblast), БЕЗ персональних даних.
 */
export interface User {
  id: string; // = email-логін
  name: string;
  role: Role;
  oblast: string; // укр. назва області (ключ OBLAST_EN)
  hromada: string | null; // лише для community; для regional — null
}

/** Демо-пароль один на всіх (це демо; логін лише показує рівні доступу). */
export const DEMO_PASSWORD = "lastivka";

/** Рівно три демо-користувачі за вимогами завдання. */
export const DEMO_USERS: User[] = [
  {
    id: "regional@lastivka.demo",
    name: "Olena Tkachenko",
    role: "regional",
    oblast: "Харківська",
    hromada: null,
  },
  {
    id: "chuhuiv@lastivka.demo",
    name: "Andrii Kovalenko",
    role: "community",
    oblast: "Харківська",
    hromada: "Chuhuiv",
  },
  {
    id: "izium@lastivka.demo",
    name: "Mariia Bondar",
    role: "community",
    oblast: "Харківська",
    hromada: "Izium",
  },
];

export function findDemoUser(id: string): User | null {
  return DEMO_USERS.find((u) => u.id.toLowerCase() === id.trim().toLowerCase()) ?? null;
}

/** Серіалізація сесії у значення cookie (демо — звичайний user id). */
export function serializeSession(user: User): string {
  return user.id;
}

/** Відновлення користувача із значення cookie. */
export function deserializeSession(value: string | undefined | null): User | null {
  if (!value) return null;
  return findDemoUser(value);
}

/* ── рольовий доступ до маршрутів ────────────────────────────────── */

/** Публічні маршрути (не потребують входу). */
export const PUBLIC_ROUTES = ["/", "/about", "/login"];

/** Маршрути лише для community worker (персональні дані). */
export const COMMUNITY_ONLY = ["/queue", "/profile", "/my-queue"];

/** Маршрути лише для regional manager (агрегати без ПІБ). */
export const REGIONAL_ONLY = ["/dashboard", "/caseload"];

/** Спільні захищені маршрути (доступні обом ролям після входу). */
export const SHARED_PROTECTED = ["/privacy", "/cross-border"];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function matchesAny(pathname: string, routes: string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/** Чи дозволено цій ролі відкривати маршрут (без урахування входу). */
export function roleCanAccess(role: Role, pathname: string): boolean {
  if (matchesAny(pathname, COMMUNITY_ONLY)) return role === "community";
  if (matchesAny(pathname, REGIONAL_ONLY)) return role === "regional";
  return true; // спільні / інші захищені
}

/** Домашній маршрут ролі після входу. */
export function homeRouteFor(role: Role): string {
  return role === "regional" ? "/dashboard" : "/queue";
}

/** Підпис ролі (двомовний) — для UI. */
export const ROLE_LABEL: Record<Role, Msg> = {
  community: { uk: "Фахівець ССД (громада)", en: "Community worker (Child Services / SSD)" },
  regional: { uk: "Регіональний контролер / аналітик", en: "Regional manager / analyst" },
};
