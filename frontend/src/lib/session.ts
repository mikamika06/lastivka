/** Демо-сесія та фінальна модель акторів (docs/FINAL_ACTOR_MODEL.md). Спільна частина — без next/headers.
 *  Кожна персона = окремий рівень авторизації з окремим landing/nav/скоупом даних (сегрегація в дата-шарі). */

export type AppRole =
  | "ssd" // посадова особа ССД — інтегрований доступ, територія, з ПІБ
  | "police" // поліція (ювенальна превенція) — той самий профіль, що ССД, але вищий допуск (бачить ЄРДР)
  | "supervisor" // наглядач-аналітик (НСССУ) — агрегати, без PII
  | "regional" // регіональний рівень (область) — лише агрегати області, без PII
  | "vertical" // вертикальний репортер (лікар/школа) — власний реєстр + вхідні сигнали
  | "parent"; // батьки — лише власна дитина

export type DataScope =
  | "territory" // власна громада/місто/район, з ПІБ
  | "case" // лише власні відкриті кейси (assigned)
  | "national_pii" // вся країна, per-record PII (омбудсман)
  | "national_agg" // вся країна, агрегати (наглядач)
  | "oblast_agg" // область, агрегати без PII (регіонал)
  | "own_vertical" // власний реєстр + вхідні адресні сигнали
  | "own_child"; // лише власна дитина

export interface Persona {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  dataScope: DataScope;
  scopeLabel: string;
  pii: boolean;
  oblast?: string; // територіальний скоуп (для демо громада = область)
  workerId?: string; // case-scope (cnsp)
  vertical?: string; // реєстр власної вертикалі (vertical)
  landing: string;
}

export const SESSION_COOKIE = "session";
export const DEMO_PASSWORD = "lastivka";

export const PERSONAS: Persona[] = [
  {
    id: "ssd", email: "ssd-chuhuiv@lastivka.demo", name: "Андрій Коваленко",
    role: "ssd", dataScope: "territory", oblast: "Харківська",
    scopeLabel: "Фахівець ССД · Харківська громада", pii: true, landing: "/queue",
  },
  {
    id: "police", email: "police@lastivka.demo", name: "Поліція · ювенальна превенція",
    role: "police", dataScope: "national_pii", vertical: "ERDR",
    scopeLabel: "Поліція · ювенальна превенція (вищий допуск)", pii: true, landing: "/queue",
  },
  {
    id: "regional", email: "regional@lastivka.demo", name: "Сергій Левченко",
    role: "regional", dataScope: "oblast_agg", oblast: "Харківська",
    scopeLabel: "Регіональний менеджер · Харківська область", pii: false, landing: "/dashboard",
  },
];

export const PERSONA_BY_ID: Record<string, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.id, p]),
);

export function getPersona(id: string | undefined): Persona | null {
  return id ? (PERSONA_BY_ID[id] ?? null) : null;
}

/** Єдина роль: персона з login керує і вертикальним зрізом профілю (без окремого світчера). */
export function verticalRole(p: Persona | null): "ssd" | "doctor" | "school" | "police" | "parent" | "analyst" {
  if (!p) return "ssd";
  switch (p.role) {
    case "ssd": return "ssd";
    case "police": return "police"; // бекенд-проєкція поліції: бачить ЄРДР (вищий допуск, ніж ССД)
    case "supervisor": case "regional": return "analyst";
    case "parent": return "parent";
    case "vertical":
      return p.vertical === "EDEBO" ? "school" : "doctor";
  }
}

export function setSessionCookie(id: string): void {
  document.cookie = `${SESSION_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

export function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
