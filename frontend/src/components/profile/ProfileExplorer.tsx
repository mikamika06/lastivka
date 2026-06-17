"use client";

import { useEffect, useState } from "react";
import type { QueueItem, Entity, TimelineEvent, AttendanceSeries } from "@/lib/types";
import { getEntity, getTimeline, getAttendance, oblastOf } from "@/lib/api";
import { violName } from "@/lib/registries";
import { formatDate, ageLabel, formatScore } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { RegistryChip } from "@/components/ui/Stat";
import { TierBadge, ImmediateBadge } from "@/components/ui/badges";
import { Timeline } from "./Timeline";
import { TrendChart } from "@/components/charts/TrendChart";
import { IconChevronDown, IconLayers, IconClock, IconPulse } from "@/components/ui/icons";

interface ProfileData {
  id: number;
  entity: Entity | null;
  events: TimelineEvent[];
  attendance: AttendanceSeries | null;
}

export function ProfileExplorer({ items, initialId }: Readonly<{ items: QueueItem[]; initialId?: number }>) {
  const valid = initialId && items.some((i) => i.entity_id === initialId) ? initialId : items[0]?.entity_id;
  const [selectedId, setSelectedId] = useState<number>(valid);
  const [data, setData] = useState<ProfileData | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getEntity(selectedId), getTimeline(selectedId), getAttendance(selectedId)]).then(
      ([entity, events, attendance]) => {
        if (active) setData({ id: selectedId, entity, events, attendance });
      },
    );
    return () => {
      active = false;
    };
  }, [selectedId]);

  const item = items.find((i) => i.entity_id === selectedId);
  if (!item) {
    return <div className="card grid place-items-center py-16 text-sm text-muted">Немає дітей у черзі.</div>;
  }

  const current = data && data.id === selectedId ? data : null;
  const loading = !current;
  const entity = current?.entity ?? null;
  const events = current?.events ?? [];
  const attendance = current?.attendance ?? null;
  const oblast = oblastOf(selectedId);

  return (
    <div className="space-y-5">
      {/* селектор */}
      <div className="relative max-w-xl">
        <label htmlFor="child-select" className="mb-1.5 block text-xs font-medium text-muted">
          Оберіть дитину з черги
        </label>
        <div className="relative">
          <select
            id="child-select"
            value={selectedId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="w-full appearance-none rounded-xl border border-line bg-surface py-3 pl-4 pr-10 text-sm font-medium text-ink outline-none focus:border-brand"
          >
            {items.map((i) => (
              <option key={i.entity_id} value={i.entity_id}>
                {i.pib} · {ageLabel(i.age)} · {i.tier} · score {formatScore(i.score)}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        </div>
      </div>

      {/* шапка профілю */}
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-surface px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="h-display text-2xl font-bold">{item.pib}</h2>
              <p className="mt-1 text-sm text-muted">{ageLabel(item.age)} · {oblast} обл.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {item.immediate && <ImmediateBadge />}
                <TierBadge tier={item.tier} />
              </div>
              <span className="text-xs text-muted">
                urgency score <span className="font-semibold tnum text-ink-2">{formatScore(item.score)}</span>
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="УНЗР" value={entity?.unzr ?? item.unzr ?? "— (матч по ПІБ+дата)"} mono />
            <Field label="Дата народження" value={formatDate(entity?.birth_date ?? item.birth_date)} />
            <Field label="Реєстрів інтегровано" value={String(entity?.n_registries ?? item.registries.length)} />
            <Field label="Регіон" value={`${oblast} обл.`} />
          </div>
        </div>

        {/* силоси */}
        <div className="px-5 py-4 sm:px-6">
          <CardTitle icon={<IconLayers className="h-4 w-4 text-brand" />} hint="приватність: дані не зливаються">
            Силоси, з яких зібрано профіль
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {(entity?.registries ?? item.registries).map((r) => (
              <RegistryChip key={r} code={r} />
            ))}
          </div>
          {item.violations.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Виявлені порушення:</span>
              {item.violations.map((v) => (
                <span key={v} className="rounded-md bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                  {violName(v)}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* таймлайн + графік */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardTitle icon={<IconClock className="h-4 w-4 text-brand" />} hint="з різних реєстрів">
            Хронологія сигналів
          </CardTitle>
          {loading ? <Loader /> : <Timeline events={events} />}
        </Card>

        <Card className="p-5">
          <CardTitle icon={<IconPulse className="h-4 w-4 text-brand" />} hint="ІСУО / AIKOM">
            Відвідуваність і успішність
          </CardTitle>
          {loading ? <Loader /> : <AttendanceContent attendance={attendance} />}
        </Card>
      </div>
    </div>
  );
}

function AttendanceContent({ attendance }: Readonly<{ attendance: AttendanceSeries | null }>) {
  if (!attendance) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">
        Для цієї дитини немає шкільних даних відвідуваності.
        <br />
        <span className="text-xs text-faint">Сигнали зосереджені в інших реєстрах (див. хронологію).</span>
      </div>
    );
  }
  return <TrendChart data={attendance} />;
}

function Field({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 font-semibold text-ink ${mono ? "tnum text-sm" : "text-sm"}`}>{value}</div>
    </div>
  );
}

function Loader() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-[pulse-soft_1.5s_ease_infinite] rounded-lg bg-paper-2" />
      ))}
    </div>
  );
}
