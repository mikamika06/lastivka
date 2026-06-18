/**
 * Шар даних. За замовчуванням віддає демо-моки (демо працює без backend).
 * Якщо задано NEXT_PUBLIC_API_BASE — ходить у реальний FastAPI
 * (app/api.py), із fallback на моки при помилці мережі.
 */
import type {
  QueueItem,
  Entity,
  TimelineEvent,
  AttendanceSeries,
  Metrics,
  Tier,
  CaseloadOverview,
  WorkerQueue,
  FeedbackStats,
  FeedbackInput,
  FamilyGraph,
  IntakeData,
  MonitoringData,
} from "./types";
import type { Role } from "./i18n";
import type { Persona } from "./session";
import { mockData, mockOblastOf, mockWorkers, mockWorkerQueue, MOCK_FEEDBACK_STATS } from "./mock";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";
const USE_API = API_BASE.length > 0;

export const dataSource: "api" | "demo" = USE_API ? "api" : "demo";

async function tryFetch<T>(path: string): Promise<T | null> {
  if (!USE_API) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface QueueFilter {
  tiers?: Tier[];
  immediateOnly?: boolean;
  violations?: string[];
  search?: string;
}

export async function getQueue(filter: QueueFilter = {}): Promise<QueueItem[]> {
  const remote = await tryFetch<{ items: QueueItem[] }>("/queue?limit=500");
  let items = remote?.items ?? mockData.items;

  if (filter.tiers?.length) items = items.filter((i) => filter.tiers!.includes(i.tier));
  if (filter.immediateOnly) items = items.filter((i) => i.immediate);
  if (filter.violations?.length)
    items = items.filter((i) => i.violations.some((v) => filter.violations!.includes(v)));
  if (filter.search?.trim()) {
    const q = filter.search.trim().toLowerCase();
    items = items.filter(
      (i) => i.pib.toLowerCase().includes(q) || String(i.unzr ?? "").includes(q),
    );
  }
  return items;
}

export async function getQueueItem(entityId: number): Promise<QueueItem | null> {
  const all = await getQueue();
  return all.find((i) => i.entity_id === entityId) ?? null;
}

/* ── Сегрегація за персоною (docs/FINAL_ACTOR_MODEL.md) — у ДАТА-шарі, не в JSX ──
   Скоуп БЕРЕТЬСЯ ІЗ СЕСІЇ (не з параметра виклику) → крос-скоупні id не витікають (IDOR). */
export function scopeAndRedact(items: QueueItem[], persona: Persona | null): QueueItem[] {
  if (!persona) return items;
  const ds = persona.dataScope;
  let scoped: QueueItem[];
  switch (ds) {
    case "territory": // ССД — власна громада/область
    case "oblast_agg": // регіонал — область (далі стрипимо PII)
      scoped = items.filter((i) => (i.oblast ?? "—") === persona.oblast);
      break;
    case "case": { // ЦНСП — лише власні відкриті кейси (один фахівець у своїй області)
      const inObl = items.filter((i) => (i.oblast ?? "—") === persona.oblast && i.worker_id);
      const w = persona.workerId ?? inObl[0]?.worker_id ?? null;
      scoped = inObl.filter((i) => i.worker_id === w).slice(0, 15);
      break;
    }
    case "national_pii": // омбудсман — вся країна, per-record
    case "national_agg": // наглядач — вся країна, агрегати
      scoped = items;
      break;
    default: // own_vertical / own_child — не мають доступу до загальної черги
      scoped = [];
  }
  if (!persona.pii) {
    // вирізання ПІБ у ДАТА-шарі (регіонал/наглядач): payload фізично без ідентифікаторів
    scoped = scoped.map((i) => ({ ...i, pib: `Дитина №${i.entity_id}`, unzr: null, birth_date: null }));
  }
  return scoped;
}

export function inScope(item: QueueItem | null | undefined, persona: Persona | null): boolean {
  if (!persona || !item) return !!item;
  return scopeAndRedact([item], persona).length > 0;
}

export async function getEntity(entityId: number, role?: Role): Promise<Entity | null> {
  const q = role ? `?role=${role}` : "";
  const remote = await tryFetch<Entity>(`/entity/${entityId}${q}`);
  return remote ?? mockData.entities[entityId] ?? null;
}

export async function getTimeline(entityId: number, role?: Role): Promise<TimelineEvent[]> {
  const q = role ? `?role=${role}` : "";
  const remote = await tryFetch<{ events: TimelineEvent[] }>(`/entity/${entityId}/timeline${q}`);
  return remote?.events ?? mockData.timelines[entityId] ?? [];
}

/** Сімейний граф (household/сиблінги) — крос-sibling зведення лише на рівні ССД. */
export async function getFamily(entityId: number, role: Role = "ssd"): Promise<FamilyGraph | null> {
  const remote = await tryFetch<FamilyGraph>(`/entity/${entityId}/family?role=${role}`);
  return remote ?? MOCK_FAMILY(entityId, role);
}

/** Інтейк — попередні кейси зі звернень + тріаж. */
export async function getIntake(): Promise<IntakeData> {
  const remote = await tryFetch<IntakeData>("/intake");
  return remote ?? MOCK_INTAKE;
}

/** Режим моніторингу — вже-постраждалі діти + план реінтеграції. */
export async function getMonitoring(): Promise<MonitoringData> {
  const remote = await tryFetch<MonitoringData>("/monitoring");
  return remote ?? MOCK_MONITORING;
}

export async function getAttendance(entityId: number): Promise<AttendanceSeries | null> {
  const remote = await tryFetch<AttendanceSeries>(`/entity/${entityId}/attendance`);
  return remote ?? mockData.attendance[entityId] ?? null;
}

export async function getMetrics(): Promise<Metrics> {
  const remote = await tryFetch<Metrics>("/metrics");
  return remote ?? mockData.metrics;
}

export function oblastOf(entityId: number): string {
  return mockOblastOf(entityId);
}

/** Область кейсу: реальне поле з /queue (фаза 3) із fallback на мок-довідник. */
export function oblastOfItem(item: { oblast?: string | null; entity_id: number }): string {
  return item.oblast ?? mockOblastOf(item.entity_id);
}

/* ── Фаза 3: навантаження кейсворкерів + feedback ── */
export async function getCaseload(): Promise<CaseloadOverview | null> {
  const remote = await tryFetch<CaseloadOverview>("/caseload");
  return remote ?? mockData.caseload;
}

export interface WorkerSummary {
  worker_id: string;
  oblast: string;
  count: number;
  t0: number;
}

export async function getWorkers(): Promise<WorkerSummary[]> {
  if (!USE_API) return mockWorkers();
  // у реальному API окремого списку немає — зводимо з /queue
  const items = await getQueue();
  const idx = new Map<string, WorkerSummary>();
  for (const i of items) {
    if (!i.worker_id) continue;
    const w = idx.get(i.worker_id) ?? { worker_id: i.worker_id, oblast: i.oblast ?? "—", count: 0, t0: 0 };
    w.count += 1;
    if (i.tier === "T0") w.t0 += 1;
    idx.set(i.worker_id, w);
  }
  return [...idx.values()].sort((a, b) => b.t0 - a.t0 || b.count - a.count);
}

export async function getWorkerQueue(workerId: string): Promise<WorkerQueue> {
  const remote = await tryFetch<WorkerQueue>(`/caseload/worker/${encodeURIComponent(workerId)}`);
  return remote ?? mockWorkerQueue(workerId);
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  const remote = await tryFetch<FeedbackStats>("/feedback/stats");
  return remote ?? MOCK_FEEDBACK_STATS;
}


const MOCK_INTAKE: IntakeData = {
  channels: {
    "116111": "Нацдитяча лінія (ГО «Ла Страда», цілодобово)",
    "1545": "Урядовий контактний центр (роутер)",
    "1547": "Лінія ДН / торгівля людьми (цілодобово)",
    school_duty: "Обовʼязок закладу освіти (ПКМУ №684)",
    medical_duty: "Медзаклад (≤1 доба; ≤3 год)",
  },
  n_reports: 788,
  household: { n_households: 654, children_in_multichild: 1704, multichild_share: 0.3, n_with_sibling_in_care: 41 },
  cases: [
    { child_pseudonym: "px-04417290", entity_id: 70, channels: ["1547"], n_reports: 2, corroborated: true, malicious_suspected: false, matched_violations: ["P1_physical_home"], reaction_deadline: "невідкладно / ≤3 год (загроза життю; ПКМУ №1513/2025)", urgent: true },
    { child_pseudonym: "px-01882233", entity_id: 142, channels: ["school_duty"], n_reports: 1, corroborated: true, malicious_suspected: false, matched_violations: ["W3_out_of_education"], reaction_deadline: "реєстрація негайно; оцінка безпеки ≤1 доба (ПКМУ №585/2020)", urgent: false },
    { child_pseudonym: "px-09913004", entity_id: null, channels: ["neighbor"], n_reports: 1, corroborated: false, malicious_suspected: true, matched_violations: [], reaction_deadline: "реєстрація негайно; розгляд ≤14 кал. днів (ПКМУ №585/2020)", urgent: false },
  ],
};

const MOCK_MONITORING: MonitoringData = {
  summary: { total: 383, by_cohort: { "Постраждалі внаслідок воєнних дій": 307, "Сироти / ПБП під опікою": 52, "Без супроводу (UASC)": 11, "Депортовані / примусово переміщені": 13 }, deteriorating: 194, avg_progress: 0.55 },
  cohorts: { deported: "Депортовані / примусово переміщені", uasc: "Без супроводу (UASC)", orphan_care: "Сироти / ПБП під опікою", war_affected: "Постраждалі внаслідок воєнних дій" },
  children: [
    { entity_id: 4182, pib: "Дитина №4182", oblast: "Харківська", cohort: "deported", cohort_ua: "Депортовані / примусово переміщені", plan_progress: 0.17, milestones: { "Оцінка потреб": true, "Форма влаштування": false, "Відновлення освіти": false, "Медичний супровід": false, "Психологічна реабілітація": false, "Документи / статус": false }, deterioration: true },
    { entity_id: 3771, pib: "Дитина №3771", oblast: "Львівська", cohort: "orphan_care", cohort_ua: "Сироти / ПБП під опікою", plan_progress: 0.67, milestones: { "Оцінка потреб": true, "Форма влаштування": true, "Відновлення освіти": true, "Медичний супровід": false, "Психологічна реабілітація": true, "Документи / статус": false }, deterioration: false },
  ],
};

function MOCK_FAMILY(entityId: number, role: Role): FamilyGraph {
  if (role !== "ssd") {
    return { role, available: false, note: "Сімейний граф доступний лише на рівні ССД" };
  }
  return {
    role, available: true, entity_id: entityId,
    household: { household_id: 10, size: 2, n_siblings: 1, churn_count: 1, risk_density: 0.55,
      density_breakdown: { sibling_marks: 0.27, sibling_in_care: 0.3, single_parent_unemployed: 0.2, n_siblings: 0.033 }, escalated: true },
    members: [
      { entity_id: entityId, pib: "Демо Дитина Індекс", birth_date: "2015-04-12", is_index: true, n_registries: 4, risk_marks: [], in_care: false },
      { entity_id: entityId + 1, pib: "Демо Сиблінг Один", birth_date: "2012-09-03", is_index: false, n_registries: 3, risk_marks: ["ssd", "in_care"], in_care: true },
    ],
    parents: { structure: "Одинока мати / один з батьків", single_parent: true, both_parents: false, mother_present: true, father_present: false,
      parent_death: false, w6_cause: null, rights_deprived: false, deprivation_scope: null, parent_unemployed: true,
      parent_incarcerated: false, parent_criminal: false, parent_addiction: true, parent_mental_health: false },
    relatives: { kinship_care: false, kin_caregiver_relation: null, protective: true },
    signals: { sibling_in_care: true, sibling_prior_violation: ["ssd", "in_care"], new_cohabitant_recent: false, kinship_care: false, single_parent_unemployed: true, household_churn: 1, parent_incarcerated: false, household_risk_density: 0.55 },
    parental_contributions: [
      { code: "P_sibling_in_care", dimension: "parental", severity: 0.4, value: 0.24, evidence: ["DITY"], observability: "signal-only", wall: "PSI на C1 · стіни сиблінга тримаються", safeguard: "контекст, не детермінізм" },
      { code: "P_parent_addiction", dimension: "parental", severity: 0.45, value: 0.27, evidence: ["push"], observability: "push/consent", wall: "ЕСОЗ WALLED · медтаємниця (Основи 2801-XII)", safeguard: "факт не зміст; лікування/ремісія — протективний модифікатор" },
    ],
    walled_alerts: [{ topic: "addiction", present: true }, { topic: "mental_health", present: false }, { topic: "criminal", present: false }],
    safeguards: { poverty_not_risk: "бідність — контекст, не флаг", parental_capped_below_child: "батьківські тяжкості ≤0.55", walls: "ЄРДР/ЕСОЗ ніколи не pull-яться" },
  };
}

/* ── Федеративна LRA-детекція (compute-to-data) ── */
export interface FederatedStats {
  children: number; active_lra_nodes: number; avg_nodes_per_child: number;
  walled_push_signals: number; walled_blocked: number; aggregators: number;
  mode: string; equivalence_sample: string;
}
export interface FederatedEnvelope { registry: string; blocked: boolean; signals: string[]; note?: string | null; }
export interface FederatedTrace {
  entity_id: number; active_lra_nodes: number; aggregators: number; pseudonym: string;
  envelopes: FederatedEnvelope[]; detections: string[]; note: string;
}
export async function getFederatedStats(): Promise<FederatedStats | null> {
  return tryFetch<FederatedStats>("/federated/stats");
}
export async function getFederatedTrace(id: number): Promise<FederatedTrace | null> {
  return tryFetch<FederatedTrace>(`/federated/${id}`);
}

export async function postFeedback(input: FeedbackInput): Promise<boolean> {
  if (!USE_API) return true; // демо: рішення приймаємо локально (оптимістично)
  try {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function tierCount(tier: Tier, counts: Record<Tier, number>): number {
  return counts[tier];
}

/* ── агрегати для управлінської панелі ── */
export interface DashboardStats {
  kpis: { t0: number; t1: number; t2: number; immediate: number; total: number };
  byViolation: { key: string; count: number }[];
  byRegion: { key: string; count: number }[];
  byTier: { tier: Tier; count: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const items = await getQueue();
  const t0 = items.filter((i) => i.tier === "T0").length;
  const t1 = items.filter((i) => i.tier === "T1").length;
  const t2 = items.filter((i) => i.tier === "T2").length;
  const immediate = items.filter((i) => i.immediate).length;

  const vcount = new Map<string, number>();
  for (const i of items)
    for (const v of i.violations) vcount.set(v, (vcount.get(v) ?? 0) + 1);
  const byViolation = [...vcount.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  const rcount = new Map<string, number>();
  for (const i of items) {
    const o = oblastOfItem(i);
    rcount.set(o, (rcount.get(o) ?? 0) + 1);
  }
  const byRegion = [...rcount.entries()]
    .map(([key, count]) => ({ key, count }))
    .filter((r) => r.key !== "—")
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const tierCounts: Record<Tier, number> = { T0: t0, T1: t1, T2: t2 };
  const byTier = (["T0", "T1", "T2"] as Tier[]).map((tier) => ({
    tier,
    count: tierCount(tier, tierCounts),
  }));

  return {
    kpis: { t0, t1, t2, immediate, total: items.length },
    byViolation,
    byRegion,
    byTier,
  };
}

export { TIER_META } from "./registries";
