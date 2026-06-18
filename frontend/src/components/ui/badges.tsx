"use client";

import type { Tier, Acuity } from "@/lib/types";
import { TIER_META, TIER_HORIZON, ACUITY_MSG } from "@/lib/registries";
import { useTx } from "@/components/providers/I18nProvider";

const TIER_CLASS: Record<Tier, string> = {
  T0: "bg-t0-soft text-t0-ink ring-t0-line",
  T1: "bg-t1-soft text-t1-ink ring-t1-line",
  T2: "bg-t2-soft text-t2-ink ring-t2-line",
};
const TIER_DOT: Record<Tier, string> = {
  T0: "bg-t0",
  T1: "bg-t1",
  T2: "bg-t2",
};

export function TierBadge({ tier, withHorizon = true }: Readonly<{ tier: Tier; withHorizon?: boolean }>) {
  const t = useTx();
  const m = TIER_META[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${TIER_CLASS[tier]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier]}`} />
      {m.label}
      {withHorizon && <span className="font-medium opacity-70">· {t(TIER_HORIZON[tier])}</span>}
    </span>
  );
}

export function ImmediateBadge() {
  const t = useTx();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-t0 px-2.5 py-1 text-xs font-bold text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-white" />{" "}
      {t({ uk: "НЕГАЙНО", en: "IMMEDIATE" })}
    </span>
  );
}

export function AccessLockBadge({ registries }: Readonly<{ registries: string[] }>) {
  const t = useTx();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-lock-soft px-2 py-0.5 text-xs font-medium text-lock-ink"
      title={t({
        uk: "Найчутливіші дані: видно лише сигнал «є / немає», без доступу до вмісту. Повний доступ — тільки за рішенням суду (лікарська таємниця).",
        en: "Most sensitive data: only a yes/no signal is visible, with no access to the content. Full access requires a court order (medical confidentiality).",
      })}
    >
      <LockIcon className="h-3 w-3" />
      {t({ uk: "Рівень-1", en: "Level-1" })} {registries.length > 0 && `(${registries.join(", ")})`}
    </span>
  );
}

function acuityColor(acuity: Acuity): string {
  if (acuity === "acute") return "text-t0-ink bg-t0-soft";
  if (acuity === "active") return "text-t1-ink bg-t1-soft";
  return "text-muted bg-paper-2";
}

export function AcuityTag({ acuity }: Readonly<{ acuity: Acuity }>) {
  const t = useTx();
  const color = acuityColor(acuity);
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${color}`}>
      {t(ACUITY_MSG[acuity])}
    </span>
  );
}

export function LockIcon({ className = "h-4 w-4" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" fill="currentColor" opacity="0.18" />
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
