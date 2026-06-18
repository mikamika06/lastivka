"use client";

import type { AttendanceSeries } from "@/lib/types";
import { formatPeriod } from "@/lib/format";
import { useTx, useLocale } from "@/components/providers/I18nProvider";

/**
 * Відвідуваність (пропуски, бари) + успішність (GPA, лінія) з підсвіченою
 * точкою зламу (change-point) — момент, коли почалось погіршення.
 */
export function TrendChart({ data }: Readonly<{ data: AttendanceSeries }>) {
  const t = useTx();
  const locale = useLocale();
  const pts = data.points;
  const n = pts.length;
  if (n === 0) return null;

  const W = 720;
  const H = 250;
  const padL = 38;
  const padR = 16;
  const padT = 22;
  const padB = 38;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxA = Math.max(...pts.map((p) => p.absences), 1);
  const step = plotW / n;
  const barW = step * 0.46;

  const x = (i: number) => padL + (i + 0.5) * step;
  const yA = (a: number) => padT + plotH * (1 - a / maxA);
  const yG = (g: number) => padT + plotH * (1 - g / 12);

  const gpaLine = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yG(p.gpa).toFixed(1)}`).join(" ");
  const cp = data.changePointIndex;
  const cpX = cp === null ? null : padL + cp * step;

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => padT + plotH * f);
  const labelEvery = Math.ceil(n / 8);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-t1" /> {t({ uk: "Пропуски (без поважної причини)", en: "Absences (unexcused)" })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-brand" /> {t({ uk: "Успішність (12-бальна)", en: "Grades (12-point scale)" })}
        </span>
        <span className="flex items-center gap-1.5 text-t0-ink">
          <span className="h-3 w-0 border-l-2 border-dashed border-t0" /> {t({ uk: "Точка зламу", en: "Change-point" })}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t({ uk: "Відвідуваність та успішність із точкою зламу", en: "Attendance and grades with change-point" })}>
        {/* сітка */}
        {gridY.map((gy) => (
          <line key={gy} x1={padL} x2={W - padR} y1={gy} y2={gy} stroke="var(--color-line-2)" strokeWidth="1" />
        ))}

        {/* зона після зламу */}
        {cpX !== null && (
          <rect x={cpX} y={padT} width={W - padR - cpX} height={plotH} fill="var(--color-t0)" opacity="0.04" />
        )}

        {/* бари пропусків */}
        {pts.map((p, i) => {
          const h = plotH - (yA(p.absences) - padT);
          const after = cp !== null && i >= cp;
          return (
            <rect
              key={`${p.period}-${i}`}
              x={x(i) - barW / 2}
              y={yA(p.absences)}
              width={barW}
              height={Math.max(0, h)}
              rx="2"
              fill={after ? "var(--color-t1)" : "#cbd5e1"}
            >
              <title>{`${formatPeriod(p.period, locale)}: ${p.absences} ${t({ uk: "пропусків", en: "absences" })}`}</title>
            </rect>
          );
        })}

        {/* лінія GPA */}
        <path d={gpaLine} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={`${p.period}-${i}`} cx={x(i)} cy={yG(p.gpa)} r="3" fill="var(--color-surface)" stroke="var(--color-brand)" strokeWidth="2">
            <title>{`${formatPeriod(p.period, locale)}: GPA ${p.gpa}`}</title>
          </circle>
        ))}

        {/* маркер зламу */}
        {cpX !== null && (
          <>
            <line x1={cpX} x2={cpX} y1={padT - 6} y2={padT + plotH} stroke="var(--color-t0)" strokeWidth="1.6" strokeDasharray="4 4" />
            <g transform={`translate(${Math.min(cpX, W - padR - 90)}, ${padT - 6})`}>
              <rect x="2" y="-14" width="86" height="18" rx="9" fill="var(--color-t0-soft)" stroke="var(--color-t0-line)" />
              <text x="45" y="-1" textAnchor="middle" className="fill-t0-ink text-[12px] font-semibold">
                {t({ uk: "злам тренду", en: "trend break" })}
              </text>
            </g>
          </>
        )}

        {/* підписи осі X */}
        {pts.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={`${p.period}-${i}`} x={x(i)} y={H - 14} textAnchor="middle" className="fill-faint text-[12px]">
              {formatPeriod(p.period, locale)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
