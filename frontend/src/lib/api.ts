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
} from "./types";
import { mockData, mockOblastOf } from "./mock";

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
    const o = oblastOf(i.entity_id);
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
