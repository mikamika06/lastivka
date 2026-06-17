/**
 * Типи даних Ластівки — дзеркало контракту backend
 * (lastivka/scoring.py, matching.py, pipeline.py, app/api.py).
 */

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
  | "EISSS"
  | "EDRSR"
  | "SKAID"
  | "PFU"
  | "DRRP"
  | "HOTLINE"
  // естонські реєстри (фаза 4, крос-кордон)
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

/** Вимір ризику: власні сигнали дитини чи батьківські/сімейні. */
export type RiskDimension = "child" | "parental";

/** Сила доказу (King 2013, Besemer): вирок > підтверджено > звернення > невідомо. */
export type EvidenceStrength = "adjudicated" | "substantiated" | "alleged" | "unknown";

/** Стосунок кривдника до дитини (re-perpetration: вітчим → новий потерпілий). */
export type Relationship = "biological" | "stepparent" | "other";

/** Тип батьківського/сімейного фактора ризику (SUBSTANCE_FEATURES §1–4,8). */
export type ParentalKind =
  | "crime_violent" // насильницький злочин батька/матері (ЄРДР/ЄДРСР)
  | "crime_other" // інший злочин опікуна
  | "dv_abuser" // домашнє насильство, кривдник — батько/вітчим
  | "deprivation" // позбавлення/обмеження батьківських прав (ЄДРСР)
  | "bereavement" // смерть одного з батьків (ДРАЦС)
  | "addiction" // залежність із впливом на догляд
  | "mental_health" // психічний розлад із впливом на догляд
  | "economic_shock" // санкція/припинення допомоги, безробіття годувальника (НЕ бідність)
  | "sibling_harm"; // підтверджене насильство над братом/сестрою

/** Внесок одного фактора в urgency-score (scoring.score_entity). */
export interface Contribution {
  violation: string; // код порушення (W*/F*/…) або батьківського фактора (PAR_*)
  value: number; // severity * evidence * acuity (× субстантивні модифікатори)
  severity: number;
  evidence: RegistryCode[]; // перетин яких реєстрів довів
  acuity: Acuity;
  dimension?: RiskDimension; // "child" (за замовч.) | "parental"
  evidence_strength?: EvidenceStrength; // сила доказу (для батьківських факторів)
  relationship?: Relationship; // стосунок кривдника (crime/dv)
  role?: "victim" | "witness"; // роль дитини у ДН
  recency_months?: number; // давність події (міс.) для згасання
}

/** Кейс у черзі реагування (pipeline.queue / GET /queue). */
export interface QueueItem {
  rank: number;
  entity_id: number;
  unzr: string | null;
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
  country?: Country; // UA | EE | UA+EE (крос-кордон, фаза 4)
  isikukood?: string | null; // естонський код (для крос-кордонних кейсів)
  link_score?: number; // оцінка PPRL-звʼязку UA↔EE (0..1)
}

/** Крос-реєстровий профіль дитини (matching.match / GET /entity/{id}). */
export interface Entity {
  entity_id: number;
  unzr: string | null;
  pib: string;
  birth_date: string | null;
  registries: RegistryCode[];
  n_registries: number;
  records: Partial<Record<RegistryCode, number>>;
  oblast?: string;
}

/** Подія таймлайну з конкретного реєстру. */
export interface TimelineEvent {
  date: string;
  registry: RegistryCode;
  label: string;
  level1?: boolean; // дані Рівня 1 (PSI-булеан)
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
