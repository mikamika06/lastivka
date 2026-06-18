"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { QueueItem, Entity, TimelineEvent, AttendanceSeries, FamilyGraph, HealthFacts } from "@/lib/types";
import { getEntity, getTimeline, getAttendance, getFamily, oblastOf, oblastLabel } from "@/lib/api";
import { violName } from "@/lib/registries";
import { formatDate, ageLabel, formatScore } from "@/lib/format";
import { displayName } from "@/lib/translit";
import { useTx, useLocale } from "@/components/providers/I18nProvider";
import { useRole } from "@/components/providers/RoleProvider";
import { ROLE_LABEL, type Msg } from "@/lib/i18n";
import { Card, CardTitle } from "@/components/ui/Card";
import { RegistryChip } from "@/components/ui/Stat";
import { TierBadge, ImmediateBadge, LockIcon } from "@/components/ui/badges";
import { Timeline } from "./Timeline";
import { TrendChart } from "@/components/charts/TrendChart";
import { IconChevronDown, IconLayers, IconClock, IconPulse, IconGlobe } from "@/components/ui/icons";

interface ProfileData {
  id: number;
  entity: Entity | null;
  events: TimelineEvent[];
  attendance: AttendanceSeries | null;
  family: FamilyGraph | null;
}

export function ProfileExplorer({ items, initialId, pii = true, canSeeFamily = false }: Readonly<{ items: QueueItem[]; initialId?: number; pii?: boolean; canSeeFamily?: boolean }>) {
  const t = useTx();
  const locale = useLocale();
  const role = useRole();
  const valid = initialId && items.some((i) => i.entity_id === initialId) ? initialId : items[0]?.entity_id;
  const [selectedId, setSelectedId] = useState<number>(valid);
  const [data, setData] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (selectedId === undefined || selectedId === null || Number.isNaN(selectedId)) return;
    let active = true;
    // лоадер показується автоматично, доки data.id !== selectedId (див. `current` нижче)
    Promise.all([
      getEntity(selectedId, role),
      getTimeline(selectedId, role),
      getAttendance(selectedId),
      canSeeFamily ? getFamily(selectedId, "ssd") : Promise.resolve(null),
    ]).then(([entity, events, attendance, family]) => {
      if (active) setData({ id: selectedId, entity, events, attendance, family });
    });
    return () => {
      active = false;
    };
  }, [selectedId, role, canSeeFamily]);

  const item = items.find((i) => i.entity_id === selectedId);
  if (!item) {
    return <div className="card grid place-items-center py-16 text-sm text-muted">{t({ uk: "Немає дітей у черзі.", en: "No children in the queue." })}</div>;
  }

  const current = data && data.id === selectedId ? data : null;
  const loading = !current;
  const entity = current?.entity ?? null;
  const events = current?.events ?? [];
  const attendance = current?.attendance ?? null;
  const family = current?.family ?? null;
  const oblast = item.oblast ?? entity?.oblast ?? oblastOf(selectedId);

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
                {displayName(i.pib, locale)} · {ageLabel(i.age, locale)} · {i.tier} · {t({ uk: "індекс терміновості", en: "urgency index" })} {formatScore(i.score)}{(i.country === "UA+EE" || i.country === "EE") ? t({ uk: " · слід EE", en: " · EE trace" }) : ""}
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
            <div className="min-w-0">
              <h2 className="h-display text-2xl font-bold break-words">{displayName(item.pib, locale)}</h2>
              <p className="mt-1 text-sm text-muted">{ageLabel(item.age, locale)} · {oblastLabel(oblast, locale)}</p>
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
            <Field label={t({ uk: "УНЗР", en: "UNZR" })} value={pii ? (entity?.unzr ?? item.unzr ?? t({ uk: "— (зіставлено за ПІБ + датою)", en: "— (matched by name + date)" })) : t({ uk: "приховано (регіонал)", en: "hidden (regional)" })} mono />
            <Field label={t({ uk: "Дата народження", en: "Date of birth" })} value={pii ? formatDate(entity?.birth_date ?? item.birth_date, locale) : "—"} />
            <Field label={t({ uk: "Реєстрів об'єднано", en: "Registries merged" })} value={String(entity?.n_registries ?? item.registries.length)} />
            <Field label={t({ uk: "Регіон", en: "Region" })} value={oblastLabel(oblast, locale)} />
          </div>
        </div>

        {/* силоси */}
        <div className="px-5 py-4 sm:px-6">
          <CardTitle icon={<IconLayers className="h-4 w-4 text-brand" />}>
            {t({ uk: "Окремі реєстри, з яких зібрано профіль", en: "Source registries the profile is built from" })}
          </CardTitle>
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="text-muted">{t({ uk: "Зріз за роллю:", en: "Role view:" })}</span>
            <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand-ink">{t(ROLE_LABEL[role])}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(entity?.registries ?? item.registries).map((r) => (
              <RegistryChip key={r} code={r} locale={locale} />
            ))}
            {!!entity?.protected_sources && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper-2 px-2 py-0.5 text-xs font-medium text-faint">
                {entity.protected_sources} {t({ uk: "захищених джерел — обмежений доступ", en: "protected sources — restricted" })}
              </span>
            )}
          </div>
          {item.violations.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{t({ uk: "Виявлені порушення:", en: "Detected violations:" })}</span>
              {item.violations.map((v) => (
                <span key={v} className="rounded-md bg-paper-2 px-2 py-0.5 text-xs font-medium text-ink-2">
                  {violName(v, locale)}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Слід в Естонії — інтегровано у профіль (PPRL UA↔EE), лише якщо є зв'язок */}
      {entity?.crossborder && (
        <Card className="p-5">
          <CardTitle icon={<IconGlobe className="h-4 w-4 text-brand" />}>
            {t({ uk: "Слід в Естонії", en: "Trace in Estonia" })}
          </CardTitle>
          {loading ? <Loader /> : <CrossBorderContent cb={entity.crossborder} t={t} />}
        </Card>
      )}

      {/* Здоров'я — медичні факт-сигнали (ССД/поліція): факт, не зміст (медтаємниця) */}
      {entity?.health && (
        <Card className="p-5">
          <CardTitle icon={<LockIcon className="h-4 w-4 text-lock" />}>
            {t({ uk: "Здоров'я дитини", en: "Child health" })}
          </CardTitle>
          {loading ? <Loader /> : <HealthContent health={entity.health} t={t} />}
        </Card>
      )}

      {/* таймлайн + графік */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardTitle icon={<IconClock className="h-4 w-4 text-brand" />}>
            {t({ uk: "Хронологія сигналів", en: "Signal timeline" })}
          </CardTitle>
          {loading ? <Loader /> : <Timeline events={events} />}
        </Card>

        <Card className="p-5">
          <CardTitle icon={<IconPulse className="h-4 w-4 text-brand" />}>
            {t({ uk: "Відвідуваність і успішність", en: "Attendance and performance" })}
          </CardTitle>
          {loading ? <Loader /> : <AttendanceContent attendance={attendance} t={t} />}
        </Card>
      </div>

      {/* Сімейний граф — у профілі кожної дитини (лише ССД / незалежний нагляд) */}
      {canSeeFamily && (
        <Card className="p-5">
          <CardTitle icon={<IconLayers className="h-4 w-4 text-brand" />}>
            {t({ uk: "Сімейний граф (стан сімʼї)", en: "Family graph (family state)" })}
          </CardTitle>
          {loading ? <Loader /> : <FamilyContent family={family} canSee={canSeeFamily} t={t} locale={locale} />}
        </Card>
      )}
    </div>
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

const EE_REG: Record<string, { uk: string; en: string }> = {
  RAHV: { uk: "Реєстр населення (RAHVASTIKUREGISTER)", en: "Population register (RAHVASTIKUREGISTER)" },
  EHIS_EE: { uk: "Освіта (EHIS)", en: "Education (EHIS)" },
  TERVIS: { uk: "Охорона здоровʼя (TERVISE infosüsteem)", en: "Health (TERVISE infosüsteem)" },
  SKAIS: { uk: "Соцзахист (SKAIS)", en: "Social welfare (SKAIS)" },
};
// глоси естонських значень (де доречно)
const EE_GLOSS: Record<string, { uk: string; en: string }> = {
  "ajutine kaitse": { uk: "тимчасовий захист", en: "temporary protection" },
  vanem: { uk: "батьківська опіка", en: "parental custody" },
  õpib: { uk: "навчається", en: "studying" },
  lapsetoetus: { uk: "допомога на дитину", en: "child benefit" },
  peretoetus: { uk: "сімейна допомога", en: "family benefit" },
};
const EE_FIELD: Record<string, { uk: string; en: string }> = {
  elamisluba: { uk: "Підстава перебування", en: "Residence basis" },
  hooldusoigus: { uk: "Опіка", en: "Custody" },
  elukoht: { uk: "Місце проживання", en: "Residence" },
  kande_kuupaev: { uk: "Дата запису", en: "Record date" },
  oppeasutus: { uk: "Заклад освіти", en: "School" },
  klass: { uk: "Клас", en: "Grade" },
  oppe_staatus: { uk: "Статус навчання", en: "Study status" },
  immatrikuleerimise_kuupaev: { uk: "Дата зарахування", en: "Enrolment date" },
  huvitis_tyyp: { uk: "Тип допомоги", en: "Benefit type" },
  teenus: { uk: "Послуга", en: "Service" },
  kov: { uk: "Самоврядування (KOV)", en: "Municipality (KOV)" },
  maaramise_kuupaev: { uk: "Дата призначення", en: "Award date" },
};

function eeVal(v: string | null, t: (m: Msg) => string): string {
  if (!v) return "—";
  const g = EE_GLOSS[v];
  return g ? `${v} · ${t(g)}` : v;
}

function CrossBorderContent({ cb, t }: Readonly<{ cb: NonNullable<Entity["crossborder"]>; t: (m: Msg) => string }>) {
  const present = Object.entries(cb.ee_presence);
  const detailRegs: Array<"RAHV" | "EHIS_EE" | "SKAIS"> = ["RAHV", "EHIS_EE", "SKAIS"];
  return (
    <div className="space-y-4 text-sm">
      {/* зведення зв'язку */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <div>
          <div className="text-xs text-muted">{t({ uk: "Надійність зв'язку (PPRL)", en: "Link confidence (PPRL)" })}</div>
          <div className="tnum text-sm font-semibold text-ink">{cb.link_score != null ? `${Math.round(cb.link_score * 100)}%` : "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted">{t({ uk: "Isikukood (EE)", en: "Isikukood (EE)" })}</div>
          <div className="tnum text-sm font-semibold text-ink">{cb.isikukood ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted">{t({ uk: "Юрисдикція", en: "Jurisdiction" })}</div>
          <div className="text-sm font-semibold text-ink">{cb.country}</div>
        </div>
      </div>

      {/* присутність у естонських реєстрах */}
      <div className="border-t border-line pt-3">
        <SubH t={t} uk="Присутність у реєстрах Естонії" en="Presence in Estonian registries" />
        <div className="grid gap-2 sm:grid-cols-2">
          {present.map(([reg, ok]) => (
            <div key={reg} className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${ok ? "border-line bg-surface" : "border-dashed border-line bg-paper-2"}`}>
              <span className={ok ? "text-ink-2" : "text-faint"}>{t(EE_REG[reg] ?? { uk: reg, en: reg })}</span>
              <span className={`text-xs font-medium ${ok ? "text-brand-ink" : "text-faint"}`}>
                {ok ? t({ uk: "є запис", en: "record present" }) : t({ uk: "немає", en: "absent" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* деталі (RAHV / EHIS / SKAIS) — TERVIS лишається сигналом (медтаємниця) */}
      {detailRegs.filter((r) => cb.ee_details[r]).map((reg) => {
        const d = cb.ee_details[reg]!;
        return (
          <div key={reg} className="border-t border-line pt-3">
            <SubH t={t} uk={EE_REG[reg].uk} en={EE_REG[reg].en} />
            <div className="divide-y divide-line-2">
              {Object.entries(d).filter(([, v]) => v).map(([k, v]) => (
                <FamRow key={k} label={t(EE_FIELD[k] ?? { uk: k, en: k })} value={k.includes("kuupaev") ? (v as string) : eeVal(v as string, t)} />
              ))}
            </div>
          </div>
        );
      })}

      {cb.ee_presence.TERVIS && (
        <div className="rounded-lg border border-lock/30 bg-lock-soft/50 px-2.5 py-2 text-xs leading-relaxed text-lock-ink">
          {t({ uk: "TERVIS (медичні дані EE) — лише сигнал присутності; зміст не передається через кордон (медтаємниця).", en: "TERVIS (EE health data) — presence signal only; content does not cross the border (medical secrecy)." })}
        </div>
      )}

      <p className="border-t border-line pt-3 text-xs leading-relaxed text-faint">
        {t({ uk: "GDPR гл. V: між Україною та Естонією передається лише результат приватного зіставлення (PPRL), а не сирі записи. Україна не має рішення про адекватність, тож зміст реєстрів залишається в юрисдикції-джерелі.", en: "GDPR Ch. V: only the private-matching result (PPRL) crosses between Ukraine and Estonia, not raw records. Ukraine has no adequacy decision, so registry content stays in the source jurisdiction." })}
      </p>
    </div>
  );
}

const HEALTH_FACT: Record<string, Msg> = {
  disability: { uk: "Інвалідність", en: "Disability" },
  chronic: { uk: "Хронічний стан", en: "Chronic condition" },
  psych_signal: { uk: "Психіатричний сигнал", en: "Psychiatric signal" },
  trauma_signal: { uk: "Травма", en: "Trauma" },
  immunization_gap: { uk: "Пропущена вакцинація", en: "Missed immunization" },
};

function HealthContent({ health, t }: Readonly<{ health: HealthFacts; t: (m: Msg) => string }>) {
  const present = (["disability", "chronic", "psych_signal", "trauma_signal", "immunization_gap"] as const).filter((k) => health[k]);
  return (
    <div className="space-y-3 text-sm">
      {present.length ? (
        <div className="flex flex-wrap gap-1.5">
          {present.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-md border border-lock/30 bg-lock-soft/50 px-2 py-1 text-[12px]">
              <LockIcon className="h-3 w-3 text-lock" />
              <span className="font-medium text-lock-ink">{t(HEALTH_FACT[k])}</span>
              <span className="text-xs text-faint">· {t({ uk: "факт", en: "fact" })}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-line bg-paper-2 px-3 py-2 text-muted">
          {t({ uk: "Медичних факт-сигналів не виявлено.", en: "No medical fact signals found." })}
        </p>
      )}
      <div className="rounded-lg border border-lock/20 bg-lock-soft/40 px-3 py-2 text-xs leading-relaxed text-lock-ink">
        {t({
          uk: "Видно лише факт наявності стану — для оцінки потреб дитини. Діагноз, історія та зміст лишаються за лікарською таємницею (Основи 2801-XII, ст.39-1/40). Розкриття змісту — за згодою законного представника, рішенням суду або у невідкладному випадку через лікаря.",
          en: "Only the fact of a condition is shown — for the child's needs assessment. Diagnosis, history and content stay under medical secrecy. Content disclosure requires consent, a court order, or an emergency via a physician.",
        })}
      </div>
    </div>
  );
}

/** Observability-чіп: спостережуваність осі (зміст / сигнал / push / walled). */
function ObsChip({ kind }: Readonly<{ kind: string }>) {
  const k = kind.toLowerCase();
  const tone = k.includes("walled")
    ? "border-lock/30 bg-lock-soft/60 text-lock-ink"
    : k.includes("push")
      ? "border-amber-300/60 bg-amber-50 text-amber-800"
      : k.includes("content")
        ? "border-line bg-paper-2 text-ink-2"
        : "border-brand/20 bg-brand-soft text-brand-ink"; // signal-only
  return <span className={`rounded px-1.5 py-px text-xs font-medium ${tone}`}>{kind}</span>;
}

function FamRow({ label, value, obs, note }: Readonly<{ label: string; value: ReactNode; obs?: string; note?: string }>) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="min-w-0">
        <span className="text-ink-2">{label}</span>
        {note && <span className="ml-2 text-xs text-faint">{note}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="font-medium text-ink">{value}</span>
        {obs && <ObsChip kind={obs} />}
      </div>
    </div>
  );
}

// Короткі мітки присутніх ризик-сигналів (показуємо ЛИШЕ те, що є; відсутнє опускаємо).
const WALLED_SHORT: Record<string, { label: Msg; tag: Msg }> = {
  addiction: { label: { uk: "Залежність у сімʼї", en: "Addiction in family" }, tag: { uk: "медтаємниця · факт", en: "medical secrecy · fact" } },
  mental_health: { label: { uk: "Психічне здоровʼя батьків", en: "Parental mental health" }, tag: { uk: "медтаємниця · факт", en: "medical secrecy · fact" } },
  criminal: { label: { uk: "Судимість батьків", en: "Parental conviction" }, tag: { uk: "КПК ст.222 · факт", en: "CPC art.222 · fact" } },
};

function P_LABEL(code: string): Msg {
  const m: Record<string, Msg> = {
    P_parent_criminal: { uk: "Судимість батька", en: "Parent conviction" },
    P_parent_rights: { uk: "Позбавлення прав", en: "Rights deprivation" },
    P_parent_addiction: { uk: "Залежність батька", en: "Parent addiction" },
    P_parent_mh: { uk: "Психічне здоровʼя батька", en: "Parent mental health" },
    P_sibling_violation: { uk: "Порушення в сиблінга", en: "Sibling prior violation" },
    P_sibling_in_care: { uk: "Сиблінг у догляді", en: "Sibling in care" },
  };
  return m[code] ?? { uk: code, en: code };
}

/** Компактний ризик-чип (lock — для walled «факт без змісту»). */
function RiskChip({ label, tag, lock }: Readonly<{ label: string; tag: string; lock?: boolean }>) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] ${lock ? "border-lock/30 bg-lock-soft/50" : "border-brand-line bg-brand-soft"}`}>
      {lock && <LockIcon className="h-3 w-3 text-lock" />}
      <span className={`font-medium ${lock ? "text-lock-ink" : "text-brand-ink"}`}>{label}</span>
      <span className="text-xs text-faint">· {tag}</span>
    </span>
  );
}

/** Сімейна структура — обчислюється з прапорців (локалізовано, без сирого тексту з дата-шару). */
function familyStructureLabel(par: NonNullable<FamilyGraph["parents"]>): Msg {
  if (par.both_parents) return { uk: "Обоє батьків", en: "Both parents" };
  if (par.single_parent) {
    if (par.mother_present && !par.father_present) return { uk: "Одинока мати", en: "Single mother" };
    if (par.father_present && !par.mother_present) return { uk: "Одинокий батько", en: "Single father" };
    return { uk: "Один з батьків", en: "Single parent" };
  }
  return { uk: "Не визначено", en: "Not specified" };
}

function FamilyContent({ family, canSee, t, locale }: Readonly<{ family: FamilyGraph | null; canSee: boolean; t: (m: Msg) => string; locale: import("@/lib/i18n").Locale }>) {
  if (!canSee || family?.available === false) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line py-10 text-center text-sm text-muted">
        {t({ uk: "Сімейний граф доступний лише на рівні ССД.", en: "The family graph is available only at the SSD level." })}
      </div>
    );
  }
  const sig = family?.signals;
  const par = family?.parents;
  const hh = family?.household;
  const rel = family?.relatives;
  const siblings = (family?.members ?? []).filter((m) => !m.is_index);
  const contribs = family?.parental_contributions ?? [];
  const walledPresent = (family?.walled_alerts ?? []).filter((w) => w.present);
  const density = hh?.risk_density ?? sig?.household_risk_density ?? 0;
  const kinship = rel?.kinship_care || sig?.kinship_care;

  const hasRisk =
    siblings.length > 0 || walledPresent.length > 0 || !!par?.rights_deprived ||
    !!par?.parent_death || density > 0 || contribs.length > 0;

  // Шапка: структура + склад + (захисна) родинна опіка — завжди один рядок
  const header = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-medium text-ink">{par ? t(familyStructureLabel(par)) : "—"}</span>
      <span className="text-faint">·</span>
      <span className="text-muted">
        {hh?.size ?? 1} {t({ uk: "осіб", en: "members" })}
        {!!(hh?.n_siblings) && <> · {hh.n_siblings} {t({ uk: "сиблінг(и)", en: "sibling(s)" })}</>}
      </span>
      {kinship && (
        <span className="ml-1 inline-flex items-center gap-1 rounded-md border border-line bg-paper-2 px-2 py-0.5 text-xs text-ink-2">
          {t({ uk: "родинна опіка", en: "kinship care" })} · <span className="text-faint">{t({ uk: "захисна", en: "protective" })}</span>
        </span>
      )}
    </div>
  );

  if (!hasRisk) {
    return (
      <div className="space-y-2 text-sm">
        {header}
        <p className="rounded-lg border border-line bg-paper-2 px-3 py-2 text-muted">
          {t({ uk: "Факторів сімейного ризику не виявлено.", en: "No family risk factors found." })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {header}

      {/* присутні ризик-сигнали — компактні чипи (відсутні НЕ показуємо) */}
      {(walledPresent.length > 0 || par?.rights_deprived || par?.parent_death) && (
        <div className="flex flex-wrap gap-1.5">
          {par?.parent_death && (
            <RiskChip label={t(par.w6_cause === "death" ? { uk: "Втрата батька (смерть)", en: "Parent loss (death)" } : { uk: "Втрата батька", en: "Parent loss" })} tag={t({ uk: "ДРАЦС", en: "DRATS" })} />
          )}
          {par?.rights_deprived && (
            <RiskChip label={t({ uk: "Позбавлення батьківських прав", en: "Parental rights deprivation" })} tag={t({ uk: "ЄДРСР", en: "USRCD" })} />
          )}
          {walledPresent.map((w) => (
            <RiskChip key={w.topic} lock label={t(WALLED_SHORT[w.topic].label)} tag={t(WALLED_SHORT[w.topic].tag)} />
          ))}
        </div>
      )}

      {/* брати / сестри (лише якщо є) */}
      {siblings.length > 0 && (
        <div>
          <SubH t={t} uk="Брати / сестри" en="Siblings" />
          <div className="space-y-1">
            {siblings.map((m) => (
              <div key={m.entity_id} className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${m.in_care ? "bg-brand" : "bg-line"}`} />
                <span className="text-ink-2">{displayName(m.pib, locale)}</span>
                <span className="text-xs text-faint">{m.birth_date}</span>
                {m.in_care && <span className="rounded bg-brand-soft px-1.5 text-xs text-brand-ink">{t({ uk: "у догляді", en: "in care" })}</span>}
                {m.risk_marks.filter((r) => r !== "in_care").map((r) => (
                  <span key={r} className="rounded border border-line px-1.5 text-xs text-muted">{r}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* щільність ризику (лише якщо > 0) */}
      {density > 0 && (
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">{t({ uk: "Щільність ризику сімʼї", en: "Family risk density" })}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(density * 100, 100)}%` }} />
            </div>
            <span className="tnum text-sm font-semibold text-ink">{density.toFixed(2)}</span>
            {hh?.escalated && <span className="rounded bg-brand-soft px-1.5 py-px text-xs font-medium text-brand-ink">{t({ uk: "ескальовано", en: "escalated" })}</span>}
          </div>
          {hh?.density_breakdown && (
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-faint">
              {Object.entries(hh.density_breakdown).filter(([, v]) => v > 0).map(([k, v]) => (
                <span key={k}>{DENS_LABEL(k, t)}: <span className="tnum text-muted">{v.toFixed(2)}</span></span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* батьківсько-осьові контрибуції — компактні чипи (label · value · obs) */}
      {contribs.length > 0 && (
        <div>
          <SubH t={t} uk="Внесок у пріоритет (батьківська вісь)" en="Priority contribution (parental axis)" />
          <div className="flex flex-wrap gap-1.5">
            {contribs.map((c) => (
              <span key={c.code} className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-surface px-2 py-1 text-[12px]">
                <span className="text-ink-2">{t(P_LABEL(c.code))}</span>
                <span className="tnum font-semibold text-ink">{c.value.toFixed(2)}</span>
                <ObsChip kind={c.observability} />
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-faint">
        {t({
          uk: "Батьківські фактори — контекст (≤0.55, нижче за дитячі тяжкості). Найчутливіше (медицина, кримінал) видно лише як факт без змісту — зміст за стіною (медтаємниця, КПК ст.222). Рішення ухвалює Комісія.",
          en: "Parental factors are context (≤0.55, below child severities). The most sensitive (medical, criminal) is shown only as a content-free fact — content stays behind the wall (medical secrecy, CPC art.222). The Commission decides.",
        })}
      </p>
    </div>
  );
}

function SubH({ t, uk, en }: Readonly<{ t: (m: Msg) => string; uk: string; en: string }>) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">{t({ uk, en })}</div>;
}

function DENS_LABEL(k: string, t: (m: Msg) => string): string {
  const m: Record<string, Msg> = {
    sibling_marks: { uk: "порушення сиблінга", en: "sibling marks" },
    sibling_in_care: { uk: "сиблінг у догляді", en: "sibling in care" },
    single_parent_unemployed: { uk: "одинокий безробітний", en: "single unemployed" },
    n_siblings: { uk: "розмір сімʼї", en: "family size" },
  };
  return t(m[k] ?? { uk: k, en: k });
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
