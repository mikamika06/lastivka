import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  deserializeSession,
  isPublicRoute,
  roleCanAccess,
  homeRouteFor,
} from "@/lib/auth";

/**
 * Захист маршрутів (демо-RBAC):
 * - неавтентифікований на захищеному маршруті → /login (з ?next=);
 * - автентифікований на маршруті іншої ролі → його домашній екран;
 * - автентифікований на /login → його домашній екран.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const user = deserializeSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL(homeRouteFor(user.role), req.url));
    }
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) return NextResponse.next();

  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (!roleCanAccess(user.role, pathname)) {
    return NextResponse.redirect(new URL(homeRouteFor(user.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  // пропускаємо статику й службові шляхи Next.js
  matcher: ["/((?!_next/static|_next/image|favicon.ico|swallow.svg|fonts).*)"],
};
