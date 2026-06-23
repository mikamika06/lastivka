"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/lib/auth";

const Ctx = createContext<User | null>(null);

export function UserProvider({ user, children }: Readonly<{ user: User | null; children: ReactNode }>) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export function useUser(): User | null {
  return useContext(Ctx);
}
