interface Row {
  label: string;
  value: number;
  color?: string;
}

export function HBar({
  data,
  unit = "",
  max,
}: Readonly<{
  data: Row[];
  unit?: string;
  max?: number;
}>) {
  const top = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const pct = Math.max(2, (d.value / top) * 100);
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-right text-xs text-ink-2" title={d.label}>
              {d.label}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-paper-2">
              <div
                className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: d.color ?? "var(--color-brand)" }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tnum text-ink">
              {d.value}
              {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
