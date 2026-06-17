import type { ReactNode } from "react";
import type { RegistryCode } from "@/lib/types";
import { REG_BY_CODE, regAccess } from "@/lib/registries";
import { formatNumber } from "@/lib/format";

type Tone = "t0" | "t1" | "t2" | "brand" | "ok" | "neutral";

const TONE: Record<Tone, { num: string; dot: string; ring: string }> = {
  t0: { num: "text-t0-ink", dot: "bg-t0", ring: "hover:ring-t0-line" },
  t1: { num: "text-t1-ink", dot: "bg-t1", ring: "hover:ring-t1-line" },
  t2: { num: "text-t2-ink", dot: "bg-t2", ring: "hover:ring-t2-line" },
  brand: { num: "text-brand-ink", dot: "bg-brand", ring: "hover:ring-brand-line" },
  ok: { num: "text-ok-ink", dot: "bg-ok", ring: "hover:ring-ok/30" },
  neutral: { num: "text-ink", dot: "bg-faint", ring: "hover:ring-line" },
};

/** Велика KPI-картка (управлінська панель). */
export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className={`card group p-5 ring-1 ring-transparent transition ${t.ring}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      </div>
      <div className={`mt-3 font-display text-4xl font-bold tnum tracking-tight ${t.num}`}>
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
      {hint && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
    </div>
  );
}

/** Компактна метрика (для блоків якості моделі). */
export function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="rounded-xl border border-line bg-paper/40 px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tnum ${t.num}`}>{value}</div>
    </div>
  );
}

export function Chip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2"
    >
      {children}
    </span>
  );
}

/** Чіп реєстру-силоса з позначкою рівня доступу. */
export function RegistryChip({ code }: { code: RegistryCode }) {
  const meta = REG_BY_CODE[code];
  const level1 = regAccess(code) === 1;
  return (
    <span
      title={meta ? `${meta.ua} · ${meta.owner} · рівень доступу ${meta.access}` : code}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
        level1
          ? "border-lock/30 bg-lock-soft text-lock-ink"
          : "border-line bg-surface text-ink-2"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${level1 ? "bg-lock" : "bg-brand"}`} />
      {meta?.short ?? code}
    </span>
  );
}
