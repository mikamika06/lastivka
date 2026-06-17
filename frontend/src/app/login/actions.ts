"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  DEMO_PASSWORD,
  findDemoUser,
  serializeSession,
  homeRouteFor,
  roleCanAccess,
  isPublicRoute,
} from "@/lib/auth";

export interface LoginState {
  error: string | null;
}

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 годин (демо)

/** Демо-вхід: будь-який із трьох демо-логінів + спільний демо-пароль. */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const id = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const user = findDemoUser(id);
  if (!user || password !== DEMO_PASSWORD) {
    return { error: "invalid" };
  }

  const c = await cookies();
  c.set(SESSION_COOKIE, serializeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  // повертаємо туди, куди користувач ішов, якщо це йому дозволено
  const dest =
    next && !isPublicRoute(next) && roleCanAccess(user.role, next) ? next : homeRouteFor(user.role);
  redirect(dest);
}

export async function logout(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  redirect("/login");
}
