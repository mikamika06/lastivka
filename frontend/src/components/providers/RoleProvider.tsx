"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/lib/i18n";

const Ctx = createContext<Role>("ssd");

export function RoleProvider({ role, children }: Readonly<{ role: Role; children: ReactNode }>) {
  return <Ctx.Provider value={role}>{children}</Ctx.Provider>;
}

/** Клієнтська роль кабінету: const role = useRole(). */
export function useRole(): Role {
  return useContext(Ctx);
}
