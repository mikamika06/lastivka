/**
 * Типи даних Ластівки — дзеркало контракту backend
 * (lastivka/scoring.py, matching.py, pipeline.py, app/api.py).
 */

import type { Msg } from "@/lib/i18n";

export type Tier = "T0" | "T1" | "T2";
export type Acuity = "acute" | "active" | "chronic" | "improving";
export type RegistryCode =
  | "DRACS"
  | "EDDR"
  | "EHEALTH"
  | "EDEBO"
  | "AIKOM"
  | "VPO"
  | "CHILDWAR"
  | "DITY"
  | "ERDR"
  | "DV"
  | "CBI"
  | "CBI_DISABILITY"
  | "EISSS"
  | "EDRSR"
  | "SKAID"
  | "PFU"
  | "DRRP"
  | "HOTLINE"
  | "RAHV"
  | "EHIS_EE"
  | "TERVIS"
  | "SKAIS";

export type Country = "UA" | "EE" | "UA+EE";

/** Крос-кордонна статистика UA↔EE (GET /crossborder). */
export interface CrossBorderStats {
  ee_entities: number;
  linked: number;
  ee_unmatched: number;
  link_rate: number;
}

/** Внесок одного порушення в urgency-score (scoring.score_entity). */
export interface Contribution {
  violation: string;
  value: number; // severity * evidence * acuity
  severity: number;
  evidence: RegistryCode[]; // перетин яких реєстрів довів (WALLED редаговано за роллю)
  evidence_protected?: number; // к-ть редагованих WALLED-джерел (ЕСОЗ/ЄРДР)
  acuity: Acuity;
}

/** Кейс у черзі реагування (pipeline.queue / GET /queue). */
export interface QueueItem {
  rank: number;
  entity_id: number;
  unzr: string | null;
  isikukood?: string | null; // естонський код (для крос-кордонних кейсів)
  country?: Country; // UA | EE | UA+EE (крос-кордон)
  pib: string;
  birth_date: string | null;
  age: number | null;
  tier: Tier;
  score: number;
  immediate: boolean;
  vulnerability: number;
  vuln_factors: string[];
  violations: string[];
  registries: RegistryCode[];
  contributions: Contribution[];
  oblast: string | null; // територія (фаза 3)
  worker_id: string | null; // призначений кейсворкер (фаза 3)
  household_risk?: number | null; // щільність ризику сім'ї (familygraph)
  corroborated?: boolean | null; // звернення підтверджене крос-реєстрово (інтейк)
  intake_source?: string | null; // канал звернення (116111/1545/...)
  protected_sources?: number; // к-ть редагованих WALLED-реєстрів (ЕСОЗ/ЄРДР не показуються ССД)
}

/** Крос-реєстровий профіль дитини (matching.match / GET /entity/{id}). */
/** Слід дитини в Естонії (PPRL-зв'язок UA↔EE; інтегровано у профіль, ССД-only). */
export interface CrossBorder {
  country: Country;
  isikukood?: string | null;
  link_score?: number | null;
  ee_presence: Record<string, boolean>; // RAHV | EHIS_EE | TERVIS | SKAIS
  ee_details: {
    RAHV?: Record<string, string | null> | null;
    EHIS_EE?: Record<string, string | null> | null;
    SKAIS?: Record<string, string | null> | null;
  };
}

/** Медичні факт-сигнали (ССД/поліція): наявність стану, без діагнозу/змісту (медтаємниця). */
export interface HealthFacts {
  disability: boolean;
  chronic: boolean;
  psych_signal: boolean;
  trauma_signal: boolean;
  immunization_gap: boolean;
  has_any: boolean;
  content_available: boolean;
  legal_basis: string;
  wall: string;
  break_glass: string;
}

export interface Entity {
  entity_id: number;
  unzr: string | null;
  pib: string;
  birth_date: string | null;
  registries: RegistryCode[];
  n_registries: number;
  records: Partial<Record<RegistryCode, number>>;
  oblast?: string;
  role?: string; // рольова проєкція (lastivka/roles.py)
  signals?: Record<string, { present: boolean; note?: string }>; // закриті/сигнальні реєстри
  protected_sources?: number; // к-ть WALLED-джерел, прихованих від ролі (ЕСОЗ/ЄРДР)
  crossborder?: CrossBorder | null; // слід в Естонії (PPRL)
  health?: HealthFacts | null; // медичні факт-сигнали (ССД/поліція)
}

/** Подія таймлайну з конкретного реєстру. */
export interface TimelineEvent {
  date: string;
  registry: RegistryCode;
  label: string;
  level1?: boolean; // дані Рівня 1 / WALLED (PSI-булеан)
  redacted?: boolean; // подія редагована за роллю (зміст закрито)
}

/** Сімейний граф — household/сиблінги (GET /entity/{id}/family, ССД-only). */
export interface FamilyMember {
  entity_id: number;
  pib: string;
  birth_date: string | null;
  is_index: boolean;
  n_registries: number;
  risk_marks: string[];
  in_care?: boolean;
}

export interface FamilyParents {
  structure: string;
  single_parent: boolean;
  both_parents: boolean;
  mother_present?: boolean;
  father_present?: boolean;
  parent_death?: boolean;
  w6_cause?: "death" | "deprivation" | null;
  rights_deprived: boolean;
  deprivation_scope?: string | null;
  parent_unemployed: boolean;
  parent_incarcerated: boolean;
  parent_criminal?: boolean;
  parent_addiction?: boolean;
  parent_mental_health?: boolean;
}

export interface FamilyHousehold {
  household_id?: number | null;
  size: number;
  n_siblings: number;
  churn_count: number;
  risk_density: number;
  density_breakdown?: Record<string, number>;
  escalated?: boolean;
}

export interface ParentalContribution {
  code: string;
  dimension: string;
  severity: number;
  value: number;
  evidence: string[];
  observability: string;
  wall: string;
  safeguard: string;
}

export interface WalledAlert {
  topic: "addiction" | "mental_health" | "criminal";
  present: boolean;
}

export interface FamilyGraph {
  role: string;
  available?: boolean;
  note?: string;
  entity_id?: number;
  household?: FamilyHousehold;
  members?: FamilyMember[];
  parents?: FamilyParents;
  relatives?: { kinship_care: boolean; kin_caregiver_relation?: string | null; protective: boolean };
  signals?: {
    sibling_in_care: boolean;
    sibling_prior_violation: string[];
    new_cohabitant_recent?: boolean;
    kinship_care: boolean;
    single_parent_unemployed: boolean;
    household_churn: number;
    parent_incarcerated: boolean;
    household_risk_density: number;
  };
  parental_contributions?: ParentalContribution[];
  walled_alerts?: WalledAlert[];
  safeguards?: Record<string, string>;
}

/** Інтейк — попередні кейси зі звернень (GET /intake). */
export interface IntakeCase {
  child_pseudonym: string;
  entity_id: number | null;
  channels: string[];
  n_reports: number;
  corroborated: boolean;
  malicious_suspected: boolean;
  matched_violations: string[];
  reaction_deadline: Msg;
  urgent: boolean;
}

export interface IntakeData {
  channels: Record<string, Msg>;
  n_reports: number;
  household: {
    n_households?: number;
    children_in_multichild?: number;
    multichild_share?: number;
    n_with_sibling_in_care?: number;
  };
  cases: IntakeCase[];
}

/** Режим моніторингу (вже-постраждалі діти): план реінтеграції (GET /monitoring). */
export interface MonitoringChild {
  entity_id: number;
  pib: string;
  oblast: string;
  cohort: string;
  cohort_ua: string;
  plan_progress: number;
  milestones: Record<string, boolean>;
  deterioration: boolean;
}

export interface MonitoringData {
  summary: { total: number; by_cohort: Record<string, number>; deteriorating: number; avg_progress: number };
  cohorts: Record<string, string>;
  children: MonitoringChild[];
}

/** Точка відвідуваності/успішності (ISUO). */
export interface AttendancePoint {
  period: string; // YYYY-MM
  absences: number;
  gpa: number;
}

export interface AttendanceSeries {
  points: AttendancePoint[];
  changePointIndex: number | null; // індекс зламу
}

export interface ViolationMetric {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
}

export interface Metrics {
  matching: {
    true_children: number;
    entities: number;
    reconstruction_rate: number;
    pure_clusters: number;
    fuzzy_attached: number;
  };
  detection: {
    overall: { precision: number; recall: number; f1: number };
    per_violation: Record<string, ViolationMetric>;
  };
  privacy: {
    n_pairs: number;
    precision: number;
    recall: number;
  };
}

export interface QueueResponse {
  count: number;
  items: QueueItem[];
}

/* ── Фаза 3: кейсворкер-навантаження, персональна черга, feedback ── */

/** Статистика навантаження по області (caseload.compute → oblast_stats). */
export interface OblastStat {
  oblast: string;
  workers: number;
  capacity: number;
  cases: number;
  covered: number;
  overflow: number;
  t0: number;
  t1: number;
  t2: number;
  utilization: number;
  urgent_uncovered: number;
  extra_workers_needed: number;
}

export interface TierDeadline {
  label: string;
  detail: string;
}

/** GET /caseload — розподіл по кейсворкерах. */
export interface CaseloadOverview {
  roster: Record<string, number>;
  capacity_per_worker: number;
  total_caseworkers: number;
  oblast_stats: OblastStat[];
  deadlines: Record<Tier, TierDeadline>;
  summary: {
    total_cases: number;
    assigned: number;
    overflow: number;
    urgent_uncovered: number;
    extra_workers_needed: number;
  };
}

/** Кейс у персональній черзі наглядача (GET /caseload/worker/{id}). */
export interface WorkerCase {
  rank: number;
  entity_id: number;
  pib: string;
  age: number | null;
  oblast: string | null;
  tier: Tier;
  score: number;
  immediate: boolean;
  violations: string[];
}

export interface WorkerQueue {
  worker_id: string;
  count: number;
  cases: WorkerCase[];
}

export type Decision = "confirmed" | "rejected" | "escalated";

export interface FeedbackInput {
  entity_id: number;
  decision: Decision;
  outcome?: string;
  caseworker?: string;
  note?: string;
}

export interface FeedbackStats {
  total: number;
  labeled: number;
  ready_to_train: boolean;
  note: string;
  by_decision?: Record<string, number>;
  by_outcome?: Record<string, number>;
}
