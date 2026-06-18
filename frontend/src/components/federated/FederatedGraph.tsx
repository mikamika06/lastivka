"use client";

import { useState } from "react";
import type { FederatedTrace } from "@/lib/api";
import { violName } from "@/lib/registries";
import { useLocale } from "@/components/providers/I18nProvider";

const REG_LABEL: Record<string, string> = {
  DRACS: "ДРАЦС", EDDR: "ЄДДР", EHEALTH: "ЕСОЗ", EDEBO: "ЄДЕБО", AIKOM: "АІКОМ", VPO: "ВПО",
  CHILDWAR: "Діти війни", DITY: "ЄІАС «Діти»", ERDR: "ЄРДР", DV: "Реєстр ДН", CBI_DISABILITY: "ЦБІ",
  EDRSR: "ЄДРСР", DRRP: "ДРРП", PFU: "ПФУ", HOTLINE: "Гар. лінії", SKAID: "СКАЙД", EISSS: "ЄІССС",
  push: "push-канал", RAHV: "RAHV", EHIS_EE: "EHIS", SKAIS: "SKAIS", TERVIS: "TERVIS",
};
const WALLED = new Set(["EHEALTH", "ERDR", "TERVIS"]);

const ROW_H = 46;
const PAD = 24;
const LX = 8, LW = 138;          // ліва колонка (реєстри)
const RW = 188;                  // права колонка (порушення)
const VBW = 720;                 // ширина viewBox
const RX = VBW - RW - 8;

export function FederatedGraph({ trace }: Readonly<{ trace: FederatedTrace }>) {
  const locale = useLocale();
  const [hot, setHot] = useState<string | null>(null);   // hovered violation code

  // праві вузли = порушення; ліві = усі реєстри-докази + ті, що емітнули сигнал
  const right = trace.detections;
  const leftCodes = Array.from(new Set([
    ...trace.envelopes.filter((e) => e.signals.length > 0 || e.blocked).map((e) => e.registry),
    ...right.flatMap((d) => d.evidence),
  ]));
  // лишаємо лише реєстри, що або емітнули, або є доказом (щоб граф не був порожнім)
  const evidenceSet = new Set(right.flatMap((d) => d.evidence));
  const emittedSet = new Set(trace.envelopes.filter((e) => e.signals.length > 0).map((e) => e.registry));
  const blockedSet = new Set(trace.envelopes.filter((e) => e.blocked).map((e) => e.registry));
  const left = leftCodes.filter((c) => evidenceSet.has(c) || emittedSet.has(c) || blockedSet.has(c));

  const rows = Math.max(left.length, right.length, 1);
  const H = rows * ROW_H + PAD * 2;
  const leftY = (i: number) => PAD + ROW_H / 2 + i * ROW_H + (rows - left.length) * ROW_H / 2;
  const rightY = (i: number) => PAD + ROW_H / 2 + i * ROW_H + (rows - right.length) * ROW_H / 2;
  const lIdx = Object.fromEntries(left.map((c, i) => [c, i]));

  // ребра: реєстр-доказ -> порушення
  const edges: { from: number; to: number; code: string; viol: string; walled: boolean }[] = [];
  right.forEach((d, j) => {
    d.evidence.forEach((code) => {
      if (lIdx[code] === undefined) return;
      edges.push({ from: lIdx[code], to: j, code, viol: d.violation, walled: WALLED.has(code) });
    });
  });

  const sigOf = (code: string) => trace.envelopes.find((e) => e.registry === code);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${VBW} ${H}`} className="w-full" style={{ minWidth: 560 }}>
        {/* ребра */}
        {edges.map((e, k) => {
          const y1 = leftY(e.from), y2 = rightY(e.to);
          const x1 = LX + LW, x2 = RX;
          const mx = (x1 + x2) / 2;
          const active = hot === null || hot === e.viol;
          return (
            <path key={k} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none" stroke={e.walled ? "var(--color-lock)" : "var(--color-brand)"}
              strokeWidth={hot === e.viol ? 2.4 : 1.2} strokeOpacity={active ? (e.walled ? 0.7 : 0.5) : 0.08}
              strokeDasharray={e.walled ? "4 3" : undefined} />
          );
        })}

        {/* C1-агрегатор (підпис у центрі) */}
        <text x={VBW / 2} y={14} textAnchor="middle" className="fill-[var(--color-faint)]" style={{ fontSize: 10 }}>
          C1-агрегатор · {trace.pseudonym.slice(0, 10)}…
        </text>

        {/* ліві вузли: реєстри */}
        {left.map((code, i) => {
          const walled = WALLED.has(code);
          const env = sigOf(code);
          const nSig = env?.signals.length ?? 0;
          const y = leftY(i);
          const dim = hot !== null && !edges.some((e) => e.viol === hot && e.code === code);
          return (
            <g key={code} opacity={dim ? 0.25 : 1}>
              <rect x={LX} y={y - ROW_H / 2 + 5} width={LW} height={ROW_H - 10} rx={7}
                fill={walled ? "var(--color-lock-soft)" : "var(--color-surface)"}
                stroke={walled ? "var(--color-lock)" : "var(--color-line)"} strokeOpacity={walled ? 0.4 : 1} />
              <text x={LX + 10} y={y - 2} className="fill-[var(--color-ink)]" style={{ fontSize: 12, fontWeight: 600 }}>
                {REG_LABEL[code] ?? code}{walled ? " 🔒" : ""}
              </text>
              <text x={LX + 10} y={y + 12} className="fill-[var(--color-faint)]" style={{ fontSize: 9 }}>
                {env?.blocked ? "push-only (walled)" : `${nSig} сигнал${nSig === 1 ? "" : "и"}`}
              </text>
            </g>
          );
        })}

        {/* праві вузли: порушення */}
        {right.map((d, j) => {
          const y = rightY(j);
          const parental = d.dimension === "parental";
          const active = hot === null || hot === d.violation;
          return (
            <g key={d.violation} opacity={active ? 1 : 0.3}
              onMouseEnter={() => setHot(d.violation)} onMouseLeave={() => setHot(null)} style={{ cursor: "default" }}>
              <rect x={RX} y={y - ROW_H / 2 + 5} width={RW} height={ROW_H - 10} rx={7}
                fill={parental ? "var(--color-paper-2)" : "var(--color-brand-soft)"}
                stroke={parental ? "var(--color-line)" : "var(--color-brand-line)"} />
              <text x={RX + 10} y={y + 1} className={parental ? "fill-[var(--color-ink-2)]" : "fill-[var(--color-brand-ink)]"}
                style={{ fontSize: 11.5, fontWeight: 600 }}>
                {truncate(violName(d.violation, locale), 26)}
              </text>
              <text x={RX + 10} y={y + 14} className="fill-[var(--color-faint)]" style={{ fontSize: 9 }}>
                {parental ? "контекст" : `докази: ${d.evidence.length}`}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[11px] text-faint">
        Наведи на порушення — підсвітяться реєстри-докази, що його довели. Пунктир = walled (через push).
      </p>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
