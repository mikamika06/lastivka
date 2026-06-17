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
  CrossBorderStats,
} from "./types";
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

export async function getEntity(entityId: number): Promise<Entity | null> {
  const remote = await tryFetch<Entity>(`/entity/${entityId}`);
  return remote ?? mockData.entities[entityId] ?? null;
}

export async function getTimeline(entityId: number): Promise<TimelineEvent[]> {
  const remote = await tryFetch<{ events: TimelineEvent[] }>(`/entity/${entityId}/timeline`);
  return remote?.events ?? mockData.timelines[entityId] ?? [];
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

/* ── Фаза 4: крос-кордон UA↔EE ── */
export async function getCrossBorder(): Promise<CrossBorderStats> {
  const remote = await tryFetch<CrossBorderStats>("/crossborder");
  return remote ?? mockData.crossborder;
}

/** Крос-кордонні кейси (country містить EE) із черги. */
export async function getCrossBorderCases(): Promise<QueueItem[]> {
  const items = await getQueue();
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
  byParental: { key: string; count: number }[]; // розподіл батьківських/сімейних факторів
  parentalChildren: number; // скільки дітей мають вагомий батьківський фактор
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

  // батьківські/сімейні фактори (фаза 5): розподіл за типом + охоплення
  const pcount = new Map<string, number>();
  let parentalChildren = 0;
  for (const i of items) {
    const par = i.contributions.filter((c) => c.dimension === "parental" || c.violation.startsWith("PAR_"));
    if (par.length) parentalChildren += 1;
    for (const c of par) pcount.set(c.violation, (pcount.get(c.violation) ?? 0) + 1);
  }
  const byParental = [...pcount.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  return {
    kpis: { t0, t1, t2, immediate, total: items.length },
    byViolation,
    byRegion,
    byTier,
    byParental,
    parentalChildren,
  };
}

export { TIER_META } from "./registries";
