/**
 * Метадані реєстрів і порушень — дзеркало backend
 * (emitters/registries.py REGISTRIES, dashboard.py VIOL_UA, scoring.yaml severity).
 */
import type { RegistryCode, Tier, Acuity } from "./types";

export interface RegistryMeta {
  code: RegistryCode;
  ua: string; // коротка назва
  short: string; // дуже коротка (для чіпів/таймлайну)
  owner: string;
  subsystem: string;
  access: 1 | 2 | 3; // правовий рівень доступу
}

export const REGISTRIES: RegistryMeta[] = [
  { code: "DRACS", ua: "ДРАЦС — акти цив. стану", short: "ДРАЦС", owner: "Мінʼюст", subsystem: "3_MJU_DRACS_prod", access: 2 },
  { code: "EDDR", ua: "ЄДДР — демографічний реєстр", short: "ЄДДР", owner: "МВС", subsystem: "20_DMS_EDDR_prod", access: 2 },
  { code: "EHEALTH", ua: "eHealth / ЕСОЗ", short: "eHealth", owner: "НСЗУ", subsystem: "50_ESOZ_prod_ME_EHR", access: 2 },
  { code: "EDEBO", ua: "ЄДЕБО — освіта", short: "ЄДЕБО", owner: "МОН", subsystem: "38_EDBO_prod", access: 2 },
  { code: "ISUO", ua: "ІСУО / AIKOM — відвідуваність", short: "ІСУО", owner: "МОН", subsystem: "38_AIKOM_prod", access: 2 },
  { code: "VPO", ua: "Реєстр ВПО", short: "ВПО", owner: "Мінсоцполітики", subsystem: "85_OISSS_VPO_prod", access: 2 },
  { code: "CHILDWAR", ua: "«Діти війни»", short: "Діти війни", owner: "Нацсоцслужба", subsystem: "childrenofwar_prod", access: 2 },
  { code: "SSD", ua: "ССД / ЕІАС «Діти»", short: "ССД", owner: "Нацсоцслужба", subsystem: "85_OISSS_DITY_prod", access: 2 },
  { code: "ERDR", ua: "ЄРДР — досудові розслідування", short: "ЄРДР", owner: "Офіс Генпрокурора", subsystem: "ERDR_prod", access: 1 },
  { code: "VIOLENCE", ua: "Реєстр домашнього насильства", short: "Насильство", owner: "МВС / Мінсоц", subsystem: "20_MVS_DN_prod", access: 2 },
];

export const REG_BY_CODE: Record<RegistryCode, RegistryMeta> = Object.fromEntries(
  REGISTRIES.map((r) => [r.code, r]),
) as Record<RegistryCode, RegistryMeta>;

export function regName(code: RegistryCode): string {
  return REG_BY_CODE[code]?.short ?? code;
}

export function regAccess(code: RegistryCode): 1 | 2 | 3 {
  return REG_BY_CODE[code]?.access ?? 2;
}

/** Назви порушень українською (dashboard.VIOL_UA, розширено). */
export const VIOLATION_UA: Record<string, string> = {
  W1_displacement: "Вимушене переміщення",
  W3_out_of_education: "Поза освітою",
  W8_medical_access: "Обмеження медицини",
  W2_psych_trauma: "Психотравма",
  W6_orphanhood: "Сирітство / втрата опіки",
  W5_deportation: "Депортація",
  W7_trafficking: "Торгівля людьми",
  F3_neglect: "Нехтування потребами",
  P1_physical_home: "Фізичне насильство вдома",
  E1_bullying: "Булінг",
  F6_sexual_abuse: "Сексуальне насильство",
};

export function violName(v: string): string {
  return VIOLATION_UA[v] ?? v;
}

/** Порушення, що дають IMMEDIATE OVERRIDE (scoring.yaml immediate_override). */
export const IMMEDIATE_VIOLATIONS = new Set([
  "W5_deportation",
  "W7_trafficking",
  "F6_sexual_abuse",
  "W4_death_injury",
  "W10_militarization",
]);

export const TIER_META: Record<
  Tier,
  { label: string; horizon: string; dot: string; cls: string }
> = {
  T0: { label: "T0", horizon: "Сьогодні", dot: "var(--color-t0)", cls: "t0" },
  T1: { label: "T1", horizon: "Цей тиждень", dot: "var(--color-t1)", cls: "t1" },
  T2: { label: "T2", horizon: "Спостереження", dot: "var(--color-t2)", cls: "t2" },
};

export const ACUITY_UA: Record<Acuity, string> = {
  acute: "гостре",
  active: "активне",
  chronic: "хронічне",
  improving: "покращення",
};

/** Кольори tier для графіків/бейджів. */
export const TIER_COLOR: Record<Tier, string> = {
  T0: "var(--color-t0)",
  T1: "var(--color-t1)",
  T2: "var(--color-t2)",
};

/** Палітра для діаграм порушень (один акцент + нейтральні відтінки). */
export const CHART_PALETTE = [
  "#0e7c86",
  "#18b5c0",
  "#3b82a6",
  "#5b8fa8",
  "#7aa3b0",
  "#9bb3bd",
  "#b8c4cb",
  "#c9d2d8",
  "#d8dfe4",
  "#e3e8ec",
  "#edf0f3",
];
