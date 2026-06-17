/**
 * Демо-дані Ластівки (синтетичні, структурно ідентичні реальним реєстрам Фази 2).
 * Детерміновані (seeded PRNG) — однаковий результат на сервері й клієнті,
 * без hydration-mismatch. Деталізовані «геро»-кейси + згенерована популяція.
 */
import type {
  QueueItem,
  Entity,
  TimelineEvent,
  AttendanceSeries,
  Metrics,
  Contribution,
  RegistryCode,
  Tier,
  Acuity,
  CaseloadOverview,
  OblastStat,
  WorkerQueue,
  WorkerCase,
  FeedbackStats,
  Country,
  CrossBorderStats,
  Relationship,
  EvidenceStrength,
} from "./types";
import { IMMEDIATE_VIOLATIONS, regAccess } from "./registries";
import { makeParentalContribution, type ParentalInput } from "./parental";

/* ── детермінований PRNG (mulberry32) ── */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OBLASTS = [
  "Київська", "Харківська", "Львівська", "Дніпропетровська", "Одеська", "Запорізька",
  "Донецька", "Полтавська", "Вінницька", "Чернігівська", "Закарпатська", "Івано-Франківська",
];
const OBLAST_W = [12, 20, 9, 14, 10, 16, 18, 7, 6, 8, 5, 5];

const LAST = ["Коваленко", "Бондаренко", "Ткаченко", "Мельник", "Шевченко", "Кравчук", "Бойко", "Поліщук", "Савченко", "Гнатюк", "Лисенко", "Марченко", "Гончар", "Руденко", "Захарченко", "Петренко"];
const FIRST_M = ["Олександр", "Михайло", "Данило", "Артем", "Максим", "Назар", "Дмитро", "Богдан", "Андрій", "Іван", "Тимофій", "Владислав"];
const FIRST_F = ["Софія", "Анна", "Марія", "Олена", "Дарина", "Вероніка", "Катерина", "Поліна", "Злата", "Ангеліна", "Юлія", "Соломія"];
const PATR_M = ["Олександрович", "Іванович", "Миколайович", "Андрійович", "Сергійович", "Петрович", "Васильович"];
const PATR_F = ["Олександрівна", "Іванівна", "Миколаївна", "Андріївна", "Сергіївна", "Петрівна", "Василівна"];

/* ── профілі порушень (severity з scoring.yaml, докази з detection.py Фази 2) ── */
interface VProfile {
  sev: number;
  evidence: RegistryCode[];
}
const VPROFILE: Record<string, VProfile> = {
  W7_trafficking: { sev: 1, evidence: ["ERDR", "DITY"] },
  F6_sexual_abuse: { sev: 1, evidence: ["ERDR"] },
  W5_deportation: { sev: 1, evidence: ["CHILDWAR", "DITY"] },
  P1_physical_home: { sev: 0.9, evidence: ["EHEALTH", "DV", "ERDR", "DITY"] },
  W6_orphanhood: { sev: 0.85, evidence: ["DRACS", "EDRSR", "DITY"] },
  W8_medical_access: { sev: 0.75, evidence: ["EHEALTH", "VPO"] },
  F3_neglect: { sev: 0.7, evidence: ["EHEALTH", "AIKOM", "DITY"] },
  W3_out_of_education: { sev: 0.65, evidence: ["EDEBO", "AIKOM"] },
  F4_child_labor: { sev: 0.65, evidence: ["AIKOM"] },
  W2_psych_trauma: { sev: 0.6, evidence: ["EHEALTH", "CHILDWAR"] },
  W1_displacement: { sev: 0.55, evidence: ["VPO", "EDEBO", "EHEALTH", "CHILDWAR"] },
  E4_inclusion: { sev: 0.5, evidence: ["CBI", "EDEBO"] },
  E1_bullying: { sev: 0.5, evidence: ["AIKOM", "EHEALTH"] },
  W9_identity: { sev: 0.7, evidence: ["DRRP", "EDDR"] },
  F1_psych_violence: { sev: 0.6, evidence: ["HOTLINE", "DV", "EHEALTH", "DITY"] },
  // крос-кордонні (фаза 4) — лише для геро-кейсів UA+EE, не для генератора
  X2_uasc: { sev: 0.9, evidence: ["RAHV", "SKAIS"] },
  X1_gap: { sev: 0.78, evidence: ["RAHV", "EDEBO"] },
  X3_med_rupture: { sev: 0.7, evidence: ["EHEALTH", "RAHV"] },
  X4_edu_rupture: { sev: 0.62, evidence: ["EDEBO", "RAHV"] },
};
const ALL_VIOL = Object.keys(VPROFILE);

const SELECT_WEIGHT: Record<string, number> = {
  W1_displacement: 32, P1_physical_home: 22, E1_bullying: 20, F3_neglect: 18,
  W3_out_of_education: 16, W2_psych_trauma: 14, F1_psych_violence: 12, W8_medical_access: 10,
  F4_child_labor: 10, E4_inclusion: 8, W6_orphanhood: 7, W5_deportation: 6, W9_identity: 5,
  W7_trafficking: 4, F6_sexual_abuse: 4,
};
// крос-кордонні (X*) не генеруються випадково — лише у геро-кейсах UA+EE
const NONIMMEDIATE = ALL_VIOL.filter((v) => !IMMEDIATE_VIOLATIONS.has(v) && !v.startsWith("X"));
const IMMEDIATE_LIST = ALL_VIOL.filter((v) => IMMEDIATE_VIOLATIONS.has(v));

function wpick(r: () => number, pool: string[]): string {
  const total = pool.reduce((s, v) => s + (SELECT_WEIGHT[v] ?? 1), 0);
  let x = r() * total;
  for (const v of pool) {
    x -= SELECT_WEIGHT[v] ?? 1;
    if (x <= 0) return v;
  }
  return pool.at(-1) as string;
}

const EV_MULT: Record<number, number> = { 1: 0.6, 2: 1, 3: 1.3, 4: 1.5 };
const ACU_MULT: Record<Acuity, number> = { acute: 1.5, active: 1, chronic: 0.7, improving: 0.5 };

function evMult(n: number) {
  return EV_MULT[Math.min(n, 4) as 1 | 2 | 3 | 4] ?? 1.5;
}

function mkContribution(viol: string, evidence: RegistryCode[], acuity: Acuity): Contribution {
  const sev = VPROFILE[viol]?.sev ?? 0.4;
  const value = +(sev * evMult(evidence.length) * ACU_MULT[acuity]).toFixed(3);
  return { violation: viol, value, severity: sev, evidence, acuity };
}

function scoreOf(contribs: Contribution[], vuln: number): number {
  if (!contribs.length) return 0;
  const sorted = [...contribs].sort((a, b) => b.value - a.value);
  const raw = sorted[0].value + 0.2 * sorted.slice(1).reduce((s, c) => s + c.value, 0);
  return +(raw * vuln).toFixed(3);
}

function tierOf(score: number, immediate: boolean): Tier | null {
  if (immediate || score >= 1.8) return "T0";
  if (score >= 0.9) return "T1";
  if (score >= 0.35) return "T2";
  return null;
}

function vulnerability(
  age: number | null,
  registries: RegistryCode[],
  viols: string[],
): { mult: number; factors: string[] } {
  let m = 1;
  const f: string[] = [];
  if (age !== null && age < 6) { m *= 1.3; f.push("вік<6"); }
  else if (age !== null && age <= 10) { m *= 1.15; f.push("вік 6–10"); }
  if (registries.includes("CBI")) { m *= 1.3; f.push("інвалідність"); }
  if (registries.includes("DITY")) { m *= 1.2; f.push("уже в «Дітях»"); }
  if (viols.includes("W5_deportation") || viols.includes("W7_trafficking")) { m *= 1.4; f.push("без опікуна"); }
  if (registries.includes("VPO") || viols.includes("W1_displacement")) { m *= 1.2; f.push("ВПО"); }
  if (registries.includes("ERDR")) { m *= 1.25; f.push("фактор ризику (ЄРДР)"); }
  return { mult: Math.min(+m.toFixed(2), 2), factors: f };
}

type Gender = "m" | "f";
function makeName(r: () => number): { pib: string; gender: Gender } {
  const gender: Gender = r() < 0.5 ? "m" : "f";
  const last = LAST[Math.floor(r() * LAST.length)];
  const first = (gender === "m" ? FIRST_M : FIRST_F)[Math.floor(r() * FIRST_M.length)];
  const patr = (gender === "m" ? PATR_M : PATR_F)[Math.floor(r() * PATR_M.length)];
  return { pib: `${last} ${first} ${patr}`, gender };
}

function pickOblast(r: () => number): string {
  const total = OBLAST_W.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < OBLASTS.length; i++) {
    x -= OBLAST_W[i];
    if (x <= 0) return OBLASTS[i];
  }
  return OBLASTS[0];
}

const ACUITIES: Acuity[] = ["acute", "active", "chronic"];

/**
 * Кількість порушень для звичайного кейсу.
 * Зберігає послідовність викликів PRNG: другий r() викликається лише
 * якщо перший дав ≥ 0.6 (як у вихідному короткому замиканні тернара).
 */
function pickViolationCount(r: () => number): number {
  if (r() < 0.6) return 1;
  if (r() < 0.9) return 2;
  return 3;
}

interface FullCase extends QueueItem {
  oblast: string;
  timeline: TimelineEvent[];
  attendance: AttendanceSeries | null;
}

/** Дедлайни реагування за рівнем черги (caseload.TIER_DEADLINE). */
const TIER_DEADLINE = {
  T0: { label: "1 доба", detail: "оцінка рівня безпеки дитини (ПКМУ №585 п.9); насильство — повідомлення ≤3 год (ПКМУ №1513)" },
  T1: { label: "5–7 робочих днів", detail: "оцінка потреб і взяття на облік (СЖО без гострої загрози)" },
  T2: { label: "до 14 днів / планово", detail: "взяття на облік за інших обставин; спостереження" },
} as const;

/** Подія таймлайну з автоматичною позначкою Рівня-1 за рівнем доступу реєстру. */
function tev(date: string, registry: RegistryCode, label: string): TimelineEvent {
  return { date, registry, label, level1: regAccess(registry) === 1 };
}

/** Шкільні порушення — лише для шкільного віку (6–17), як гейт у detection.py. */
const SCHOOL_VIOLS = new Set([
  "W3_out_of_education",
  "F4_child_labor",
  "E1_bullying",
  "F3_neglect",
  "E4_inclusion",
]);

/** Вибір набору порушень для згенерованого кейсу (з урахуванням віку). */
function chooseViolations(r: () => number, age: number): string[] {
  const schoolAge = age >= 6 && age <= 17;
  const nonImm = schoolAge ? NONIMMEDIATE : NONIMMEDIATE.filter((v) => !SCHOOL_VIOLS.has(v));
  const chosen: string[] = [];
  if (r() < 0.05) {
    chosen.push(wpick(r, IMMEDIATE_LIST));
    if (r() < 0.35) chosen.push(wpick(r, nonImm));
    return chosen;
  }
  const nViol = pickViolationCount(r);
  const pool = [...nonImm];
  for (let k = 0; k < nViol && pool.length; k++) {
    const v = wpick(r, pool);
    chosen.push(v);
    pool.splice(pool.indexOf(v), 1);
  }
  return chosen;
}

/** Побудова відсортованого списку внесків за обраними порушеннями. */
function buildContributions(chosen: string[], r: () => number): Contribution[] {
  const contribs: Contribution[] = chosen.map((v) => {
    const prof = VPROFILE[v];
    const nEv = 1 + Math.floor(r() * Math.min(prof.evidence.length, 3));
    const evidence = prof.evidence.slice(0, Math.max(1, nEv));
    const acuity = ACUITIES[Math.floor(r() * ACUITIES.length)];
    return mkContribution(v, evidence, acuity);
  });
  contribs.sort((a, b) => b.value - a.value);
  return contribs;
}

/** Реєстри-докази для кейсу. EDDR і ДРАЦС присутні завжди (демографія + акт народження). */
function buildRegistries(contribs: Contribution[]): RegistryCode[] {
  const registries = Array.from(new Set(contribs.flatMap((c) => c.evidence))) as RegistryCode[];
  if (!registries.includes("EDDR")) registries.push("EDDR");
  if (!registries.includes("DRACS")) registries.push("DRACS");
  return registries;
}

/**
 * Батьківські / сімейні фактори ризику (фаза 5), корельовані з кейсом.
 * Суть, а не факт: сила доказу, давність, стосунок кривдника, роль дитини.
 * Запобіжники: економічний фактор — лише на ПОДІЇ припинення допомоги (не на
 * самій бідності); психіка/залежність — сила доказу «unknown» (мед.таємниця).
 */
function deriveParentalFactors(r: () => number, chosen: string[], registries: RegistryCode[]): ParentalInput[] {
  const out: ParentalInput[] = [];
  const has = (v: string) => chosen.includes(v);
  const rec = () => 1 + Math.floor(r() * 30); // давність 1..30 міс
  const rel = (): Relationship => (r() < 0.3 ? "stepparent" : "biological");

  // Домашнє насильство, кривдник — опікун (дитина жертва/свідок)
  if (has("P1_physical_home") || has("F1_psych_violence")) {
    let strength: EvidenceStrength = "substantiated";
    const evidence: RegistryCode[] = ["DV"];
    if (registries.includes("EDRSR")) { strength = "adjudicated"; evidence.push("EDRSR"); }
    else if (registries.includes("ERDR")) { strength = "alleged"; evidence.push("ERDR"); }
    out.push({
      kind: "dv_abuser", evidence, evidence_strength: strength, recency_months: rec(),
      relationship: rel(), role: has("P1_physical_home") ? "victim" : "witness",
    });
  }

  // Кримінал батьків (провадження/вирок щодо опікуна)
  if (registries.includes("ERDR") && (r() < 0.6 || has("F6_sexual_abuse"))) {
    const adjudicated = registries.includes("EDRSR") && r() < 0.5;
    out.push({
      kind: "crime_violent",
      evidence: adjudicated ? ["ERDR", "EDRSR"] : ["ERDR"],
      evidence_strength: adjudicated ? "adjudicated" : "alleged",
      recency_months: rec(), relationship: rel(),
    });
  } else if (r() < 0.04) {
    out.push({ kind: "crime_other", evidence: ["ERDR"], evidence_strength: "alleged", recency_months: rec() });
  }

  // Втрата / позбавлення батьків
  if (has("W6_orphanhood")) {
    out.push({ kind: "bereavement", evidence: ["DRACS"], evidence_strength: "adjudicated", recency_months: rec() });
    if (r() < 0.5) out.push({ kind: "deprivation", evidence: ["EDRSR"], evidence_strength: "adjudicated", recency_months: rec() });
  } else if (r() < 0.03) {
    out.push({ kind: "deprivation", evidence: ["EDRSR"], evidence_strength: "substantiated", recency_months: rec() });
  }

  // Залежність батьків із впливом на догляд (мед.таємниця → сила «unknown»)
  if (r() < (has("F3_neglect") ? 0.4 : 0.08)) {
    out.push({ kind: "addiction", evidence: ["EHEALTH"], evidence_strength: "unknown", recency_months: rec() });
  }
  // Психічний стан батьків із впливом на догляд
  if (r() < (has("W2_psych_trauma") ? 0.25 : 0.06)) {
    out.push({ kind: "mental_health", evidence: ["EHEALTH"], evidence_strength: "unknown", recency_months: rec() });
  }

  // Економічний шок — ЛИШЕ подія припинення/санкції допомоги (не статус бідності)
  if (r() < (has("F3_neglect") ? 0.3 : 0.06)) {
    out.push({ kind: "economic_shock", evidence: ["PFU", "EISSS"], evidence_strength: "substantiated", recency_months: rec() });
  }

  // Насильство над братом/сестрою (сильний проксі ризику)
  if (r() < 0.05) {
    out.push({ kind: "sibling_harm", evidence: ["DITY"], evidence_strength: "substantiated", recency_months: rec() });
  }

  return out.slice(0, 3); // не захаращуємо: до 3 факторів
}

/* ── генератор одного кейсу (null = підпороговий, у чергу не потрапляє) ── */
function genCase(i: number): FullCase | null {
  const r = rng(1000 + i * 2654435761);
  const { pib } = makeName(r);
  const age = 3 + Math.floor(r() * 15);
  const birthYear = 2024 - age;
  const birth_date = `${birthYear}-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`;
  const oblast = pickOblast(r);

  const chosen = chooseViolations(r, age);
  const childContribs = buildContributions(chosen, r);
  // батьківські/сімейні фактори — повноцінні внески, входять у скоринг і пояснення
  const parental = deriveParentalFactors(r, chosen, buildRegistries(childContribs));
  const parentalContribs = parental.map(makeParentalContribution);
  const contribs = [...childContribs, ...parentalContribs].sort((a, b) => b.value - a.value);
  const registries = buildRegistries(contribs);

  const immediate = chosen.some((v) => IMMEDIATE_VIOLATIONS.has(v));
  const { mult: vuln, factors } = vulnerability(age, registries, chosen);
  const score = scoreOf(contribs, vuln);
  const tier = tierOf(score, immediate);
  if (!tier) return null; // нижче порога T2 — система такого не флагує
  const schoolAge = age >= 6 && age <= 17;
  const unzr = r() < 0.85 ? `${birth_date.replaceAll("-", "")}-${String(10000 + Math.floor(r() * 89999))}` : null;

  return {
    rank: 0,
    entity_id: 1000 + i,
    unzr,
    pib,
    birth_date,
    age,
    tier,
    score,
    immediate,
    vulnerability: vuln,
    vuln_factors: factors,
    violations: childContribs.map((c) => c.violation), // чіпи/фільтр — лише власні порушення дитини
    registries: registries.toSorted((x, y) => x.localeCompare(y, "uk")),
    contributions: contribs, // обидва виміри (з тегом dimension)
    oblast,
    worker_id: null,
    country: "UA",
    timeline: deriveTimeline(registries, r, birth_date),
    attendance:
      schoolAge && registries.includes("AIKOM")
        ? deriveAttendance(r, contribs.some((c) => c.acuity === "acute"))
        : null,
  };
}

/** Дата реєстрації народження — у межах ~3 тижнів від дати народження дитини. */
function birthActDate(birthDate: string, r: () => number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!m) return birthDate;
  const day = Math.min(28, Number(m[3]) + 2 + Math.floor(r() * 16));
  return `${m[1]}-${m[2]}-${String(day).padStart(2, "0")}`;
}

/* ── похідний таймлайн із доказових реєстрів ── */
function deriveTimeline(registries: RegistryCode[], r: () => number, birthDate: string): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const d = (mFrom = 0, mTo = 23) => {
    const m = mFrom + Math.floor(r() * (mTo - mFrom + 1));
    const y = 2023 + Math.floor(m / 12);
    const mm = (m % 12) + 1;
    return `${y}-${String(mm).padStart(2, "0")}-${String(5 + Math.floor(r() * 22)).padStart(2, "0")}`;
  };
  const has = (c: RegistryCode) => registries.includes(c);
  ev.push(tev(birthActDate(birthDate, r), "DRACS", "Актовий запис про народження"));
  if (has("VPO")) ev.push(tev(d(2, 10), "VPO", "Взято на облік ВПО (переміщення)"));
  if (has("EHEALTH")) ev.push(tev(d(8, 16), "EHEALTH", "Декларацію із сімейним лікарем закрито"));
  if (has("EDEBO")) ev.push(tev(d(8, 18), "EDEBO", "Вихід зі школи (статус: переведено/відраховано)"));
  if (has("AIKOM")) ev.push(tev(d(10, 20), "AIKOM", "Різкий стрибок пропусків + падіння оцінок"));
  if (has("DV")) ev.push(tev(d(12, 22), "DV", "Виклик поліції за фактом домашнього насильства"));
  if (has("CBI")) ev.push(tev(d(2, 12), "CBI", "Встановлено інвалідність / потреба супроводу"));
  if (has("DITY")) ev.push(tev(d(12, 22), "DITY", "Взято на облік ССД (складні життєві обставини)"));
  if (has("CHILDWAR")) ev.push(tev(d(6, 18), "CHILDWAR", "Статус у реєстрі «Діти війни»"));
  if (has("EDRSR")) ev.push(tev(d(12, 22), "EDRSR", "Судове рішення щодо батьківських прав"));
  if (has("DRRP")) ev.push(tev(d(6, 20), "DRRP", "Відчуження житла дитини без дозволу опіки"));
  if (has("HOTLINE")) ev.push(tev(d(8, 22), "HOTLINE", "Звернення на гарячу лінію 116 111"));
  if (has("ERDR")) ev.push(tev(d(14, 23), "ERDR", "Внесено до ЄРДР досудове розслідування"));
  return ev.sort((a, b) => a.date.localeCompare(b.date));
}

/* ── похідна відвідуваність зі зламом (change-point); score_12 у шкалі 0..12 ── */
function deriveAttendance(r: () => number, acute: boolean): AttendanceSeries {
  const points = [];
  const cp = acute ? 7 + Math.floor(r() * 2) : 5 + Math.floor(r() * 3);
  for (let m = 0; m < 12; m++) {
    const after = m >= cp;
    const absences = after ? 5 + Math.floor(r() * 8) : Math.floor(r() * 3);
    const gpa = after ? +(3.2 + r() * 2.4).toFixed(1) : +(7.6 + r() * 4).toFixed(1);
    const y = 2023 + Math.floor((m + 8) / 12);
    const mm = ((m + 8) % 12) + 1;
    points.push({ period: `${y}-${String(mm).padStart(2, "0")}`, absences, gpa });
  }
  return { points, changePointIndex: cp };
}

/* ============================================================
   ГЕРО-КЕЙСИ — деталізовані сценарії для пітчу
   ============================================================ */
function makeHero(
  args: {
    id: number; pib: string; birth: string; age: number; oblast: string;
    contribs: Contribution[]; registries: RegistryCode[]; immediate?: boolean;
    unzr: string | null; timeline: TimelineEvent[]; attendance?: AttendanceSeries | null;
    country?: Country; isikukood?: string | null; link_score?: number;
    parental?: ParentalInput[]; // батьківські/сімейні фактори (фаза 5)
  },
): FullCase {
  const parentalContribs = (args.parental ?? []).map(makeParentalContribution);
  const childContribs = [...args.contribs];
  const contribs = [...childContribs, ...parentalContribs].sort((a, b) => b.value - a.value);
  const viols = childContribs.map((c) => c.violation); // чіпи — лише власні порушення
  // реєстри-докази батьківських факторів додаються до набору профілю
  const registries = Array.from(new Set([...args.registries, ...parentalContribs.flatMap((c) => c.evidence)])) as RegistryCode[];
  const { mult, factors } = vulnerability(args.age, registries, viols);
  const immediate = !!args.immediate;
  const score = scoreOf(contribs, mult);
  return {
    rank: 0, entity_id: args.id, unzr: args.unzr, pib: args.pib,
    birth_date: args.birth, age: args.age, tier: tierOf(score, immediate) ?? "T2",
    score, immediate, vulnerability: mult, vuln_factors: factors,
    violations: viols, registries: registries.toSorted((x, y) => x.localeCompare(y, "uk")), contributions: contribs,
    oblast: args.oblast, worker_id: null, timeline: args.timeline, attendance: args.attendance ?? null,
    country: args.country ?? "UA", isikukood: args.isikukood ?? null, link_score: args.link_score,
  };
}

function hero(): FullCase[] {
  return [
    // 1 ── Сигнатурний кейс: дитина випала у щілину МІЖ КРАЇНАМИ (UA→EE)
    makeHero({
      id: 5001, pib: "Ткаченко Софія Андріївна", birth: "2016-03-12", age: 8, oblast: "Харківська",
      unzr: "20160312-48217",
      country: "UA+EE", isikukood: "61603122174", link_score: 0.94,
      contribs: [
        mkContribution("X1_gap", ["RAHV", "EDEBO"], "acute"),
        mkContribution("X4_edu_rupture", ["EDEBO", "RAHV"], "acute"),
      ],
      // RAHV (населення EE) бачить дитину, EHIS_EE (школа) і TERVIS (медицина) — ні: оце і є щілина
      registries: ["EDDR", "DRACS", "VPO", "EDEBO", "AIKOM", "EHEALTH", "RAHV"],
      timeline: [
        tev("2023-02-18", "VPO", "Облік ВПО: переміщення Харківська → Львівська обл."),
        tev("2023-05-20", "EDEBO", "Вихід зі школи (переведено), нову не зафіксовано"),
        tev("2023-06-15", "AIKOM", "Останній запис відвідуваності в Україні — далі тиша"),
        tev("2023-06-28", "RAHV", "Перетин кордону: реєстрація в населенні Естонії (Rahvastikuregister)"),
        tev("2023-09-04", "EHEALTH", "Декларацію із сімейним лікарем у НСЗУ закрито"),
      ],
      attendance: {
        points: [
          { period: "2022-09", absences: 1, gpa: 11.2 }, { period: "2022-10", absences: 0, gpa: 11.5 },
          { period: "2022-11", absences: 2, gpa: 10.8 }, { period: "2022-12", absences: 1, gpa: 11 },
          { period: "2023-01", absences: 2, gpa: 10.4 }, { period: "2023-02", absences: 7, gpa: 8.6 },
          { period: "2023-03", absences: 11, gpa: 6.8 }, { period: "2023-04", absences: 14, gpa: 5.4 },
          { period: "2023-05", absences: 18, gpa: 4.2 }, { period: "2023-06", absences: 20, gpa: 3.6 },
        ],
        changePointIndex: 5,
      },
    }),

    // 2 ── Торгівля людьми [immediate]
    makeHero({
      id: 5002, pib: "Бойко Ангеліна Сергіївна", birth: "2009-07-21", age: 15, oblast: "Одеська",
      unzr: "20090721-77104", immediate: true,
      contribs: [
        mkContribution("W7_trafficking", ["ERDR", "DITY"], "acute"),
        mkContribution("W1_displacement", ["VPO", "CHILDWAR"], "active"),
      ],
      registries: ["EDDR", "VPO", "CHILDWAR", "DITY", "ERDR"],
      timeline: [
        tev("2023-03-10", "VPO", "Облік ВПО: переміщення із Запорізької обл."),
        tev("2023-05-08", "CHILDWAR", "Статус «Діти війни»: переміщення із зони бойових дій"),
        tev("2024-01-22", "DITY", "Сигнал ССД: підозра на залучення до експлуатації"),
        tev("2024-02-05", "ERDR", "Досудове розслідування ст.149 ККУ (торгівля людьми)"),
      ],
    }),

    // 3 ── Фізичне насильство вдома — перетин 4 реєстрів; ризик прямо від кривдника
    makeHero({
      id: 5003, pib: "Мельник Данило Олександрович", birth: "2017-05-18", age: 7, oblast: "Дніпропетровська",
      unzr: "20170518-30945",
      contribs: [mkContribution("P1_physical_home", ["EHEALTH", "DV", "ERDR", "DITY"], "acute")],
      registries: ["EDDR", "DRACS", "EHEALTH", "DV", "ERDR", "DITY"],
      parental: [
        { kind: "dv_abuser", evidence: ["DV", "ERDR"], evidence_strength: "alleged", recency_months: 3, relationship: "stepparent", role: "victim" },
        { kind: "crime_violent", evidence: ["ERDR"], evidence_strength: "alleged", recency_months: 4, relationship: "stepparent" },
      ],
      timeline: [
        tev("2023-10-03", "EHEALTH", "Звернення: травма (домашня обстановка)"),
        tev("2023-11-19", "DV", "Виклик поліції за адресою (дитина присутня)"),
        tev("2024-01-14", "EHEALTH", "Повторна травма + звернення до психолога"),
        tev("2024-02-02", "ERDR", "Досудове розслідування ст.126-1 ККУ (домашнє насильство)"),
        tev("2024-02-20", "DITY", "Взято на облік ССД"),
      ],
    }),

    // 4 ── Депортація [immediate]
    makeHero({
      id: 5004, pib: "Гнатюк Максим Іванович", birth: "2013-02-08", age: 11, oblast: "Донецька",
      unzr: "20130208-61530", immediate: true,
      contribs: [mkContribution("W5_deportation", ["CHILDWAR", "DITY"], "acute")],
      registries: ["EDDR", "CHILDWAR", "DITY"],
      timeline: [
        tev("2023-07-15", "CHILDWAR", "Статус «Діти війни»: депортовано, розрив звʼязку з опікуном"),
        tev("2023-08-01", "DITY", "Облік ССД: дитина без супроводу"),
      ],
    }),

    // 5 ── Сексуальне насильство [immediate]
    makeHero({
      id: 5005, pib: "Савченко Поліна Миколаївна", birth: "2011-09-30", age: 13, oblast: "Київська",
      unzr: "20110930-55218", immediate: true,
      contribs: [mkContribution("F6_sexual_abuse", ["ERDR"], "acute")],
      registries: ["EDDR", "DRACS", "ERDR"],
      timeline: [tev("2024-03-08", "ERDR", "Досудове розслідування ст.152 ККУ")],
    }),

    // 6 ── Сирітство / втрата опіки (суд + ССД)
    makeHero({
      id: 5006, pib: "Кравчук Злата Андріївна", birth: "2019-04-15", age: 5, oblast: "Полтавська",
      unzr: "20190415-19022",
      contribs: [mkContribution("W6_orphanhood", ["DRACS", "EDRSR", "DITY"], "active")],
      registries: ["EDDR", "DRACS", "EDRSR", "DITY"],
      parental: [
        { kind: "bereavement", evidence: ["DRACS"], evidence_strength: "adjudicated", recency_months: 6 },
        { kind: "deprivation", evidence: ["EDRSR"], evidence_strength: "adjudicated", recency_months: 5 },
      ],
      timeline: [
        tev("2023-12-02", "DRACS", "Актовий запис про смерть одного з батьків"),
        tev("2024-01-10", "EDRSR", "Судове рішення: позбавлення батьківських прав"),
        tev("2024-01-18", "DITY", "Взято на облік: загроза втрати піклування"),
      ],
    }),

    // 7 ── Нехтування потребами; контекст — залежність батьків + обрив допомоги
    makeHero({
      id: 5007, pib: "Лисенко Артем Петрович", birth: "2015-06-25", age: 9, oblast: "Запорізька",
      unzr: null,
      contribs: [mkContribution("F3_neglect", ["EHEALTH", "AIKOM", "DITY"], "active")],
      registries: ["EDDR", "EHEALTH", "AIKOM", "DITY"],
      parental: [
        { kind: "addiction", evidence: ["EHEALTH"], evidence_strength: "unknown", recency_months: 7 },
        { kind: "economic_shock", evidence: ["PFU", "EISSS"], evidence_strength: "substantiated", recency_months: 4 },
      ],
      timeline: [
        tev("2023-09-10", "AIKOM", "Систематичні пропуски без поважної причини"),
        tev("2023-10-05", "EHEALTH", "Пропущено планову імунізацію / огляд"),
        tev("2023-11-20", "DITY", "Облік: малозабезпечена родина"),
      ],
      attendance: deriveAttendance(rng(70007), false),
    }),

    // 8 ── Булінг
    makeHero({
      id: 5008, pib: "Марченко Вероніка Сергіївна", birth: "2012-01-11", age: 12, oblast: "Львівська",
      unzr: "20120111-44760",
      contribs: [mkContribution("E1_bullying", ["AIKOM", "EHEALTH"], "active")],
      registries: ["EDDR", "AIKOM", "EHEALTH"],
      timeline: [
        tev("2023-11-02", "AIKOM", "Стрибок пропусків + падіння оцінок"),
        tev("2023-12-10", "EHEALTH", "Звернення до психолога"),
        tev("2024-01-15", "AIKOM", "Засідання комісії з протидії булінгу"),
      ],
      attendance: deriveAttendance(rng(80008), true),
    }),

    // 9 ── Психотравма (спостереження)
    makeHero({
      id: 5009, pib: "Руденко Богдан Олександрович", birth: "2014-08-22", age: 10, oblast: "Чернігівська",
      unzr: "20140822-28819",
      contribs: [mkContribution("W2_psych_trauma", ["EHEALTH", "CHILDWAR"], "active")],
      registries: ["EDDR", "EHEALTH", "CHILDWAR"],
      timeline: [
        tev("2023-05-14", "CHILDWAR", "Статус «Діти війни»: переміщення"),
        tev("2023-08-30", "EHEALTH", "Повторні звернення до психолога"),
      ],
    }),

    // 10 ── Поза освітою — dropout АІКОМ
    makeHero({
      id: 5010, pib: "Захарченко Назар Іванович", birth: "2010-05-03", age: 14, oblast: "Вінницька",
      unzr: "20100503-90233",
      contribs: [mkContribution("W3_out_of_education", ["EDEBO", "AIKOM"], "active")],
      registries: ["EDDR", "EDEBO", "AIKOM"],
      timeline: [
        tev("2023-10-01", "AIKOM", "Останній запис відвідуваності"),
        tev("2023-10-20", "EDEBO", "Відраховано без переведення до іншого закладу"),
      ],
      attendance: deriveAttendance(rng(100010), false),
    }),

    // 11 ── Розрив медичного супроводу при переїзді в Естонію (UA→EE)
    makeHero({
      id: 5011, pib: "Петренко Марія Андріївна", birth: "2020-12-07", age: 4, oblast: "Запорізька",
      unzr: "20201207-13408",
      country: "UA+EE", isikukood: "62012074081", link_score: 0.91,
      contribs: [
        mkContribution("X3_med_rupture", ["EHEALTH", "RAHV"], "acute"),
      ],
      // дитина з хронічним діагнозом виїхала; RAHV є, TERVIS (медицина EE) запису про неї не має
      registries: ["EDDR", "DRACS", "VPO", "EHEALTH", "RAHV"],
      timeline: [
        tev("2023-04-11", "VPO", "Облік ВПО"),
        tev("2023-08-19", "RAHV", "Перетин кордону: реєстрація в населенні Естонії"),
        tev("2023-10-22", "EHEALTH", "Декларацію в НСЗУ закрито; хронічний діагноз без супроводу"),
      ],
    }),

    // 12 ── Інклюзія: дитина з інвалідністю без супроводу (НОВЕ порушення E4)
    makeHero({
      id: 5012, pib: "Гончар Іван Миколайович", birth: "2015-11-19", age: 9, oblast: "Івано-Франківська",
      unzr: "20151119-67001",
      contribs: [mkContribution("E4_inclusion", ["CBI", "EDEBO"], "active")],
      registries: ["EDDR", "CBI", "EDEBO"],
      timeline: [
        tev("2023-03-05", "CBI", "Встановлено інвалідність; потреба інклюзивного супроводу"),
        tev("2023-09-01", "EDEBO", "Зараховано без інклюзивного класу / асистента"),
      ],
    }),

    // 13 ── Дитяча праця (НОВЕ порушення F4)
    makeHero({
      id: 5013, pib: "Поліщук Дмитро Васильович", birth: "2009-03-14", age: 15, oblast: "Закарпатська",
      unzr: "20090314-28557",
      contribs: [mkContribution("F4_child_labor", ["AIKOM"], "active")],
      registries: ["EDDR", "AIKOM"],
      timeline: [tev("2023-10-08", "AIKOM", "Систематичні денні пропуски без ознак булінгу/хвороби")],
      attendance: deriveAttendance(rng(130013), false),
    }),

    // 14 ── Переміщення (спостереження)
    makeHero({
      id: 5014, pib: "Бондаренко Соломія Петрівна", birth: "2008-11-19", age: 16, oblast: "Харківська",
      unzr: "20081119-67230",
      contribs: [mkContribution("W1_displacement", ["VPO", "EDEBO"], "chronic")],
      registries: ["EDDR", "DRACS", "VPO", "EDEBO"],
      timeline: [
        tev("2023-03-22", "VPO", "Облік ВПО"),
        tev("2023-09-01", "EDEBO", "Вихід зі школи (переведено), нову не зафіксовано"),
      ],
    }),

    // 15 ── Дитина без супроводу дорослого за кордоном (UASC, UA→EE) [immediate]
    makeHero({
      id: 5015, pib: "Шевченко Артем Вікторович", birth: "2009-04-17", age: 15, oblast: "Донецька",
      unzr: "20090417-30921", immediate: true,
      country: "UA+EE", isikukood: "50904173092", link_score: 0.88,
      contribs: [
        mkContribution("X2_uasc", ["RAHV", "SKAIS"], "acute"),
        mkContribution("X1_gap", ["RAHV", "EDEBO"], "active"),
      ],
      registries: ["EDDR", "VPO", "CHILDWAR", "RAHV", "SKAIS"],
      timeline: [
        tev("2023-06-10", "CHILDWAR", "Статус «Діти війни»: виїзд із зони бойових дій"),
        tev("2023-07-02", "RAHV", "Перетин кордону: реєстрація в населенні Естонії — без супроводу дорослого"),
        tev("2023-07-15", "SKAIS", "Естонська служба опіки (SKAIS): відкрито справу неповнолітнього без супроводу"),
      ],
    }),

    // 16 ── ПРЕВЕНЦІЯ: немовля без власних порушень, але кривдник-вітчим удома з вироком.
    //        Ризик дитини походить ВИКЛЮЧНО від батьків — система бачить його ДО прямої шкоди.
    makeHero({
      id: 5016, pib: "Гриценко Єва Олександрівна", birth: "2023-09-04", age: 1, oblast: "Миколаївська",
      unzr: "20230904-50118",
      contribs: [],
      registries: ["EDDR", "DRACS"],
      parental: [
        { kind: "crime_violent", evidence: ["ERDR", "EDRSR"], evidence_strength: "adjudicated", recency_months: 5, relationship: "stepparent" },
        { kind: "dv_abuser", evidence: ["DV"], evidence_strength: "substantiated", recency_months: 2, relationship: "stepparent", role: "witness" },
        { kind: "sibling_harm", evidence: ["DITY"], evidence_strength: "substantiated", recency_months: 8 },
      ],
      timeline: [
        tev("2024-01-12", "DV", "Виклик поліції за адресою; у домі немовля"),
        tev("2024-02-03", "EDRSR", "Обвинувальний вирок вітчиму за насильство (інша дитина)"),
        tev("2024-03-01", "DITY", "Сигнал ССД: загроза для наймолодшої дитини в родині"),
      ],
    }),
  ];
}

/* ============================================================
   Збірка повного набору
   ============================================================ */

/** Кількість записів у реєстрі (демо-евристика). */
function recordCount(reg: RegistryCode, entityId: number): number {
  if (reg === "AIKOM") return 10;
  if (reg === "EHEALTH") return 2 + (entityId % 3);
  return 1;
}

/** Явна проєкція FullCase → QueueItem (без полів oblast/timeline/attendance). */
function toQueueItem(c: FullCase): QueueItem {
  return {
    rank: c.rank,
    entity_id: c.entity_id,
    unzr: c.unzr,
    pib: c.pib,
    birth_date: c.birth_date,
    age: c.age,
    tier: c.tier,
    score: c.score,
    immediate: c.immediate,
    vulnerability: c.vulnerability,
    vuln_factors: c.vuln_factors,
    violations: c.violations,
    registries: c.registries,
    contributions: c.contributions,
    oblast: c.oblast,
    worker_id: c.worker_id,
    country: c.country,
    isikukood: c.isikukood,
    link_score: c.link_score,
  };
}

const TIER_ORDER: Record<Tier, number> = { T0: 0, T1: 1, T2: 2 };
const CAPACITY_PER_WORKER = 12;
const TOTAL_CASEWORKERS = 30;

/**
 * Розподіл черги по кейсворкерах (дзеркало caseload.compute):
 * територіальна маршрутизація + ємність за нормативом + перелив.
 * Мутує worker_id у переданих кейсах і повертає зведення.
 */
function computeCaseload(all: FullCase[]): CaseloadOverview {
  const wTotal = OBLAST_W.reduce((a, b) => a + b, 0);
  const weightOf = (o: string) => {
    const idx = OBLASTS.indexOf(o);
    return idx >= 0 ? OBLAST_W[idx] / wTotal : 0.02;
  };

  const byObl = new Map<string, FullCase[]>();
  for (const c of all) {
    const o = c.oblast || "—";
    const arr = byObl.get(o) ?? [];
    if (arr.length === 0) byObl.set(o, arr);
    arr.push(c);
  }

  const roster: Record<string, number> = {};
  for (const o of byObl.keys()) roster[o] = Math.max(1, Math.round(TOTAL_CASEWORKERS * weightOf(o)));

  const oblastStats: OblastStat[] = [];
  let assigned = 0;
  let overflowTotal = 0;
  for (const [obl, cases] of byObl) {
    cases.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.score - a.score);
    const nWorkers = roster[obl];
    const capTotal = nWorkers * CAPACITY_PER_WORKER;
    cases.forEach((c, i) => {
      c.worker_id = i < capTotal ? `${obl}-${(i % nWorkers) + 1}` : null;
    });
    const covered = Math.min(cases.length, capTotal);
    const overflow = Math.max(0, cases.length - capTotal);
    const over = cases.slice(capTotal);
    assigned += covered;
    overflowTotal += overflow;
    oblastStats.push({
      oblast: obl,
      workers: nWorkers,
      capacity: capTotal,
      cases: cases.length,
      covered,
      overflow,
      t0: cases.filter((c) => c.tier === "T0").length,
      t1: cases.filter((c) => c.tier === "T1").length,
      t2: cases.filter((c) => c.tier === "T2").length,
      utilization: capTotal ? +(cases.length / capTotal).toFixed(2) : 0,
      urgent_uncovered: over.filter((c) => c.tier === "T0" || c.tier === "T1").length,
      extra_workers_needed: overflow ? Math.ceil(overflow / CAPACITY_PER_WORKER) : 0,
    });
  }
  oblastStats.sort((a, b) => b.urgent_uncovered - a.urgent_uncovered || b.overflow - a.overflow);

  return {
    roster,
    capacity_per_worker: CAPACITY_PER_WORKER,
    total_caseworkers: TOTAL_CASEWORKERS,
    oblast_stats: oblastStats,
    deadlines: TIER_DEADLINE,
    summary: {
      total_cases: all.length,
      assigned,
      overflow: overflowTotal,
      urgent_uncovered: oblastStats.reduce((s, o) => s + o.urgent_uncovered, 0),
      extra_workers_needed: oblastStats.reduce((s, o) => s + o.extra_workers_needed, 0),
    },
  };
}

function build() {
  const featured = hero();
  const generated: FullCase[] = [];
  // генеруємо із запасом; підпорогові (genCase → null) у чергу не потрапляють
  for (let i = 0; i < 300; i++) {
    const c = genCase(i);
    if (c) generated.push(c);
  }

  const all = [...featured, ...generated];
  all.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || Number(b.immediate) - Number(a.immediate) || b.score - a.score);
  all.forEach((c, idx) => (c.rank = idx + 1));

  const caseload = computeCaseload(all); // призначає worker_id кожному кейсу
  const items: QueueItem[] = all.map(toQueueItem);

  const entities: Record<number, Entity & { oblast: string }> = {};
  const timelines: Record<number, TimelineEvent[]> = {};
  const attendance: Record<number, AttendanceSeries | null> = {};
  for (const c of all) {
    const records: Partial<Record<RegistryCode, number>> = {};
    for (const reg of c.registries) {
      records[reg] = recordCount(reg, c.entity_id);
    }
    entities[c.entity_id] = {
      entity_id: c.entity_id, unzr: c.unzr, pib: c.pib, birth_date: c.birth_date,
      registries: c.registries, n_registries: c.registries.length, records, oblast: c.oblast,
    };
    timelines[c.entity_id] = c.timeline;
    attendance[c.entity_id] = c.attendance;
  }

  return { all, items, entities, timelines, attendance, caseload };
}

const DATA = build();

/* ── метрики (відповідають README: ~5000 дітей) ── */
export const MOCK_METRICS: Metrics = {
  matching: {
    true_children: 5000, entities: 5218, reconstruction_rate: 0.961, pure_clusters: 4894, fuzzy_attached: 612,
  },
  detection: {
    overall: { precision: 0.97, recall: 0.88, f1: 0.92 },
    per_violation: {
      W7_trafficking: { tp: 34, fp: 0, fn: 2, precision: 1, recall: 0.94 },
      F6_sexual_abuse: { tp: 31, fp: 0, fn: 3, precision: 1, recall: 0.91 },
      W5_deportation: { tp: 46, fp: 1, fn: 4, precision: 0.98, recall: 0.92 },
      P1_physical_home: { tp: 152, fp: 4, fn: 17, precision: 0.97, recall: 0.9 },
      W6_orphanhood: { tp: 58, fp: 1, fn: 6, precision: 0.98, recall: 0.91 },
      E4_inclusion: { tp: 71, fp: 3, fn: 9, precision: 0.96, recall: 0.89 },
      W8_medical_access: { tp: 121, fp: 6, fn: 19, precision: 0.95, recall: 0.86 },
      F3_neglect: { tp: 138, fp: 9, fn: 24, precision: 0.94, recall: 0.85 },
      W3_out_of_education: { tp: 174, fp: 7, fn: 21, precision: 0.96, recall: 0.89 },
      F4_child_labor: { tp: 63, fp: 8, fn: 16, precision: 0.89, recall: 0.8 },
      W2_psych_trauma: { tp: 96, fp: 8, fn: 22, precision: 0.92, recall: 0.81 },
      W1_displacement: { tp: 287, fp: 11, fn: 28, precision: 0.96, recall: 0.91 },
      E1_bullying: { tp: 142, fp: 12, fn: 26, precision: 0.92, recall: 0.85 },
      F1_psych_violence: { tp: 88, fp: 9, fn: 21, precision: 0.91, recall: 0.81 },
      W9_identity: { tp: 27, fp: 2, fn: 7, precision: 0.93, recall: 0.79 },
    },
  },
  privacy: { n_pairs: 5218, precision: 1, recall: 0.95 },
};

/* ── Фаза 4: крос-кордон UA↔EE (PPRL-звʼязування без обміну ПІБ) ── */
export const MOCK_CROSSBORDER: CrossBorderStats = {
  ee_entities: 563, // українських дітей, відомих естонським реєстрам
  linked: 533, // звʼязано з українським профілем через PPRL (приватне зіставлення)
  ee_unmatched: 30, // лишилися «у щілині» — є в EE, не знайдено пари в UA
  link_rate: 0.947,
};

export const mockData = {
  items: DATA.items,
  full: DATA.all,
  entities: DATA.entities,
  timelines: DATA.timelines,
  attendance: DATA.attendance,
  metrics: MOCK_METRICS,
  caseload: DATA.caseload,
  crossborder: MOCK_CROSSBORDER,
};

export function mockOblastOf(entityId: number): string {
  return DATA.entities[entityId]?.oblast ?? "—";
}

/* ── Фаза 3: персональні черги наглядачів + штат + feedback ── */
function toWorkerCase(c: FullCase): WorkerCase {
  return {
    rank: c.rank, entity_id: c.entity_id, pib: c.pib, age: c.age, oblast: c.oblast,
    tier: c.tier, score: c.score, immediate: c.immediate, violations: c.violations,
  };
}

const WORKER_INDEX: Record<string, FullCase[]> = (() => {
  const idx: Record<string, FullCase[]> = {};
  for (const c of DATA.all) {
    if (!c.worker_id) continue;
    if (!idx[c.worker_id]) idx[c.worker_id] = [];
    idx[c.worker_id].push(c);
  }
  for (const id of Object.keys(idx)) {
    idx[id].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.score - a.score);
  }
  return idx;
})();

/** Перелік наглядачів (для селектора «Моя черга»), відсортований за напругою. */
export function mockWorkers(): { worker_id: string; oblast: string; count: number; t0: number }[] {
  return Object.entries(WORKER_INDEX)
    .map(([worker_id, cases]) => ({
      worker_id,
      oblast: cases[0]?.oblast ?? "—",
      count: cases.length,
      t0: cases.filter((c) => c.tier === "T0").length,
    }))
    .sort((a, b) => b.t0 - a.t0 || b.count - a.count);
}

export function mockWorkerQueue(workerId: string): WorkerQueue {
  const cases = (WORKER_INDEX[workerId] ?? []).map(toWorkerCase);
  return { worker_id: workerId, count: cases.length, cases };
}

export const MOCK_FEEDBACK_STATS: FeedbackStats = {
  total: 0,
  labeled: 0,
  ready_to_train: false,
  note: "Ще немає зворотного звʼязку — джерело майбутніх міток порожнє.",
};
