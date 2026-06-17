/**
 * Метадані реєстрів і порушень — дзеркало backend Фази 3, двомовні (укр/англ).
 */
import type { RegistryCode, Tier, Acuity } from "./types";
import type { Locale, Msg } from "./i18n";
import { pick } from "./i18n";

export interface RegistryMeta {
  code: RegistryCode;
  ua: string; // повна назва (укр)
  uaEn: string; // повна назва (англ)
  short: string; // коротка (укр)
  shortEn: string; // коротка (англ)
  owner: string;
  subsystem: string;
  access: 1 | 2 | 3;
}

export const REGISTRIES: RegistryMeta[] = [
  { code: "DRACS", ua: "ДРАЦС — акти цивільного стану", uaEn: "DRACS — civil status acts", short: "ДРАЦС", shortEn: "DRACS", owner: "Мінʼюст", subsystem: "3_MJU_DRACS_prod", access: 2 },
  { code: "EDDR", ua: "ЄДДР — демографічний реєстр", uaEn: "EDDR — demographic registry", short: "ЄДДР", shortEn: "EDDR", owner: "ДМС / МВС", subsystem: "20_DMS_EDDR_prod", access: 2 },
  { code: "EHEALTH", ua: "eHealth / ЕСОЗ", uaEn: "eHealth", short: "eHealth", shortEn: "eHealth", owner: "НСЗУ", subsystem: "50_ESOZ_prod_ME_EHR", access: 1 },
  { code: "EDEBO", ua: "ЄДЕБО — освіта", uaEn: "EDEBO — education", short: "ЄДЕБО", shortEn: "EDEBO", owner: "МОН", subsystem: "38_EDBO_prod", access: 2 },
  { code: "AIKOM", ua: "ІСУО / АІКОМ — е-журнал", uaEn: "AIKOM — school e-journal", short: "АІКОМ", shortEn: "AIKOM", owner: "МОН", subsystem: "38_AIKOM_prod", access: 2 },
  { code: "VPO", ua: "ЄІБД ВПО", uaEn: "IDP registry", short: "ВПО", shortEn: "IDP", owner: "Мінсоцполітики", subsystem: "85_OISSS_VPO_prod", access: 2 },
  { code: "CHILDWAR", ua: "«Діти війни»", uaEn: "Children of War", short: "Діти війни", shortEn: "War children", owner: "Нацсоцслужба", subsystem: "childrenofwar_prod", access: 2 },
  { code: "DITY", ua: "ЄІАС «Діти» / ССД", uaEn: "Children services registry", short: "ССД", shortEn: "Child svc", owner: "Нацсоцслужба", subsystem: "85_OISSS_DITY_prod", access: 2 },
  { code: "ERDR", ua: "ЄРДР — досудові розслідування", uaEn: "ERDR — criminal investigations", short: "ЄРДР", shortEn: "ERDR", owner: "Офіс Генпрокурора", subsystem: "ERDR_prod", access: 1 },
  { code: "DV", ua: "Реєстр домашнього насильства", uaEn: "Domestic violence registry", short: "Насильство", shortEn: "DV", owner: "МВС / Мінсоц", subsystem: "20_MVS_DN_prod", access: 2 },
  { code: "CBI", ua: "Банк даних з інвалідності", uaEn: "Disability data bank", short: "Інвалідність", shortEn: "Disability", owner: "Мінсоцполітики", subsystem: "CBI_prod", access: 2 },
  { code: "EISSS", ua: "ЄІССС — соціальні допомоги", uaEn: "EISSS — social benefits", short: "ЄІССС", shortEn: "Benefits", owner: "Мінсоцполітики", subsystem: "EISSS_prod", access: 2 },
  { code: "EDRSR", ua: "ЄДРСР — судові рішення", uaEn: "EDRSR — court rulings", short: "ЄДРСР", shortEn: "Court", owner: "ДСА", subsystem: "EDRSR_prod", access: 3 },
  { code: "SKAID", ua: "ІКС «СКАЙД» — ювенальна превенція", uaEn: "SKAID — juvenile prevention", short: "СКАЙД", shortEn: "SKAID", owner: "Нацполіція", subsystem: "20_NP_SKAID_prod", access: 2 },
  { code: "PFU", ua: "Реєстр застрахованих осіб (ПФУ)", uaEn: "Pension fund insured persons", short: "ПФУ", shortEn: "PFU", owner: "ПФУ", subsystem: "PFU_RZO_prod", access: 2 },
  { code: "DRRP", ua: "ДРРП — речові права (житло)", uaEn: "DRRP — property rights (housing)", short: "ДРРП", shortEn: "Property", owner: "Мінʼюст", subsystem: "3_MJU_DRRP_prod", access: 2 },
  { code: "HOTLINE", ua: "Гарячі лінії 116 111 / 1545", uaEn: "Hotlines 116 111 / 1545", short: "Гар. лінія", shortEn: "Hotline", owner: "Ла Страда / УКЦ", subsystem: "HOTLINE_prod", access: 2 },
];

export const REG_BY_CODE: Record<RegistryCode, RegistryMeta> = Object.fromEntries(
  REGISTRIES.map((r) => [r.code, r]),
) as Record<RegistryCode, RegistryMeta>;

export function regName(code: RegistryCode, locale: Locale = "uk"): string {
  const m = REG_BY_CODE[code];
  if (!m) return code;
  return locale === "en" ? m.shortEn : m.short;
}

export function regFullName(code: RegistryCode, locale: Locale = "uk"): string {
  const m = REG_BY_CODE[code];
  if (!m) return code;
  return locale === "en" ? m.uaEn : m.ua;
}

export function regAccess(code: RegistryCode): 1 | 2 | 3 {
  return REG_BY_CODE[code]?.access ?? 2;
}

/** Назви порушень (двомовні). */
export const VIOLATION_LABELS: Record<string, Msg> = {
  W1_displacement: { uk: "Вимушене переміщення", en: "Forced displacement" },
  W3_out_of_education: { uk: "Поза освітою", en: "Out of education" },
  W8_medical_access: { uk: "Обмеження медицини", en: "Limited medical access" },
  W2_psych_trauma: { uk: "Психотравма", en: "Psychological trauma" },
  W6_orphanhood: { uk: "Сирітство / втрата опіки", en: "Orphanhood / loss of care" },
  W5_deportation: { uk: "Депортація", en: "Deportation" },
  W7_trafficking: { uk: "Торгівля людьми", en: "Human trafficking" },
  F3_neglect: { uk: "Нехтування потребами", en: "Neglect" },
  P1_physical_home: { uk: "Фізичне насильство вдома", en: "Domestic physical abuse" },
  E1_bullying: { uk: "Булінг", en: "Bullying" },
  F6_sexual_abuse: { uk: "Сексуальне насильство", en: "Sexual abuse" },
  F4_child_labor: { uk: "Дитяча праця", en: "Child labour" },
  E4_inclusion: { uk: "Доступ до інклюзії", en: "Inclusive-education access" },
  W9_identity: { uk: "Право на ідентичність", en: "Right to identity" },
  F1_psych_violence: { uk: "Психологічне насильство (сім'я)", en: "Psychological abuse (family)" },
};

export function violMsg(v: string): Msg {
  return VIOLATION_LABELS[v] ?? { uk: v, en: v };
}

export function violName(v: string, locale: Locale = "uk"): string {
  return pick(locale, violMsg(v));
}

/** Зворотна сумісність зі старим UK-словником (де ще не передають локаль). */
export const VIOLATION_UA: Record<string, string> = Object.fromEntries(
  Object.entries(VIOLATION_LABELS).map(([k, m]) => [k, m.uk]),
);

export const IMMEDIATE_VIOLATIONS = new Set([
  "W5_deportation",
  "W7_trafficking",
  "F6_sexual_abuse",
  "W4_death_injury",
  "W10_militarization",
]);

export const TIER_HORIZON: Record<Tier, Msg> = {
  T0: { uk: "Сьогодні", en: "Today" },
  T1: { uk: "Цей тиждень", en: "This week" },
  T2: { uk: "Спостереження", en: "Watch" },
};

export const TIER_META: Record<Tier, { label: string; horizon: string; dot: string; cls: string }> = {
  T0: { label: "T0", horizon: "Сьогодні", dot: "var(--color-t0)", cls: "t0" },
  T1: { label: "T1", horizon: "Цей тиждень", dot: "var(--color-t1)", cls: "t1" },
  T2: { label: "T2", horizon: "Спостереження", dot: "var(--color-t2)", cls: "t2" },
};

export const ACUITY_MSG: Record<Acuity, Msg> = {
  acute: { uk: "гостре", en: "acute" },
  active: { uk: "активне", en: "active" },
  chronic: { uk: "хронічне", en: "chronic" },
  improving: { uk: "покращення", en: "improving" },
};

export const ACUITY_UA: Record<Acuity, string> = {
  acute: "гостре",
  active: "активне",
  chronic: "хронічне",
  improving: "покращення",
};

/** Дедлайни реагування за рівнем (двомовні) — для UI. */
export const TIER_DEADLINE_MSG: Record<Tier, { label: Msg; detail: Msg }> = {
  T0: {
    label: { uk: "1 доба", en: "1 day" },
    detail: {
      uk: "оцінка рівня безпеки дитини (ПКМУ №585); насильство — повідомлення ≤3 год",
      en: "child safety assessment; for violence — report within 3 hours",
    },
  },
  T1: {
    label: { uk: "5–7 робочих днів", en: "5–7 working days" },
    detail: {
      uk: "оцінка потреб і взяття на облік (складні обставини без гострої загрози)",
      en: "needs assessment and registration (difficult circumstances, no acute threat)",
    },
  },
  T2: {
    label: { uk: "до 14 днів / планово", en: "up to 14 days / scheduled" },
    detail: {
      uk: "взяття на облік за інших обставин; спостереження",
      en: "registration in other circumstances; monitoring",
    },
  },
};

/** Фактори вразливості (чіпи) — двомовні. */
export const VULN_FACTOR_MSG: Record<string, Msg> = {
  "вік<6": { uk: "вік<6", en: "age < 6" },
  "вік 6–10": { uk: "вік 6–10", en: "age 6–10" },
  "інвалідність": { uk: "інвалідність", en: "disability" },
  "уже в «Дітях»": { uk: "уже в «Дітях»", en: "already in care registry" },
  "без опікуна": { uk: "без опікуна", en: "no guardian" },
  "ВПО": { uk: "ВПО", en: "IDP" },
  "фактор ризику (ЄРДР)": { uk: "фактор ризику (ЄРДР)", en: "risk factor (ERDR)" },
};

export function vulnFactorLabel(f: string, locale: Locale = "uk"): string {
  return pick(locale, VULN_FACTOR_MSG[f] ?? { uk: f, en: f });
}

export const TIER_COLOR: Record<Tier, string> = {
  T0: "var(--color-t0)",
  T1: "var(--color-t1)",
  T2: "var(--color-t2)",
};

/** Монохромна шкала для діаграм (синій акцент, від темного до світлого). */
export const CHART_PALETTE = [
  "#1b4fa0",
  "#2f7bf5",
  "#5e97f7",
  "#7fb0f8",
  "#9ac2fa",
  "#b5d2fb",
  "#c9defc",
  "#d8e6fd",
  "#e4edfd",
  "#eef3fe",
  "#f4f8ff",
  "#f7faff",
  "#fbfdff",
];
