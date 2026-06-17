import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  deserializeSession,
  type User,
  type Role,
} from "./auth";

/** Поточний користувач із cookie сесії (демо). null — не автентифіковано. */
export async function getCurrentUser(): Promise<User | null> {
  const c = await cookies();
  return deserializeSession(c.get(SESSION_COOKIE)?.value);
}

/** Скоуп даних, виведений із сесії; передається у lib/api.ts. */
export interface Scope {
  role: Role;
  oblast: string;
  hromada: string | null;
}

export function scopeOf(user: User): Scope {
  return { role: user.role, oblast: user.oblast, hromada: user.hromada };
}

/** Скоуп поточного користувача або null, якщо вхід відсутній. */
export async function getScope(): Promise<Scope | null> {
  const user = await getCurrentUser();
  return user ? scopeOf(user) : null;
}
