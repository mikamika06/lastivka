"use client";

import { useEffect, useState } from "react";
import type { QueueItem, Entity, TimelineEvent, AttendanceSeries, RegistryCode } from "@/lib/types";
import { getEntity, getTimeline, getAttendance, oblastOf } from "@/lib/api";
import { violName } from "@/lib/registries";
import { formatDate, ageLabel, formatScore } from "@/lib/format";
import { useTx, useLocale } from "@/components/providers/I18nProvider";
import type { Msg } from "@/lib/i18n";
import { Card, CardTitle } from "@/components/ui/Card";
import { RegistryChip } from "@/components/ui/Stat";
import { TierBadge, ImmediateBadge } from "@/components/ui/badges";
import { isCrossBorder } from "@/components/queue/CaseCard";
import { Timeline } from "./Timeline";
import { TrendChart } from "@/components/charts/TrendChart";
import { IconChevronDown, IconLayers, IconClock, IconPulse, IconCheck, IconClose, IconGlobe } from "@/components/ui/icons";

interface ProfileData {
  id: number;
  entity: Entity | null;
  events: TimelineEvent[];
  attendance: AttendanceSeries | null;
}

export function ProfileExplorer({ items, initialId }: Readonly<{ items: QueueItem[]; initialId?: number }>) {
  const t = useTx();
  const locale = useLocale();
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
    return <div className="card grid place-items-center py-16 text-sm text-muted">{t({ uk: "Немає дітей у черзі.", en: "No children in the queue." })}</div>;
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
          {t({ uk: "Оберіть дитину з черги", en: "Select a child from the queue" })}
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
                {i.pib} · {ageLabel(i.age, locale)} · {i.tier} · {t({ uk: "індекс терміновості", en: "urgency index" })} {formatScore(i.score)}
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
              <p className="mt-1 text-sm text-muted">{ageLabel(item.age, locale)} · {oblast} {t({ uk: "обл.", en: "oblast" })}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {item.immediate && <ImmediateBadge />}
                <TierBadge tier={item.tier} />
              </div>
              <span className="text-xs text-muted">
                {t({ uk: "індекс терміновості", en: "urgency index" })} <span className="font-semibold tnum text-ink-2">{formatScore(item.score)}</span>
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label={t({ uk: "УНЗР", en: "UNZR" })} value={entity?.unzr ?? item.unzr ?? t({ uk: "— (зіставлено за ПІБ + датою)", en: "— (matched by name + date)" })} mono />
            <Field label={t({ uk: "Дата народження", en: "Date of birth" })} value={formatDate(entity?.birth_date ?? item.birth_date, locale)} />
            <Field label={t({ uk: "Реєстрів об'єднано", en: "Registries merged" })} value={String(entity?.n_registries ?? item.registries.length)} />
            <Field label={t({ uk: "Регіон", en: "Region" })} value={`${oblast} ${t({ uk: "обл.", en: "oblast" })}`} />
          </div>
        </div>

        {/* силоси */}
        <div className="px-5 py-4 sm:px-6">
          <CardTitle icon={<IconLayers className="h-4 w-4 text-brand" />} hint={t({ uk: "із захистом персональних даних: реєстри не зливаються в один", en: "with data privacy: registries are not merged into one" })}>
            {t({ uk: "Окремі реєстри, з яких зібрано профіль", en: "Source registries the profile is built from" })}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {(entity?.registries ?? item.registries).map((r) => (
              <RegistryChip key={r} code={r} />
            ))}
          </div>
          {item.violations.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{t({ uk: "Виявлені порушення:", en: "Detected violations:" })}</span>
              {item.violations.map((v) => (
                <span key={v} className="rounded-md bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                  {violName(v, locale)}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Слід в Естонії — крос-кордон (фаза 4) */}
      {isCrossBorder(item) && (
        <EstonianTrace item={item} registries={entity?.registries ?? item.registries} t={t} />
      )}

      {/* таймлайн + графік */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardTitle icon={<IconClock className="h-4 w-4 text-brand" />} hint={t({ uk: "з різних реєстрів", en: "from various registries" })}>
            {t({ uk: "Хронологія сигналів", en: "Signal timeline" })}
          </CardTitle>
          {loading ? <Loader /> : <Timeline events={events} />}
        </Card>

        <Card className="p-5">
          <CardTitle icon={<IconPulse className="h-4 w-4 text-brand" />} hint="ІСУО / AIKOM">
            {t({ uk: "Відвідуваність і успішність", en: "Attendance and performance" })}
          </CardTitle>
          {loading ? <Loader /> : <AttendanceContent attendance={attendance} t={t} />}
        </Card>
      </div>
    </div>
  );
}

/* ── EE-реєстри для перевірки присутності дитини в Естонії ── */
const EE_REGISTRIES: { code: RegistryCode; label: Msg }[] = [
  { code: "RAHV", label: { uk: "Населення (Rahvastikuregister)", en: "Population (Rahvastikuregister)" } },
  { code: "EHIS_EE", label: { uk: "Школа (EHIS)", en: "School (EHIS)" } },
  { code: "TERVIS", label: { uk: "Медицина (Tervis)", en: "Healthcare (Tervis)" } },
  { code: "SKAIS", label: { uk: "Соцопіка (SKAIS)", en: "Social care (SKAIS)" } },
];

/**
 * Блок «Слід в Естонії»: дитину видно у двох країнах одночасно. Показує
 * присутність у естонських реєстрах (де є ✓, де щілина ✗), оцінку приватного
 * звʼязування UA↔EE (PPRL) та різні ідентифікатори (УНЗР ≠ isikukood).
 */
function EstonianTrace({
  item,
  registries,
  t,
}: Readonly<{ item: QueueItem; registries: RegistryCode[]; t: (m: Msg) => string }>) {
  const present = (code: RegistryCode) => registries.includes(code);
  const link = item.link_score ?? 0;
  const gaps = EE_REGISTRIES.filter((r) => !present(r.code));

  return (
    <Card className="overflow-hidden border-brand/30">
      <div className="flex items-center gap-2 border-b border-line bg-brand-soft/40 px-5 py-3 sm:px-6">
        <span aria-hidden className="text-lg">🇪🇪</span>
        <h3 className="font-display text-sm font-bold text-ink">
          {t({ uk: "Слід в Естонії", en: "Estonian trace" })}
        </h3>
        <span className="ml-auto rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
          {t({ uk: "крос-кордон UA↔EE", en: "cross-border UA↔EE" })}
        </span>
      </div>

      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_300px]">
        {/* присутність у реєстрах + щілина */}
        <div>
          <p className="mb-3 text-sm text-muted">
            {t({
              uk: "Ту саму дитину видно і в українських, і в естонських системах. Зелене — де про неї є запис; сіре — щілина, де її ніхто не бачить.",
              en: "The same child is visible in both Ukrainian and Estonian systems. Green — where a record exists; grey — the gap, where no one sees her.",
            })}
          </p>
          <ul className="space-y-2">
            {EE_REGISTRIES.map((r) => {
              const ok = present(r.code);
              return (
                <li
                  key={r.code}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    ok ? "border-ok/30 bg-ok-soft/40" : "border-line bg-paper/40"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      ok ? "bg-ok text-white" : "bg-paper-2 text-faint"
                    }`}
                  >
                    {ok ? <IconCheck className="h-3.5 w-3.5" /> : <IconClose className="h-3.5 w-3.5" />}
                  </span>
                  <span className={`text-sm font-medium ${ok ? "text-ink" : "text-muted"}`}>{t(r.label)}</span>
                  <span className={`ml-auto text-[11px] font-semibold ${ok ? "text-ok-ink" : "text-faint"}`}>
                    {ok ? t({ uk: "є запис", en: "on record" }) : t({ uk: "щілина", en: "gap" })}
                  </span>
                </li>
              );
            })}
          </ul>
          {gaps.length > 0 && (
            <p className="mt-3 rounded-lg bg-t1-soft/50 px-3 py-2 text-[12px] leading-relaxed text-ink-2">
              <span className="font-semibold">{t({ uk: "Щілина: ", en: "Gap: " })}</span>
              {t({
                uk: "дитина зареєстрована в Естонії, але відсутня в ",
                en: "the child is registered in Estonia, but missing from ",
              })}
              {gaps.map((g, i) => (
                <span key={g.code}>
                  {i > 0 ? ", " : ""}
                  <span className="font-medium">{t(g.label)}</span>
                </span>
              ))}
              {t({ uk: " — саме сюди й «провалюється» захист.", en: " — this is exactly where protection falls through." })}
            </p>
          )}
        </div>

        {/* звʼязок UA↔EE + ідентифікатори */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <IconGlobe className="h-4 w-4 text-brand" />
              <span className="text-xs font-medium text-muted">{t({ uk: "Звʼязок UA↔EE (PPRL)", en: "Link UA↔EE (PPRL)" })}</span>
            </div>
            <div className="mt-2 font-display text-3xl font-bold tnum text-ink">{Math.round(link * 100)}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(link * 100)}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-faint">
              {t({
                uk: "Упевненість, що це та сама дитина. Звірка приватна: між країнами передається лише сигнал збігу, не імена.",
                en: "Confidence that this is the same child. Matching is private: only the match signal crosses borders, not names.",
              })}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 text-xs">
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-muted">{t({ uk: "УНЗР (Україна)", en: "UNZR (Ukraine)" })}</span>
              <span className="tnum text-[11px] font-medium text-ink-2">
                {item.unzr ?? t({ uk: "—", en: "—" })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line py-1 pt-2">
              <span className="text-muted">{t({ uk: "isikukood (Естонія)", en: "isikukood (Estonia)" })}</span>
              <span className="tnum text-[11px] font-medium text-ink-2">{item.isikukood ?? "—"}</span>
            </div>
            <p className="mt-2 border-t border-line pt-2 text-[11px] leading-relaxed text-faint">
              {t({
                uk: "Два різні коди, спільного ключа немає — країни не можуть просто «звести» бази. Тому звʼязок будують приватним зіставленням.",
                en: "Two different codes, no shared key — countries cannot simply merge databases. That is why the link is built by privacy-preserving matching.",
              })}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AttendanceContent({ attendance, t }: Readonly<{ attendance: AttendanceSeries | null; t: (m: Msg) => string }>) {
  if (!attendance) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">
        {t({ uk: "Для цієї дитини немає шкільних даних відвідуваності.", en: "No school attendance data for this child." })}
        <br />
        <span className="text-xs text-faint">{t({ uk: "Сигнали зосереджені в інших реєстрах (див. хронологію).", en: "Signals are concentrated in other registries (see the timeline)." })}</span>
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
