"use client";

import { useMemo, useState } from "react";
import type { QueueItem, Tier } from "@/lib/types";
import { violName } from "@/lib/registries";
import { plural } from "@/lib/format";
import { oblastOf } from "@/lib/api";
import { CaseCard } from "./CaseCard";
import { IconSearch, IconFilter } from "@/components/ui/icons";

const TIERS: Tier[] = ["T0", "T1", "T2"];

export function QueueExplorer({ items }: { items: QueueItem[] }) {
  const [tiers, setTiers] = useState<Set<Tier>>(new Set(["T0", "T1", "T2"]));
  const [immediateOnly, setImmediateOnly] = useState(false);
  const [violFilter, setViolFilter] = useState<Set<string>>(new Set());
  const [regionFilter, setRegionFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(30);

  const violOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.violations.forEach((v) => s.add(v)));
    return [...s].sort((a, b) => violName(a).localeCompare(violName(b), "uk"));
  }, [items]);

  const regionOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => {
      const o = oblastOf(i.entity_id);
      if (o !== "—") s.add(o);
    });
    return [...s].sort((a, b) => a.localeCompare(b, "uk"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (!tiers.has(i.tier)) return false;
      if (immediateOnly && !i.immediate) return false;
      if (violFilter.size && !i.violations.some((v) => violFilter.has(v))) return false;
      if (regionFilter.size && !regionFilter.has(oblastOf(i.entity_id))) return false;
      if (q && !i.pib.toLowerCase().includes(q) && !String(i.unzr ?? "").includes(q)) return false;
      return true;
    });
  }, [items, tiers, immediateOnly, violFilter, regionFilter, search]);

  const shown = filtered.slice(0, limit);

  function toggle<T>(set: Set<T>, val: T): Set<T> {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    return next;
  }

  return (
    <div className="space-y-4">
      {/* фільтри */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted">
              <IconFilter className="h-3.5 w-3.5" /> Рівень
            </span>
            {TIERS.map((t) => {
              const on = tiers.has(t);
              return (
                <button
                  key={t}
                  onClick={() => setTiers((s) => toggle(s, t))}
                  aria-pressed={on}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    on
                      ? t === "T0"
                        ? "bg-t0-soft text-t0-ink ring-t0-line"
                        : t === "T1"
                          ? "bg-t1-soft text-t1-ink ring-t1-line"
                          : "bg-t2-soft text-t2-ink ring-t2-line"
                      : "bg-surface text-faint ring-line hover:text-ink-2"
                  }`}
                >
                  {t}
                </button>
              );
            })}
            <button
              onClick={() => setImmediateOnly((v) => !v)}
              aria-pressed={immediateOnly}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                immediateOnly ? "bg-t0 text-white ring-t0" : "bg-surface text-faint ring-line hover:text-ink-2"
              }`}
            >
              Лише негайні
            </button>
          </div>

          <div className="relative w-full lg:w-72">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Пошук за ПІБ або УНЗР"
              placeholder="Пошук за ПІБ або УНЗР…"
              className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-faint focus:border-brand"
            />
          </div>
        </div>

        {/* типи порушень */}
        <FilterChips
          label="Тип порушення"
          options={violOptions.map((v) => ({ value: v, label: violName(v) }))}
          selected={violFilter}
          onToggle={(v) => setViolFilter((s) => toggle(s, v))}
          onReset={() => setViolFilter(new Set())}
        />

        {/* регіони */}
        <FilterChips
          label="Регіон"
          options={regionOptions.map((o) => ({ value: o, label: `${o} обл.` }))}
          selected={regionFilter}
          onToggle={(v) => setRegionFilter((s) => toggle(s, v))}
          onReset={() => setRegionFilter(new Set())}
        />
      </div>

      <p className="px-1 text-sm text-muted">
        Показано <span className="font-semibold text-ink">{Math.min(shown.length, filtered.length)}</span> із{" "}
        {plural(filtered.length, "сигнал", "сигнали", "сигналів")}. Сортування — за терміновістю.
      </p>

      {/* список */}
      <div className="space-y-3">
        {shown.map((item, i) => (
          <CaseCard key={item.entity_id} item={item} defaultOpen={i === 0} />
        ))}
        {filtered.length === 0 && (
          <div className="card grid place-items-center py-16 text-center text-sm text-muted">
            За цими фільтрами кейсів немає.
          </div>
        )}
      </div>

      {shown.length < filtered.length && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setLimit((l) => l + 30)}
            className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink-2 hover:bg-paper-2"
          >
            Показати ще ({filtered.length - shown.length})
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChips({
  label,
  options,
  selected,
  onToggle,
  onReset,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
      <span className="mr-1 text-xs font-medium text-muted">{label}</span>
      {options.map((o) => {
        const on = selected.has(o.value);
        return (
          <button
            key={o.value}
            onClick={() => onToggle(o.value)}
            aria-pressed={on}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition ${
              on ? "bg-ink text-white ring-ink" : "bg-surface text-muted ring-line hover:text-ink-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
      {selected.size > 0 && (
        <button onClick={onReset} className="text-[11px] font-medium text-brand hover:underline">
          скинути
        </button>
      )}
    </div>
  );
}
