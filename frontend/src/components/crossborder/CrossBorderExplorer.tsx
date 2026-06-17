"use client";

import { useState } from "react";
import type { QueueItem } from "@/lib/types";
import type { Msg } from "@/lib/i18n";
import { Card, CardTitle } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/badges";
import { useTx, useLocale } from "@/components/providers/I18nProvider";

const X_LABEL: Record<string, Msg> = {
  X1_gap: { uk: "Щілина між системами", en: "Gap between systems" },
  X2_uasc: { uk: "Без супроводу (UASC)", en: "Unaccompanied (UASC)" },
  X3_med_rupture: { uk: "Розрив медицини", en: "Medical rupture" },
  X4_edu_rupture: { uk: "Розрив освіти", en: "Education rupture" },
};

const FILTERS: { key: string; label: Msg }[] = [
  { key: "all", label: { uk: "Усі крос-кордонні", en: "All cross-border" } },
  { key: "X1_gap", label: { uk: "Щілина", en: "Gap" } },
  { key: "X2_uasc", label: { uk: "Без супроводу", en: "Unaccompanied" } },
  { key: "X4_edu_rupture", label: { uk: "Розрив освіти", en: "Education rupture" } },
  { key: "X3_med_rupture", label: { uk: "Розрив медицини", en: "Medical rupture" } },
];

export function CrossBorderExplorer({ cases }: Readonly<{ cases: QueueItem[] }>) {
  const t = useTx();
  const locale = useLocale();
  const [filter, setFilter] = useState<string>("all");

  const view =
    filter === "all" ? cases : cases.filter((c) => c.violations.includes(filter));

  return (
    <Card className="p-5 sm:p-6">
      <CardTitle hint={`${cases.length} ${t({ uk: "крос-кордонних кейсів", en: "cross-border cases" })}`}>
        {t({ uk: "Кейси з естонським слідом", en: "Cases with an Estonian trace" })}
      </CardTitle>

      {/* перемикач */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key
                ? "border-brand bg-brand text-white"
                : "border-line bg-paper/40 text-muted hover:text-ink"
            }`}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {view.length === 0 ? (
        <div className="grid place-items-center py-10 text-sm text-muted">
          {t({ uk: "Немає кейсів за фільтром.", en: "No cases match the filter." })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {view.slice(0, 60).map((c) => {
            const xrisks = c.violations.filter((v) => v.startsWith("X"));
            return (
              <div
                key={c.entity_id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-paper/40 p-3.5"
              >
                <TierBadge tier={c.tier} withHorizon={false} />
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{c.pib}</span>
                    {c.age != null && (
                      <span className="text-xs text-muted">
                        {c.age} {t({ uk: "р.", en: "y.o." })}
                      </span>
                    )}
                    {c.immediate && (
                      <span className="rounded bg-t0-soft px-1.5 py-0.5 text-[10px] font-semibold text-t0-ink">
                        {t({ uk: "НЕГАЙНО", en: "IMMEDIATE" })}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-faint">
                    <span>🇺🇦 {t({ uk: "УНЗР", en: "UNZR" })}: {c.unzr ?? "—"}</span>
                    <span>🇪🇪 isikukood: {c.isikukood ?? "—"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {xrisks.map((v) => (
                    <span
                      key={v}
                      className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink"
                    >
                      {X_LABEL[v] ? t(X_LABEL[v]) : v}
                    </span>
                  ))}
                </div>
                <span className="tnum text-sm font-semibold text-ink-2">{c.score.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {locale === "en" ? (
          <>
            Every case carries <strong>both identifiers</strong> — the Ukrainian UNZR and the Estonian
            isikukood — linked by privacy-preserving record linkage (PPRL), even though no shared key exists
            between the countries. Decision support: the specialist in the relevant jurisdiction makes the call.
          </>
        ) : (
          <>
            Кожен кейс має <strong>обидва ідентифікатори</strong> — український УНЗР та естонський isikukood —
            звʼязані privacy-preserving матчингом (PPRL), хоча спільного ключа між країнами немає.
            Decision support: рішення ухвалює фахівець у відповідній юрисдикції.
          </>
        )}
      </p>
    </Card>
  );
}
