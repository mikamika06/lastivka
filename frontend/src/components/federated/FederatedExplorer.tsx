"use client";

import { useEffect, useState } from "react";
import type { QueueItem } from "@/lib/types";
import { getFederatedTrace, type FederatedStats, type FederatedTrace } from "@/lib/api";
import { violName } from "@/lib/registries";
import { useTx, useLocale } from "@/components/providers/I18nProvider";
import { Card, CardTitle } from "@/components/ui/Card";
import { IconChevronDown } from "@/components/ui/icons";

const REG_LABEL: Record<string, string> = {
  DRACS: "ДРАЦС", EDDR: "ЄДДР", EHEALTH: "ЕСОЗ", EDEBO: "ЄДЕБО", AIKOM: "АІКОМ/ІСУО",
  VPO: "ВПО", CHILDWAR: "Діти війни", DITY: "ЄІАС «Діти»", ERDR: "ЄРДР", DV: "Реєстр ДН",
  CBI_DISABILITY: "ЦБІ (інвалідність)", EDRSR: "ЄДРСР (суди)", DRRP: "ДРРП (житло)",
  PFU: "ПФУ", HOTLINE: "Гарячі лінії", SKAID: "СКАЙД", EISSS: "ЄІССС",
  RAHV: "RAHV (EE)", EHIS_EE: "EHIS (EE)", SKAIS: "SKAIS (EE)", TERVIS: "TERVIS (EE)",
};
const WALLED = new Set(["EHEALTH", "ERDR", "TERVIS"]);

export function FederatedExplorer({ items, stats }: Readonly<{ items: QueueItem[]; stats: FederatedStats | null }>) {
  const t = useTx();
  const locale = useLocale();
  // спершу діти з порушеннями (цікавіша траса)
  const sorted = [...items].sort((a, b) => (b.violations?.length ?? 0) - (a.violations?.length ?? 0));
  const [selectedId, setSelectedId] = useState<number>(sorted[0]?.entity_id);
  const [trace, setTrace] = useState<FederatedTrace | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedId === undefined) return;
    let active = true;
    setLoading(true);
    getFederatedTrace(selectedId).then((tr) => { if (active) { setTrace(tr); setLoading(false); } });
    return () => { active = false; };
  }, [selectedId]);

  const emitted = trace?.envelopes.filter((e) => !e.blocked && e.signals.length > 0) ?? [];
  const silent = trace?.envelopes.filter((e) => !e.blocked && e.signals.length === 0) ?? [];
  const blocked = trace?.envelopes.filter((e) => e.blocked) ?? [];

  return (
    <div className="space-y-5">
      {/* статистика мережі вузлів */}
      {stats && (
        <Card className="p-5">
          <CardTitle hint={t({ uk: "compute-to-data: обчислення біля даних", en: "compute-to-data" })}>
            {t({ uk: "Мережа LRA-вузлів (прод-режим)", en: "LRA node network (production mode)" })}
          </CardTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label={t({ uk: "Активних LRA-вузлів", en: "Active LRA nodes" })} value={stats.active_lra_nodes.toLocaleString("uk")} />
            <Stat label={t({ uk: "Вузлів на дитину", en: "Nodes per child" })} value={String(stats.avg_nodes_per_child)} />
            <Stat label={t({ uk: "Агрегаторів (C1)", en: "Aggregators (C1)" })} value={String(stats.aggregators)} />
            <Stat label={t({ uk: "Walled через push", en: "Walled via push" })} value={stats.walled_push_signals.toLocaleString("uk")} />
          </div>
          <p className="mt-3 rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-xs text-brand-ink">
            {t({ uk: "Доказ еквівалентності: ", en: "Equivalence proof: " })}<strong>{stats.equivalence_sample}</strong>
            {t({ uk: " — той самий результат, що й централь, але дані силосів не перетинають межу.", en: " — same result as centralized, raw silo data never crosses." })}
          </p>
        </Card>
      )}

      {/* вибір дитини */}
      <div className="max-w-xl">
        <label htmlFor="fed-child" className="mb-1.5 block text-xs font-medium text-muted">
          {t({ uk: "Дитина для траси", en: "Child to trace" })}
        </label>
        <div className="relative">
          <select id="fed-child" value={selectedId} onChange={(e) => setSelectedId(Number(e.target.value))}
            className="w-full appearance-none rounded-xl border border-line bg-surface py-3 pl-4 pr-10 text-sm font-medium text-ink outline-none focus:border-brand">
            {sorted.map((i) => (
              <option key={i.entity_id} value={i.entity_id}>
                {i.pib} · {i.tier} · {(i.violations?.length ?? 0)} {t({ uk: "порушень", en: "violations" })}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        </div>
      </div>

      {/* ПОТІК: вузли → агрегатор → порушення */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.8fr_1fr]">
        {/* col 1: LRA-вузли */}
        <Card className="p-5">
          <CardTitle hint={t({ uk: "кожен реєстр рахує локально", en: "each registry computes locally" })}>
            {t({ uk: "1 · Реєстри-сховища (LRA-вузли)", en: "1 · Registry stores (LRA nodes)" })}
          </CardTitle>
          {loading ? <Loader /> : (
            <div className="space-y-2">
              {emitted.map((e) => (
                <div key={e.registry} className="rounded-lg border border-line bg-surface p-2.5">
                  <div className="mb-1 text-xs font-semibold text-ink">{REG_LABEL[e.registry] ?? e.registry}</div>
                  <div className="flex flex-wrap gap-1">
                    {e.signals.map((s) => (
                      <span key={s} className="rounded bg-brand-soft px-1.5 py-px font-mono text-[10px] text-brand-ink">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
              {blocked.map((e) => (
                <div key={e.registry} className="rounded-lg border border-lock/30 bg-lock-soft/50 p-2.5">
                  <div className="text-xs font-semibold text-lock-ink">{REG_LABEL[e.registry] ?? e.registry} · {t({ uk: "WALLED", en: "WALLED" })}</div>
                  <div className="mt-0.5 text-[10px] leading-tight text-faint">{t({ uk: "pull заборонено — лише авторизований push", en: "pull blocked — authorized push only" })}</div>
                </div>
              ))}
              {silent.length > 0 && (
                <div className="text-[11px] text-faint">
                  {t({ uk: "Без сигналів: ", en: "No signals: " })}{silent.map((e) => REG_LABEL[e.registry] ?? e.registry).join(", ")}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* col 2: агрегатор */}
        <Card className="flex flex-col items-center justify-center p-5 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-faint">{t({ uk: "2 · C1-агрегатор", en: "2 · C1 aggregator" })}</div>
          <div className="my-2 text-3xl text-brand">→</div>
          <div className="text-sm font-medium text-ink">{t({ uk: "зведення за псевдонімом", en: "intersect by pseudonym" })}</div>
          <div className="mt-1 break-all rounded bg-paper-2 px-2 py-1 font-mono text-[10px] text-muted">{trace?.pseudonym?.slice(0, 24)}…</div>
          <div className="mt-2 text-[11px] text-faint">{trace?.active_lra_nodes} {t({ uk: "вузлів → 1 агрегатор", en: "nodes → 1 aggregator" })}</div>
          <div className="mt-2 text-[10px] leading-tight text-faint">{t({ uk: "HMAC(УНЗР), не сам УНЗР", en: "HMAC(UNZR), not UNZR" })}</div>
        </Card>

        {/* col 3: порушення */}
        <Card className="p-5">
          <CardTitle hint={t({ uk: "перетин сигналів", en: "signal intersection" })}>
            {t({ uk: "3 · Виявлені порушення", en: "3 · Detected violations" })}
          </CardTitle>
          {loading ? <Loader /> : (
            <div className="flex flex-wrap gap-1.5">
              {(trace?.detections ?? []).filter((d) => !d.startsWith("P_")).length === 0 && (trace?.detections ?? []).length === 0 ? (
                <span className="text-xs text-muted">{t({ uk: "Порушень не виявлено.", en: "No violations." })}</span>
              ) : (trace?.detections ?? []).map((d) => (
                <span key={d} className={`rounded-md px-2 py-1 text-[12px] font-medium ${d.startsWith("P_") ? "border border-line bg-paper-2 text-ink-2" : "bg-brand-soft text-brand-ink"}`}>
                  {violName(d, locale)}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        <span className="font-medium text-ink-2">{t({ uk: "Сирі рядки силосів не залишали реєстр.", en: "Raw silo rows never left the registry." })}</span>{" "}
        {t({ uk: "Через межу пройшли лише ці похідні сигнали (envelope); зведення — за псевдонімом. Та сама детекція, що централізовано, але без обміну персональними даними.", en: "Only these derived signals (envelopes) crossed; intersection is by pseudonym. Same detection as centralized, without exchanging personal data." })}
      </p>
    </div>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-bold tnum text-ink">{value}</div>
    </div>
  );
}

function Loader() {
  return <div className="grid place-items-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" /></div>;
}
