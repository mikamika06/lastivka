"use client";

import { useState } from "react";
import type { QueueItem } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/badges";

const X_LABEL: Record<string, string> = {
  X1_gap: "Щілина між системами",
  X2_uasc: "Без супроводу (UASC)",
  X3_med_rupture: "Розрив медицини",
  X4_edu_rupture: "Розрив освіти",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Усі крос-кордонні" },
  { key: "X1_gap", label: "Щілина" },
  { key: "X2_uasc", label: "Без супроводу" },
  { key: "X4_edu_rupture", label: "Розрив освіти" },
  { key: "X3_med_rupture", label: "Розрив медицини" },
];

export function CrossBorderExplorer({ cases }: Readonly<{ cases: QueueItem[] }>) {
  const [filter, setFilter] = useState<string>("all");

  const view =
    filter === "all" ? cases : cases.filter((c) => c.violations.includes(filter));

  return (
    <Card className="p-5 sm:p-6">
      <CardTitle hint={`${cases.length} крос-кордонних кейсів`}>Кейси з естонським слідом</CardTitle>

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
            {f.label}
          </button>
        ))}
      </div>

      {view.length === 0 ? (
        <div className="grid place-items-center py-10 text-sm text-muted">Немає кейсів за фільтром.</div>
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
                    {c.age != null && <span className="text-xs text-muted">{c.age} р.</span>}
                    {c.immediate && (
                      <span className="rounded bg-t0-soft px-1.5 py-0.5 text-[10px] font-semibold text-t0-ink">
                        НЕГАЙНО
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-faint">
                    <span>🇺🇦 УНЗР: {c.unzr ?? "—"}</span>
                    <span>🇪🇪 isikukood: {c.isikukood ?? "—"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {xrisks.map((v) => (
                    <span
                      key={v}
                      className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink"
                    >
                      {X_LABEL[v] ?? v}
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
        Кожен кейс має <strong>обидва ідентифікатори</strong> — український УНЗР та естонський isikukood —
        звʼязані privacy-preserving матчингом (PPRL), хоча спільного ключа між країнами немає.
        Decision support: рішення ухвалює фахівець у відповідній юрисдикції.
      </p>
    </Card>
  );
}
