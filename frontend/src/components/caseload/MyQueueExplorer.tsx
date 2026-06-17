"use client";

import { useEffect, useState } from "react";
import type { WorkerCase, WorkerQueue, Tier, TierDeadline, Decision } from "@/lib/types";
import { getWorkers, getWorkerQueue, getCaseload, postFeedback, type WorkerSummary } from "@/lib/api";
import { violName } from "@/lib/registries";
import { ageLabel, formatScore, plural } from "@/lib/format";
import { TierBadge, ImmediateBadge } from "@/components/ui/badges";
import { IconChevronDown, IconCheck, IconClock } from "@/components/ui/icons";

export function MyQueueExplorer() {
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [workerId, setWorkerId] = useState<string>("");
  const [queue, setQueue] = useState<WorkerQueue | null>(null);
  const [deadlines, setDeadlines] = useState<Record<Tier, TierDeadline> | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});

  // початкове завантаження: список наглядачів + дедлайни
  useEffect(() => {
    let active = true;
    Promise.all([getWorkers(), getCaseload()]).then(([ws, cl]) => {
      if (!active) return;
      setWorkers(ws);
      setDeadlines(cl?.deadlines ?? null);
      if (ws.length) setWorkerId((id) => id || ws[0].worker_id);
    });
    return () => {
      active = false;
    };
  }, []);

  // черга обраного наглядача
  useEffect(() => {
    if (!workerId) return;
    let active = true;
    getWorkerQueue(workerId).then((q) => {
      if (active) setQueue(q);
    });
    return () => {
      active = false;
    };
  }, [workerId]);

  async function decide(entityId: number, decision: Decision) {
    setDecisions((d) => ({ ...d, [entityId]: decision })); // оптимістично
    await postFeedback({ entity_id: entityId, decision, caseworker: workerId });
  }

  const selected = workers.find((w) => w.worker_id === workerId);
  const cases = queue?.cases ?? [];
  const t0count = cases.filter((c) => c.tier === "T0").length;

  return (
    <div className="space-y-4">
      {/* селектор наглядача */}
      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="relative max-w-sm flex-1">
          <label htmlFor="worker-select" className="mb-1.5 block text-xs font-medium text-muted">
            Наглядач (служба у справах дітей)
          </label>
          <div className="relative">
            <select
              id="worker-select"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-line bg-surface py-3 pl-4 pr-10 text-sm font-medium text-ink outline-none focus:border-brand"
            >
              {workers.map((w) => (
                <option key={w.worker_id} value={w.worker_id}>
                  {w.worker_id} · {plural(w.count, "кейс", "кейси", "кейсів")}
                  {w.t0 ? ` · ${w.t0}×T0` : ""}
                </option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
          </div>
        </div>
        {selected && (
          <div className="flex gap-6">
            <Stat label="Кейсів" value={selected.count} />
            <Stat label="Сьогодні (T0)" value={t0count} tone="t0" />
          </div>
        )}
      </div>

      {t0count > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-t0-line bg-t0-soft px-4 py-3 text-sm text-t0-ink">
          <IconClock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">{plural(t0count, "кейс", "кейси", "кейсів")} рівня T0</span> —
            дедлайн реагування «{deadlines?.T0?.label ?? "1 доба"}». Почніть із них.
          </span>
        </div>
      )}

      <div className="space-y-3">
        {cases.map((c) => (
          <WorkerCaseRow
            key={c.entity_id}
            c={c}
            deadline={deadlines?.[c.tier]}
            decision={decisions[c.entity_id]}
            onDecide={decide}
          />
        ))}
        {queue && cases.length === 0 && (
          <div className="card grid place-items-center py-16 text-center text-sm text-muted">
            У цього наглядача немає призначених кейсів.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: Readonly<{ label: string; value: number; tone?: "t0" }>) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-display text-2xl font-bold tnum ${tone === "t0" ? "text-t0-ink" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

const DECISION_LABEL: Record<Decision, string> = {
  confirmed: "Підтверджено",
  rejected: "Відхилено",
  escalated: "Ескальовано",
};

function WorkerCaseRow({
  c,
  deadline,
  decision,
  onDecide,
}: Readonly<{
  c: WorkerCase;
  deadline?: TierDeadline;
  decision?: Decision;
  onDecide: (entityId: number, decision: Decision) => void;
}>) {
  return (
    <article className={`card p-4 sm:p-5 ${c.immediate ? "ring-1 ring-t0-line" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-bold tnum text-faint">#{c.rank}</span>
            <span className="font-semibold text-ink">{c.pib}</span>
            <span className="text-xs text-faint">· {ageLabel(c.age)}{c.oblast ? ` · ${c.oblast} обл.` : ""}</span>
            {c.immediate && <ImmediateBadge />}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {c.violations.map((v) => (
              <span key={v} className="rounded-md bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                {violName(v)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TierBadge tier={c.tier} />
          {deadline && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <IconClock className="h-3 w-3" /> дедлайн: {deadline.label}
            </span>
          )}
          <span className="text-[11px] text-faint">score <span className="font-semibold tnum text-ink-2">{formatScore(c.score)}</span></span>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        {decision ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-ok-ink">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ok-soft">
              <IconCheck className="h-4 w-4" />
            </span>
            Рішення зафіксовано: {DECISION_LABEL[decision]}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted">Рішення:</span>
            <button
              onClick={() => onDecide(c.entity_id, "confirmed")}
              className="rounded-lg bg-ok-soft px-3 py-1.5 text-xs font-semibold text-ok-ink ring-1 ring-ok/20 transition hover:bg-ok/15"
            >
              Підтвердити ризик
            </button>
            <button
              onClick={() => onDecide(c.entity_id, "escalated")}
              className="rounded-lg bg-t0-soft px-3 py-1.5 text-xs font-semibold text-t0-ink ring-1 ring-t0-line transition hover:bg-t0/10"
            >
              Ескалувати
            </button>
            <button
              onClick={() => onDecide(c.entity_id, "rejected")}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-ink-2"
            >
              Відхилити
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
