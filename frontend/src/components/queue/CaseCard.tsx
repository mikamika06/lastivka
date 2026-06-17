"use client";

import { useState } from "react";
import Link from "next/link";
import type { QueueItem } from "@/lib/types";
import { violName, regName, regAccess, ACUITY_MSG, vulnFactorLabel } from "@/lib/registries";
import { ageLabel, formatScore } from "@/lib/format";
import { oblastOfItem } from "@/lib/api";
import { TierBadge, ImmediateBadge, AccessLockBadge, AcuityTag } from "@/components/ui/badges";
import { IconChevronDown, IconArrowRight, IconCheck, IconProfile } from "@/components/ui/icons";
import { useTx, useLocale } from "@/components/providers/I18nProvider";

export function CaseCard({ item, defaultOpen = false }: Readonly<{ item: QueueItem; defaultOpen?: boolean }>) {
  const t = useTx();
  const locale = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [taken, setTaken] = useState(false);
  const oblast = oblastOfItem(item);

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
            <span className="text-xs text-faint">· {ageLabel(item.age, locale)}</span>
            {item.immediate && <ImmediateBadge />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.violations.slice(0, 3).map((v) => (
              <span key={v} className="rounded-md bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                {violName(v, locale)}
              </span>
            ))}
            {item.violations.length > 3 && (
              <span className="text-[11px] text-faint">+{item.violations.length - 3}</span>
            )}
            {oblast !== "—" && (
              <span className="text-[11px] text-faint">· {oblast} {t({ uk: "обл.", en: "oblast" })}</span>
            )}
          </div>
        </div>

        <div className="hidden flex-col items-end sm:flex">
          <TierBadge tier={item.tier} />
          <span className="mt-1 text-xs text-faint">
            {t({ uk: "індекс терміновості", en: "urgency index" })}{" "}
            <span className="font-semibold tnum text-ink-2">{formatScore(item.score)}</span>
          </span>
        </div>

        <IconChevronDown
          className={`h-5 w-5 shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* розкрите пояснення */}
      {open && (
        <div className="grid gap-5 border-t border-line bg-paper/30 px-4 py-5 sm:px-5 lg:grid-cols-[1fr_300px]">
          {/* пояснення індексу терміновості */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              {t({ uk: "Чому в черзі — пояснення індексу терміновості", en: "Why in queue — urgency index explained" })}
            </h4>
            <ul className="space-y-3">
              {item.contributions.map((c) => {
                const lvl1 = c.evidence.filter((e) => regAccess(e) === 1);
                return (
                  <li key={c.violation} className="rounded-xl border border-line bg-surface p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{violName(c.violation, locale)}</span>
                      <span className="text-xs text-muted">
                        {t({ uk: "внесок", en: "contribution" })}{" "}
                        <span className="font-semibold tnum text-brand-ink">{c.value.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>
                        {t({ uk: "тяжкість", en: "severity" })}{" "}
                        <span className="font-medium text-ink-2 tnum">{c.severity.toFixed(2)}</span>
                      </span>
                      <AcuityTag acuity={c.acuity} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-faint">
                        {t({ uk: "збіг сигналів з кількох реєстрів:", en: "signal overlap across registries:" })}
                      </span>
                      {c.evidence.map((e) => (
                        <span
                          key={e}
                          className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                            regAccess(e) === 1 ? "bg-lock-soft text-lock-ink" : "bg-brand-soft text-brand-ink"
                          }`}
                        >
                          {regName(e, locale)}
                        </span>
                      ))}
                    </div>
                    {lvl1.length > 0 && (
                      <div className="mt-2">
                        <AccessLockBadge registries={lvl1.map((e) => regName(e, locale))} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              {t({
                uk: "Жодне порушення не доводить один реєстр — доводить ",
                en: "No single registry proves a violation — it is proven by the ",
              })}
              <span className="font-medium">{t({ uk: "збіг сигналів", en: "signal overlap" })}</span>{" "}
              {t({
                uk: "з кількох реєстрів. Свіжість сигналу",
                en: "across several registries. Signal recency",
              })}{" "}
              ({Object.values(ACUITY_MSG).map((m) => t(m)).join(" / ")}){" "}
              {t({
                uk: "показує, наскільки недавно почалося погіршення.",
                en: "shows how recently the deterioration began.",
              })}
            </p>
          </div>

          {/* права колонка: індекс терміновості + дія */}
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted">{t({ uk: "Індекс терміновості", en: "Urgency index" })}</div>
                  <div className="font-display text-3xl font-bold tnum text-ink">
                    {formatScore(item.score)}
                  </div>
                </div>
                <TierBadge tier={item.tier} withHorizon={false} />
              </div>
              <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                <Row label={t({ uk: "Вразливість ×", en: "Vulnerability ×" })} value={`${item.vulnerability.toFixed(2)}`} />
                <Row label={t({ uk: "Реєстрів", en: "Registries" })} value={String(item.registries.length)} />
                <Row
                  label={t({ uk: "УНЗР", en: "UNZR" })}
                  value={item.unzr ?? t({ uk: "— (зіставлення за ПІБ+дата)", en: "— (matched by name + date)" })}
                  mono
                />
              </div>
              {item.vuln_factors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.vuln_factors.map((f) => (
                    <span key={f} className="rounded-md bg-paper-2 px-1.5 py-0.5 text-[11px] text-muted">
                      {vulnFactorLabel(f, locale)}
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
                    : "bg-primary text-primary-fg hover:opacity-90"
                }`}
              >
                {taken ? <IconCheck className="h-4 w-4" /> : null}
                {taken ? t({ uk: "Взято в роботу", en: "Taken on" }) : t({ uk: "Взяти в роботу", en: "Take on" })}
              </button>
              <Link
                href={`/profile?id=${item.entity_id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-paper-2"
              >
                <IconProfile className="h-4 w-4" />
                {t({ uk: "Профіль дитини", en: "Child profile" })}
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="text-[11px] leading-relaxed text-faint">
              {t({
                uk: "Підтримка рішень, не вирок: остаточне рішення ухвалює фахівець. «Взяти в роботу» — демо-приклад зміни статусу дитини.",
                en: "Decision support, not a verdict: the final decision is made by a specialist. “Take on” is a demo example of changing a child's status.",
              })}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function Row({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`text-right font-medium text-ink-2 ${mono ? "tnum text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}
