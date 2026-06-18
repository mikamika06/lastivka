"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkerCase, WorkerQueue, Tier, TierDeadline, Decision } from "@/lib/types";
import type { Msg } from "@/lib/i18n";
import { getWorkers, getWorkerQueue, getCaseload, postFeedback, oblastName, oblastLabel, type WorkerSummary } from "@/lib/api";
import { violName, TIER_DEADLINE_MSG } from "@/lib/registries";
import { ageLabel, formatScore, pluralLoc } from "@/lib/format";
import { displayName } from "@/lib/translit";
import { TierBadge, ImmediateBadge } from "@/components/ui/badges";
import { IconChevronDown, IconCheck, IconClock, IconProfile } from "@/components/ui/icons";
import { useTx, useLocale } from "@/components/providers/I18nProvider";

export function MyQueueExplorer({ oblast: oblastScope = null }: Readonly<{ oblast?: string | null }>) {
  const t = useTx();
  const locale = useLocale();
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [workerId, setWorkerId] = useState<string>("");
  const [queue, setQueue] = useState<WorkerQueue | null>(null);
  const [deadlines, setDeadlines] = useState<Record<Tier, TierDeadline> | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [sortBy, setSortBy] = useState<"urgency" | "name">("urgency");

  useEffect(() => {
    let active = true;
    Promise.all([getWorkers(oblastScope), getCaseload()]).then(([ws, cl]) => {
      if (!active) return;
      setWorkers(ws);
      setDeadlines(cl?.deadlines ?? null);
      if (ws.length) setWorkerId((id) => id || ws[0].worker_id);
    });
    return () => {
      active = false;
    };
  }, [oblastScope]);

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
    setDecisions((d) => ({ ...d, [entityId]: decision }));
    await postFeedback({ entity_id: entityId, decision, caseworker: workerId });
  }

  const cases = useMemo(() => {
    const list = [...(queue?.cases ?? [])];
    const order: Record<Tier, number> = { T0: 0, T1: 1, T2: 2 };
    if (sortBy === "name") {
      list.sort((a, b) => displayName(a.pib, locale).localeCompare(displayName(b.pib, locale), locale));
    } else {
      list.sort(
        (a, b) =>
          order[a.tier] - order[b.tier] ||
          Number(b.immediate) - Number(a.immediate) ||
          b.score - a.score,
      );
    }
    return list;
  }, [queue, sortBy, locale]);
  const t0count = cases.filter((c) => c.tier === "T0").length;
  const t1count = cases.filter((c) => c.tier === "T1").length;
  const doneCount = cases.filter((c) => decisions[c.entity_id]).length;
  const oblast = workers.find((w) => w.worker_id === workerId)?.oblast ?? "—";

  // worker_id = «<область>-<n>»; на показ локалізуємо префікс області (значення лишається UA).
  const workerLabel = (id: string, obl: string): string => {
    const suffix = id.startsWith(`${obl}-`) ? id.slice(obl.length) : "";
    return suffix ? `${oblastName(obl, locale)}${suffix}` : id;
  };

  return (
    <div className="space-y-4">
      {/* шапка кабінету */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
              <IconProfile className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <h2 className="h-display truncate text-xl font-bold">{workerId ? `${t({ uk: "Робоче місце", en: "Workstation" })} ${workerLabel(workerId, oblast)}` : t({ uk: "Кабінет фахівця", en: "Specialist workspace" })}</h2>
              <p className="mt-0.5 truncate text-sm text-muted">
                {t({ uk: "Фахівець служби у справах дітей", en: "Children's Services specialist" })} · {oblastLabel(oblast, locale)}
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-xs">
            <label htmlFor="worker-select" className="mb-1.5 block text-xs font-medium text-muted">
              {t({ uk: "Робоче місце — оберіть фахівця", en: "Workstation — choose a specialist" })}
            </label>
            <div className="relative">
              <select
                id="worker-select"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-line bg-surface py-2.5 pl-4 pr-10 text-sm font-medium text-ink outline-none focus:border-brand"
              >
                {workers.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {workerLabel(w.worker_id, w.oblast)} · {pluralLoc(w.count, { uk: ["дитина", "дитини", "дітей"], en: ["child", "children"] }, locale)}
                    {w.t0 ? ` · ${w.t0} ${t({ uk: "терміново", en: "urgent" })}` : ""}
                  </option>
                ))}
              </select>
              <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
            </div>
          </div>
        </div>

        {/* статистика */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5 sm:grid-cols-4">
          <Stat label={t({ uk: "Дітей у роботі", en: "Children in caseload" })} value={cases.length} />
          <Stat label={t({ uk: "Терміново сьогодні", en: "Urgent today" })} value={t0count} tone="t0" />
          <Stat label={t({ uk: "Цей тиждень", en: "This week" })} value={t1count} tone="t1" />
          <Stat label={t({ uk: "Опрацьовано", en: "Processed" })} value={`${doneCount} / ${cases.length}`} tone="ok" />
        </div>

        {/* прогрес опрацювання */}
        {cases.length > 0 && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
              <div
                className="h-full rounded-full bg-ok transition-[width] duration-500"
                style={{ width: `${Math.round((doneCount / cases.length) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {cases.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="mr-0.5 text-xs font-medium text-muted">{t({ uk: "Сортувати", en: "Sort" })}</span>
          <button
            onClick={() => setSortBy("urgency")}
            aria-pressed={sortBy === "urgency"}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
              sortBy === "urgency" ? "bg-primary text-primary-fg ring-primary" : "bg-surface text-faint ring-line hover:text-ink-2"
            }`}
          >
            {t({ uk: "Терміновість", en: "Urgency" })}
          </button>
          <button
            onClick={() => setSortBy("name")}
            aria-pressed={sortBy === "name"}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
              sortBy === "name" ? "bg-primary text-primary-fg ring-primary" : "bg-surface text-faint ring-line hover:text-ink-2"
            }`}
          >
            {t({ uk: "Імʼя", en: "Name" })}
          </button>
        </div>
      )}

      {t0count > doneCount && (
        <div className="flex items-start gap-2 rounded-xl border border-t0-line bg-t0-soft px-4 py-3 text-sm text-t0-ink">
          <IconClock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">{pluralLoc(t0count, { uk: ["дитина", "дитини", "дітей"], en: ["child", "children"] }, locale)} {t({ uk: "потребує реакції сьогодні", en: "need a response today" })}</span>{" "}
            — {t({ uk: "строк", en: "deadline" })} «{t(TIER_DEADLINE_MSG.T0.label)}». {t({ uk: "Почніть із них.", en: "Start with them." })}
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
            {t({ uk: "На цього фахівця наразі не призначено жодної дитини.", en: "No children are currently assigned to this specialist." })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: Readonly<{ label: string; value: number | string; tone?: "t0" | "t1" | "ok" }>) {
  const color =
    tone === "t0" ? "text-t0-ink" : tone === "t1" ? "text-t1-ink" : tone === "ok" ? "text-ok-ink" : "text-ink";
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 font-display text-2xl font-bold tnum ${color}`}>{value}</div>
    </div>
  );
}

const DECISION_LABEL: Record<Decision, Msg> = {
  confirmed: { uk: "Ризик підтверджено", en: "Risk confirmed" },
  rejected: { uk: "Знято з розгляду", en: "Dismissed" },
  escalated: { uk: "Передано вище", en: "Escalated" },
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
  const t = useTx();
  const locale = useLocale();
  return (
    <article className={`card p-4 sm:p-5 ${c.immediate ? "ring-1 ring-t0-line" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-bold tnum text-faint">#{c.rank}</span>
            <span className="font-semibold text-ink">{displayName(c.pib, locale)}</span>
            <span className="text-xs text-faint">· {ageLabel(c.age, locale)}{c.oblast ? ` · ${oblastLabel(c.oblast, locale)}` : ""}</span>
            {c.immediate && <ImmediateBadge />}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {c.violations.map((v) => (
              <span key={v} className="rounded-md bg-paper-2 px-2 py-0.5 text-xs font-medium text-ink-2">
                {violName(v, locale)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TierBadge tier={c.tier} />
          {deadline && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <IconClock className="h-3 w-3" /> {t({ uk: "строк", en: "deadline" })}: {t(TIER_DEADLINE_MSG[c.tier].label)}
            </span>
          )}
          <span className="text-xs text-faint">
            {t({ uk: "індекс терміновості", en: "urgency index" })} <span className="font-semibold tnum text-ink-2">{formatScore(c.score)}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        {decision ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-ok-ink">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ok-soft">
              <IconCheck className="h-4 w-4" />
            </span>
            {t({ uk: "Рішення зафіксовано", en: "Decision recorded" })}: {t(DECISION_LABEL[decision])}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted">{t({ uk: "Рішення фахівця", en: "Specialist decision" })}:</span>
            <button
              onClick={() => onDecide(c.entity_id, "confirmed")}
              className="rounded-lg bg-ok-soft px-3 py-1.5 text-xs font-semibold text-ok-ink ring-1 ring-ok/20 transition hover:bg-ok/15"
            >
              {t({ uk: "Підтвердити ризик", en: "Confirm risk" })}
            </button>
            <button
              onClick={() => onDecide(c.entity_id, "escalated")}
              className="rounded-lg bg-t0-soft px-3 py-1.5 text-xs font-semibold text-t0-ink ring-1 ring-t0-line transition hover:bg-t0/10"
            >
              {t({ uk: "Передати вище", en: "Escalate" })}
            </button>
            <button
              onClick={() => onDecide(c.entity_id, "rejected")}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-ink-2"
            >
              {t({ uk: "Зняти з розгляду", en: "Dismiss" })}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
