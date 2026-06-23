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
  WorkerCase,
  FeedbackStats,
  FeedbackInput,
  CrossBorderStats,
} from "./types";
import { mockData, mockOblastOf, mockHromadaOf, MOCK_FEEDBACK_STATS } from "./mock";
import type { Role } from "./auth";

/**
 * Скоуп доступу до даних, виведений із сесії (див. auth.server.ts).
 * Передається у функції шару даних — скоуп НЕ виводиться з параметрів,
 * які надсилає клієнт, тож IDOR і витоки між громадами закриті на джерелі.
 */
export interface DataScope {
  role: Role;
  oblast: string;
  hromada: string | null;
}

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

const REDACTED_PII = "—";

/** Прибрати персональні дані з кейсу (для regional / агрегатних шляхів). */
function redactQueueItem(i: QueueItem): QueueItem {
  return { ...i, pib: REDACTED_PII, unzr: null, isikukood: null, birth_date: null };
}

function redactEntity(e: Entity): Entity {
  return { ...e, pib: REDACTED_PII, unzr: null, birth_date: null };
}

/** Чи входить кейс у скоуп користувача (громада для community, область для regional). */
function inScope(item: { oblast?: string | null; hromada?: string | null; entity_id: number }, scope: DataScope): boolean {
  if (scope.role === "community") {
    const h = item.hromada ?? mockHromadaOf(item.entity_id);
    return h === scope.hromada;
  }
  // regional: уся область
  const o = item.oblast ?? mockOblastOf(item.entity_id);
  return o === scope.oblast;
}

/**
 * Застосувати скоуп до списку кейсів:
 * - community: жорстко фільтрує по власній громаді (без редагування ПІБ);
 * - regional: фільтрує по області ТА знеособлює (без ПІБ/УНЗР/дат);
 * - scope = null (немає сесії): порожньо.
 */
function applyScope(items: QueueItem[], scope: DataScope | null): QueueItem[] {
  if (!scope) return [];
  const scoped = items.filter((i) => inScope(i, scope));
  return scope.role === "regional" ? scoped.map(redactQueueItem) : scoped;
}

/**
 * Черга реагування у межах скоупу користувача.
 * Скоуп обовʼязковий: без сесії повертається порожньо (захист на джерелі).
 */
export async function getQueue(scope: DataScope | null, filter: QueueFilter = {}): Promise<QueueItem[]> {
  const remote = await tryFetch<{ items: QueueItem[] }>("/queue?limit=500");
  let items = applyScope(remote?.items ?? mockData.items, scope);

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

/**
 * Повний (нескоуплений) перелік кейсів — ЛИШЕ для агрегатних обчислень
 * (dashboard / caseload), які за визначенням знеособлені. Не віддавати у UI ПІБ.
 */
async function getAllForAggregates(): Promise<QueueItem[]> {
  const remote = await tryFetch<{ items: QueueItem[] }>("/queue?limit=500");
  return remote?.items ?? mockData.items;
}

export async function getQueueItem(scope: DataScope | null, entityId: number): Promise<QueueItem | null> {
  const all = await getQueue(scope); // вже відфільтровано/знеособлено за скоупом
  return all.find((i) => i.entity_id === entityId) ?? null;
}

/**
 * Профіль дитини. Доступ лише якщо дитина у скоупі користувача —
 * інакше null (закриває IDOR через ?id= у URL).
 */
export async function getEntity(scope: DataScope | null, entityId: number): Promise<Entity | null> {
  if (!scope) return null;
  const remote = await tryFetch<Entity>(`/entity/${entityId}`);
  const e = remote ?? mockData.entities[entityId] ?? null;
  if (!e) return null;
  if (!inScope({ ...e, entity_id: entityId }, scope)) return null;
  return scope.role === "regional" ? redactEntity(e) : e;
}

export async function getTimeline(scope: DataScope | null, entityId: number): Promise<TimelineEvent[]> {
  // доступ до таймлайну лише для дитини у скоупі (закриває IDOR)
  if (!(await getEntity(scope, entityId))) return [];
  const remote = await tryFetch<{ events: TimelineEvent[] }>(`/entity/${entityId}/timeline`);
  return remote?.events ?? mockData.timelines[entityId] ?? [];
}

export async function getAttendance(scope: DataScope | null, entityId: number): Promise<AttendanceSeries | null> {
  if (!(await getEntity(scope, entityId))) return null;
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

const TIER_RANK: Record<Tier, number> = { T0: 0, T1: 1, T2: 2 };

/**
 * Персональна черга фахівця ССД = усі кейси його ВЛАСНОЇ громади,
 * упорядковані за терміновістю. Скоуп визначає сесія, а не клієнт,
 * тож фахівець іншої громади не отримає чужі кейси.
 * Для regional повертається порожньо (це operator-екран із ПІБ).
 */
export async function getMyQueue(scope: DataScope | null): Promise<WorkerQueue> {
  const workerId = scope?.hromada ?? "—";
  if (!scope || scope.role !== "community") {
    return { worker_id: workerId, count: 0, cases: [] };
  }
  const items = await getQueue(scope); // вже жорстко відфільтровано по громаді
  const cases: WorkerCase[] = items
    .map((i) => ({
      rank: i.rank,
      entity_id: i.entity_id,
      pib: i.pib,
      age: i.age,
      oblast: i.oblast,
      hromada: i.hromada,
      tier: i.tier,
      score: i.score,
      immediate: i.immediate,
      violations: i.violations,
    }))
    .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.score - a.score);
  return { worker_id: workerId, count: cases.length, cases };
}

export async function getFeedbackStats(): Promise<FeedbackStats> {
  const remote = await tryFetch<FeedbackStats>("/feedback/stats");
  return remote ?? MOCK_FEEDBACK_STATS;
}

const MOCK_CROSSBORDER: CrossBorderStats = {
  ee_entities: 563,
  linked: 533,
  ee_unmatched: 30,
  link_rate: 0.947,
};

export async function getCrossBorder(): Promise<CrossBorderStats> {
  const remote = await tryFetch<CrossBorderStats>("/crossborder");
  return remote ?? MOCK_CROSSBORDER;
}

/** Крос-кордонні кейси (country = EE або UA+EE) у межах скоупу користувача. */
export async function getCrossBorderCases(scope: DataScope | null): Promise<QueueItem[]> {
  const items = await getQueue(scope);
  return items.filter((i) => i.country === "UA+EE" || i.country === "EE");
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
  // Управлінська панель — суто агрегати (без ПІБ). Регіональний менеджер
  // бачить картину по всій території; персональні поля сюди не потрапляють.
  const items = await getAllForAggregates();
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
