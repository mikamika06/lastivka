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
  | "ISUO"
  | "VPO"
  | "CHILDWAR"
  | "SSD"
  | "ERDR"
  | "VIOLENCE";

/** Внесок одного порушення в urgency-score (scoring.score_entity). */
export interface Contribution {
  violation: string;
  value: number; // severity * evidence * acuity
  severity: number;
  evidence: RegistryCode[]; // перетин яких реєстрів довів
  acuity: Acuity;
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
