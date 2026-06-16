interface Segment {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  centerLabel,
}: {
  segments: Segment[];
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 56;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-paper-2)" strokeWidth="16" />
        {segments.map((s) => {
          const len = (s.value / total) * C;
          const el = (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
        <text
          x="70"
          y="66"
          textAnchor="middle"
          transform="rotate(90 70 70)"
          className="fill-ink font-display text-[26px] font-bold tnum"
        >
          {total}
        </text>
        {centerLabel && (
          <text
            x="70"
            y="84"
            textAnchor="middle"
            transform="rotate(90 70 70)"
            className="fill-faint text-[10px]"
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-ink-2">{s.label}</span>
            <span className="font-semibold tnum text-ink">{s.value}</span>
            <span className="text-xs text-faint">· {Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
