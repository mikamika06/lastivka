import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getPersona, type Persona } from "./session";

export async function getSession(): Promise<Persona | null> {
  const c = await cookies();
  return getPersona(c.get(SESSION_COOKIE)?.value);
}
