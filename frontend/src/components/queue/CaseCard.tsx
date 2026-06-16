"use client";

import { useState } from "react";
import Link from "next/link";
import type { QueueItem } from "@/lib/types";
import { violName, regName, regAccess, ACUITY_UA } from "@/lib/registries";
import { ageLabel, formatScore } from "@/lib/format";
import { oblastOf } from "@/lib/api";
import { TierBadge, ImmediateBadge, AccessLockBadge, AcuityTag } from "@/components/ui/badges";
import { IconChevronDown, IconArrowRight, IconCheck, IconProfile } from "@/components/ui/icons";

export function CaseCard({ item, defaultOpen = false }: { item: QueueItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [taken, setTaken] = useState(false);
  const oblast = oblastOf(item.entity_id);

  return (
    <article
      className={`card overflow-hidden transition ${
        item.immediate ? "ring-1 ring-t0-line" : ""
      }`}
    >
      {/* згорнута шапка */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-paper/40 sm:px-5"
      >
        <span className="hidden w-9 shrink-0 text-center font-display text-lg font-bold tnum text-faint sm:block">
          {item.rank}
        </span>

        <span
          className="h-10 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: `var(--color-${item.tier.toLowerCase()})` }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-ink">{item.pib}</span>
            <span className="text-xs text-faint">· {ageLabel(item.age)}</span>
            {item.immediate && <ImmediateBadge />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.violations.slice(0, 3).map((v) => (
              <span key={v} className="rounded-md bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                {violName(v)}
              </span>
            ))}
            {item.violations.length > 3 && (
              <span className="text-[11px] text-faint">+{item.violations.length - 3}</span>
            )}
            {oblast !== "—" && <span className="text-[11px] text-faint">· {oblast} обл.</span>}
          </div>
        </div>

        <div className="hidden flex-col items-end sm:flex">
          <TierBadge tier={item.tier} />
          <span className="mt-1 text-xs text-faint">
            score <span className="font-semibold tnum text-ink-2">{formatScore(item.score)}</span>
          </span>
        </div>

        <IconChevronDown
          className={`h-5 w-5 shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* розкрите пояснення */}
      {open && (
        <div className="grid gap-5 border-t border-line bg-paper/30 px-4 py-5 sm:px-5 lg:grid-cols-[1fr_300px]">
          {/* пояснення score */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Чому в черзі — пояснення score
            </h4>
            <ul className="space-y-3">
              {item.contributions.map((c, i) => {
                const lvl1 = c.evidence.filter((e) => regAccess(e) === 1);
                return (
                  <li key={i} className="rounded-xl border border-line bg-surface p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{violName(c.violation)}</span>
                      <span className="text-xs text-muted">
                        внесок{" "}
                        <span className="font-semibold tnum text-brand-ink">{c.value.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>
                        тяжкість <span className="font-medium text-ink-2 tnum">{c.severity.toFixed(2)}</span>
                      </span>
                      <AcuityTag acuity={c.acuity} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-faint">перетин реєстрів:</span>
                      {c.evidence.map((e) => (
                        <span
                          key={e}
                          className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                            regAccess(e) === 1 ? "bg-lock-soft text-lock-ink" : "bg-brand-soft text-brand-ink"
                          }`}
                        >
                          {regName(e)}
                        </span>
                      ))}
                    </div>
                    {lvl1.length > 0 && (
                      <div className="mt-2">
                        <AccessLockBadge registries={lvl1.map(regName)} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              ℹ️ Жодне порушення не доводить один реєстр — доводить <span className="font-medium">перетин</span>{" "}
              сигналів. Acuity ({Object.values(ACUITY_UA).join(" / ")}) відображає свіжість зламу.
            </p>
          </div>

          {/* права колонка: score + дія */}
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted">Urgency score</div>
                  <div className="font-display text-3xl font-extrabold tnum text-ink">
                    {formatScore(item.score)}
                  </div>
                </div>
                <TierBadge tier={item.tier} withHorizon={false} />
              </div>
              <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                <Row label="Вразливість ×" value={`${item.vulnerability.toFixed(2)}`} />
                <Row label="Реєстрів" value={String(item.registries.length)} />
                <Row label="УНЗР" value={item.unzr ?? "— (матч по ПІБ+дата)"} mono />
              </div>
              {item.vuln_factors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.vuln_factors.map((f) => (
                    <span key={f} className="rounded-md bg-paper-2 px-1.5 py-0.5 text-[11px] text-muted">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setTaken((v) => !v)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  taken
                    ? "bg-ok-soft text-ok-ink ring-1 ring-ok/20"
                    : "bg-ink text-white hover:bg-[#23232a]"
                }`}
              >
                {taken ? <IconCheck className="h-4 w-4" /> : null}
                {taken ? "Взято в роботу" : "Взяти в роботу"}
              </button>
              <Link
                href={`/profile?id=${item.entity_id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-paper-2"
              >
                <IconProfile className="h-4 w-4" />
                Профіль дитини
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="text-[11px] leading-relaxed text-faint">
              Decision support: рішення ухвалює спеціаліст. «Взяти в роботу» — демо-заглушка статусу
              кейсу.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`text-right font-medium text-ink-2 ${mono ? "tnum text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}
