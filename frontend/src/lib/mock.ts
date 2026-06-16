/**
 * Демо-дані Ластівки (синтетичні, структурно ідентичні реальним реєстрам).
 * Детерміновані (seeded PRNG) — однаковий результат на сервері й клієнті,
 * без hydration-mismatch. 12 деталізованих «геро»-кейсів + згенерована
 * популяція для реалістичних графіків управлінської панелі.
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
} from "./types";
import { IMMEDIATE_VIOLATIONS } from "./registries";

/* ── детермінований PRNG (mulberry32) ── */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OBLASTS = [
  "Київська",
  "Харківська",
  "Львівська",
  "Дніпропетровська",
  "Одеська",
  "Запорізька",
  "Донецька",
  "Полтавська",
  "Вінницька",
  "Чернігівська",
];
// частоти регіонів (прифронтові — частіше)
const OBLAST_W = [12, 20, 9, 14, 10, 16, 18, 7, 6, 8];

const LAST_M = ["Коваленко", "Бондаренко", "Ткаченко", "Мельник", "Шевченко", "Кравчук", "Бойко", "Поліщук", "Савченко", "Гнатюк", "Лисенко", "Марченко", "Гончар", "Руденко", "Захарченко", "Петренко"];
const LAST_F = LAST_M; // прізвища в демо не відмінюємо
const FIRST_M = ["Олександр", "Михайло", "Данило", "Артем", "Максим", "Назар", "Дмитро", "Богдан", "Андрій", "Іван", "Тимофій", "Владислав"];
const FIRST_F = ["Софія", "Анна", "Марія", "Олена", "Дарина", "Вероніка", "Катерина", "Поліна", "Злата", "Ангеліна", "Юлія", "Соломія"];
const PATR_M = ["Олександрович", "Іванович", "Миколайович", "Андрійович", "Сергійович", "Петрович", "Васильович"];
const PATR_F = ["Олександрівна", "Іванівна", "Миколаївна", "Андріївна", "Сергіївна", "Петрівна", "Василівна"];

/* ── профілі порушень (severity з scoring.yaml, типові докази з detection.py) ── */
interface VProfile {
  sev: number;
  evidence: RegistryCode[];
}
const VPROFILE: Record<string, VProfile> = {
  W7_trafficking: { sev: 1.0, evidence: ["ERDR", "SSD"] },
  F6_sexual_abuse: { sev: 1.0, evidence: ["ERDR"] },
  W5_deportation: { sev: 1.0, evidence: ["CHILDWAR", "SSD"] },
  P1_physical_home: { sev: 0.9, evidence: ["EHEALTH", "VIOLENCE", "ERDR", "SSD"] },
  W6_orphanhood: { sev: 0.85, evidence: ["DRACS", "SSD"] },
  W8_medical_access: { sev: 0.75, evidence: ["EHEALTH", "VPO"] },
  F3_neglect: { sev: 0.7, evidence: ["EHEALTH", "ISUO", "SSD"] },
  W3_out_of_education: { sev: 0.65, evidence: ["EDEBO", "ISUO"] },
  W2_psych_trauma: { sev: 0.6, evidence: ["EHEALTH", "CHILDWAR"] },
  W1_displacement: { sev: 0.55, evidence: ["VPO", "EDEBO", "EHEALTH", "CHILDWAR"] },
  E1_bullying: { sev: 0.5, evidence: ["ISUO", "EHEALTH"] },
};
const ALL_VIOL = Object.keys(VPROFILE);

// ваги вибору порушення (з config.yaml shock_weights) — immediate рідкісні
const SELECT_WEIGHT: Record<string, number> = {
  W1_displacement: 32, P1_physical_home: 22, E1_bullying: 20, F3_neglect: 18,
  W3_out_of_education: 16, W2_psych_trauma: 14, W8_medical_access: 10,
  W6_orphanhood: 7, W5_deportation: 6, W7_trafficking: 4, F6_sexual_abuse: 4,
};
const NONIMMEDIATE = ALL_VIOL.filter((v) => !IMMEDIATE_VIOLATIONS.has(v));
const IMMEDIATE_LIST = ALL_VIOL.filter((v) => IMMEDIATE_VIOLATIONS.has(v));

function wpick(r: () => number, pool: string[]): string {
  const total = pool.reduce((s, v) => s + (SELECT_WEIGHT[v] ?? 1), 0);
  let x = r() * total;
  for (const v of pool) {
    x -= SELECT_WEIGHT[v] ?? 1;
    if (x <= 0) return v;
  }
  return pool[pool.length - 1];
}

const EV_MULT: Record<number, number> = { 1: 0.6, 2: 1.0, 3: 1.3, 4: 1.5 };
const ACU_MULT: Record<Acuity, number> = { acute: 1.5, active: 1.0, chronic: 0.7, improving: 0.5 };

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
  if (registries.includes("SSD")) { m *= 1.2; f.push("уже в «Дітях»"); }
  if (viols.includes("W5_deportation") || viols.includes("W7_trafficking")) { m *= 1.4; f.push("без опікуна"); }
  if (registries.includes("VPO") || viols.includes("W1_displacement")) { m *= 1.2; f.push("ВПО"); }
  if (registries.includes("ERDR")) { m *= 1.25; f.push("фактор ризику (ЄРДР)"); }
  return { mult: Math.min(+m.toFixed(2), 2.0), factors: f };
}

type Gender = "m" | "f";
function makeName(r: () => number): { pib: string; gender: Gender } {
  const gender: Gender = r() < 0.5 ? "m" : "f";
  const last = (gender === "m" ? LAST_M : LAST_F)[Math.floor(r() * LAST_M.length)];
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

interface FullCase extends QueueItem {
  oblast: string;
  timeline: TimelineEvent[];
  attendance: AttendanceSeries | null;
}

/* ── генератор одного кейсу ── */
function genCase(i: number): FullCase {
  const r = rng(1000 + i * 2654435761);
  const { pib } = makeName(r);
  const age = 3 + Math.floor(r() * 15); // 3..17
  const birthYear = 2024 - age;
  const birth_date = `${birthYear}-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`;
  const oblast = pickOblast(r);

  // вибір порушень: immediate-кейси рідкісні (~8%), решта — звичайні зважені
  const chosen: string[] = [];
  if (r() < 0.08) {
    chosen.push(wpick(r, IMMEDIATE_LIST));
    if (r() < 0.35) chosen.push(wpick(r, NONIMMEDIATE)); // напр. супутнє переміщення
  } else {
    const nViol = r() < 0.6 ? 1 : r() < 0.9 ? 2 : 3;
    const pool = [...NONIMMEDIATE];
    for (let k = 0; k < nViol && pool.length; k++) {
      const v = wpick(r, pool);
      chosen.push(v);
      pool.splice(pool.indexOf(v), 1);
    }
  }

  const contribs: Contribution[] = chosen.map((v) => {
    const prof = VPROFILE[v];
    const nEv = 1 + Math.floor(r() * Math.min(prof.evidence.length, 3));
    const evidence = prof.evidence.slice(0, Math.max(1, nEv));
    const acuity = ACUITIES[Math.floor(r() * ACUITIES.length)];
    return mkContribution(v, evidence, acuity);
  });
  contribs.sort((a, b) => b.value - a.value);

  const registries = Array.from(new Set(contribs.flatMap((c) => c.evidence))) as RegistryCode[];
  // додамо опорні реєстри (всі діти є в ЄДДР/ДРАЦС)
  if (!registries.includes("EDDR")) registries.push("EDDR");
  if (r() < 0.6 && !registries.includes("DRACS")) registries.push("DRACS");

  const immediate = chosen.some((v) => IMMEDIATE_VIOLATIONS.has(v));
  const { mult: vuln, factors } = vulnerability(age, registries, chosen);
  const score = scoreOf(contribs, vuln);
  const tier = tierOf(score, immediate) ?? "T2";
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
    violations: contribs.map((c) => c.violation),
    registries: registries.sort(),
    contributions: contribs,
    oblast,
    timeline: deriveTimeline(contribs, registries, r),
    attendance: registries.includes("ISUO") ? deriveAttendance(r, contribs.some((c) => c.acuity === "acute")) : null,
  };
}

/* ── похідний таймлайн із доказових реєстрів ── */
function deriveTimeline(contribs: Contribution[], registries: RegistryCode[], r: () => number): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const d = (mFrom = 0, mTo = 23) => {
    const m = mFrom + Math.floor(r() * (mTo - mFrom + 1));
    const y = 2023 + Math.floor(m / 12);
    const mm = (m % 12) + 1;
    return `${y}-${String(mm).padStart(2, "0")}-${String(5 + Math.floor(r() * 22)).padStart(2, "0")}`;
  };
  const has = (c: RegistryCode) => registries.includes(c);
  ev.push({ date: d(0, 2), registry: "DRACS", label: "Запис про народження / акт цив. стану" });
  if (has("VPO")) ev.push({ date: d(2, 10), registry: "VPO", label: "Взято на облік як внутрішньо переміщену особу" });
  if (has("EHEALTH")) ev.push({ date: d(8, 16), registry: "EHEALTH", label: "Декларацію із сімейним лікарем закрито" });
  if (has("EDEBO")) ev.push({ date: d(8, 18), registry: "EDEBO", label: "Вихід зі школи (статус: переведено/відраховано)" });
  if (has("ISUO")) ev.push({ date: d(10, 20), registry: "ISUO", label: "Різкий стрибок пропусків + падіння успішності" });
  if (has("VIOLENCE")) ev.push({ date: d(12, 22), registry: "VIOLENCE", label: "Виклик поліції за місцем проживання" });
  if (has("SSD")) ev.push({ date: d(12, 22), registry: "SSD", label: "Взято на облік ССД («складні життєві обставини»)" });
  if (has("CHILDWAR")) ev.push({ date: d(6, 18), registry: "CHILDWAR", label: 'Статус у реєстрі «Діти війни»' });
  if (has("ERDR")) ev.push({ date: d(14, 23), registry: "ERDR", label: "Внесено до ЄРДР досудове розслідування", level1: true });
  return ev.sort((a, b) => a.date.localeCompare(b.date));
}

/* ── похідна відвідуваність зі зламом (change-point) ── */
function deriveAttendance(r: () => number, acute: boolean): AttendanceSeries {
  const points = [];
  const cp = acute ? 7 + Math.floor(r() * 2) : 5 + Math.floor(r() * 3);
  for (let m = 0; m < 12; m++) {
    const after = m >= cp;
    const absences = after ? 5 + Math.floor(r() * 8) : Math.floor(r() * 3);
    const gpa = after ? +(3.2 + r() * 2.4).toFixed(1) : +(7.4 + r() * 3.8).toFixed(1);
    const y = 2023 + Math.floor((m + 8) / 12);
    const mm = ((m + 8) % 12) + 1;
    points.push({ period: `${y}-${String(mm).padStart(2, "0")}`, absences, gpa });
  }
  return { points, changePointIndex: cp };
}

/* ============================================================
   ГЕРО-КЕЙСИ — деталізовані сценарії для пітчу
   ============================================================ */
function hero(): FullCase[] {
  const cases: FullCase[] = [];

  // 1 ── Сигнатурний кейс: дитина випала у щілину між країнами
  {
    const contribs = [
      mkContribution("W1_displacement", ["VPO", "EDEBO", "EHEALTH"], "acute"),
      mkContribution("W3_out_of_education", ["EDEBO", "ISUO"], "acute"),
      mkContribution("W8_medical_access", ["EHEALTH", "VPO"], "active"),
    ].sort((a, b) => b.value - a.value);
    const registries: RegistryCode[] = ["EDDR", "DRACS", "VPO", "EDEBO", "ISUO", "EHEALTH"];
    const { mult, factors } = vulnerability(8, registries, ["W1_displacement"]);
    cases.push({
      rank: 0, entity_id: 5001, unzr: "20160312-48217",
      pib: "Ткаченко Софія Андріївна", birth_date: "2016-03-12", age: 8,
      tier: "T0", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Харківська",
      timeline: [
        { date: "2023-02-18", registry: "VPO", label: "Облік ВПО: переміщення Харківська → Львівська обл." },
        { date: "2023-05-20", registry: "EDEBO", label: "Вихід зі школи (статус: переведено), нова не зафіксована" },
        { date: "2023-06-15", registry: "ISUO", label: "Останній запис відвідуваності — далі тиша" },
        { date: "2023-09-04", registry: "EHEALTH", label: "Декларацію із сімейним лікарем закрито, нову не відкрито" },
        { date: "2023-11-12", registry: "VPO", label: "Не підтверджено повторне зарахування до школи / лікаря" },
      ],
      attendance: {
        points: [
          { period: "2022-09", absences: 1, gpa: 9.4 }, { period: "2022-10", absences: 0, gpa: 9.6 },
          { period: "2022-11", absences: 2, gpa: 9.1 }, { period: "2022-12", absences: 1, gpa: 9.3 },
          { period: "2023-01", absences: 2, gpa: 8.9 }, { period: "2023-02", absences: 6, gpa: 7.8 },
          { period: "2023-03", absences: 9, gpa: 6.2 }, { period: "2023-04", absences: 12, gpa: 5.1 },
          { period: "2023-05", absences: 16, gpa: 4.0 }, { period: "2023-06", absences: 18, gpa: 3.4 },
        ],
        changePointIndex: 5,
      },
    });
  }

  // 2 ── Торгівля людьми [immediate], Рівень-1 ЄРДР
  {
    const contribs = [
      mkContribution("W7_trafficking", ["ERDR", "SSD"], "acute"),
      mkContribution("W1_displacement", ["VPO", "CHILDWAR"], "active"),
    ].sort((a, b) => b.value - a.value);
    const registries: RegistryCode[] = ["EDDR", "VPO", "CHILDWAR", "SSD", "ERDR"];
    const { mult, factors } = vulnerability(15, registries, ["W7_trafficking", "W1_displacement"]);
    cases.push({
      rank: 0, entity_id: 5002, unzr: "20090721-77104",
      pib: "Бойко Ангеліна Сергіївна", birth_date: "2009-07-21", age: 15,
      tier: "T0", score: scoreOf(contribs, mult), immediate: true,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Одеська",
      timeline: [
        { date: "2023-03-10", registry: "VPO", label: "Облік ВПО: переміщення з Запорізької обл." },
        { date: "2024-01-22", registry: "SSD", label: "Сигнал ССД: підозра на залучення до експлуатації" },
        { date: "2024-02-05", registry: "ERDR", label: "Досудове розслідування ст.149 ККУ (торгівля людьми)", level1: true },
      ],
      attendance: null,
    });
  }

  // 3 ── Фізичне насильство вдома — класичний перетин 4 реєстрів
  {
    const contribs = [
      mkContribution("P1_physical_home", ["EHEALTH", "VIOLENCE", "ERDR", "SSD"], "acute"),
      mkContribution("W2_psych_trauma", ["EHEALTH"], "active"),
    ].sort((a, b) => b.value - a.value);
    const registries: RegistryCode[] = ["EDDR", "DRACS", "EHEALTH", "VIOLENCE", "ERDR", "SSD"];
    const { mult, factors } = vulnerability(7, registries, ["P1_physical_home"]);
    cases.push({
      rank: 0, entity_id: 5003, unzr: "20170518-30945",
      pib: "Мельник Данило Олександрович", birth_date: "2017-05-18", age: 7,
      tier: "T0", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Дніпропетровська",
      timeline: [
        { date: "2023-10-03", registry: "EHEALTH", label: "Звернення: травма (домашня обстановка)" },
        { date: "2023-11-19", registry: "VIOLENCE", label: "Виклик поліції за адресою (дитина присутня)" },
        { date: "2024-01-14", registry: "EHEALTH", label: "Повторна травма + звернення до психолога" },
        { date: "2024-02-02", registry: "ERDR", label: "Досудове розслідування ст.126-1 ККУ (домашнє насильство)", level1: true },
        { date: "2024-02-20", registry: "SSD", label: "Взято на облік ССД" },
      ],
      attendance: null,
    });
  }

  // 4 ── Депортація [immediate]
  {
    const contribs = [
      mkContribution("W5_deportation", ["CHILDWAR", "SSD"], "acute"),
    ];
    const registries: RegistryCode[] = ["EDDR", "CHILDWAR", "SSD"];
    const { mult, factors } = vulnerability(11, registries, ["W5_deportation"]);
    cases.push({
      rank: 0, entity_id: 5004, unzr: "20130208-61530",
      pib: "Гнатюк Максим Іванович", birth_date: "2013-02-08", age: 11,
      tier: "T0", score: scoreOf(contribs, mult), immediate: true,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Донецька",
      timeline: [
        { date: "2023-07-15", registry: "CHILDWAR", label: "Статус «Діти війни»: депортовано, опікун — розрив звʼязку" },
        { date: "2023-08-01", registry: "SSD", label: "Облік ССД: дитина без супроводу (unaccompanied)" },
      ],
      attendance: null,
    });
  }

  // 5 ── Сексуальне насильство [immediate], Рівень-1
  {
    const contribs = [mkContribution("F6_sexual_abuse", ["ERDR"], "acute")];
    const registries: RegistryCode[] = ["EDDR", "DRACS", "ERDR"];
    const { mult, factors } = vulnerability(13, registries, ["F6_sexual_abuse"]);
    cases.push({
      rank: 0, entity_id: 5005, unzr: "20110930-55218",
      pib: "Савченко Поліна Миколаївна", birth_date: "2011-09-30", age: 13,
      tier: "T0", score: scoreOf(contribs, mult), immediate: true,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Київська",
      timeline: [
        { date: "2024-03-08", registry: "ERDR", label: "Досудове розслідування ст.152 ККУ", level1: true },
      ],
      attendance: null,
    });
  }

  // 6 ── Сирітство / втрата опіки (T1)
  {
    const contribs = [
      mkContribution("W6_orphanhood", ["DRACS", "SSD"], "active"),
    ];
    const registries: RegistryCode[] = ["EDDR", "DRACS", "SSD", "EHEALTH"];
    const { mult, factors } = vulnerability(5, registries, ["W6_orphanhood"]);
    cases.push({
      rank: 0, entity_id: 5006, unzr: "20190415-19022",
      pib: "Кравчук Злата Андріївна", birth_date: "2019-04-15", age: 5,
      tier: "T1", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Полтавська",
      timeline: [
        { date: "2023-12-02", registry: "DRACS", label: "Акт про смерть одного з батьків" },
        { date: "2024-01-18", registry: "SSD", label: "Взято на облік: загроза втрати батьківського піклування" },
      ],
      attendance: null,
    });
  }

  // 7 ── Нехтування потребами (T1)
  {
    const contribs = [
      mkContribution("F3_neglect", ["EHEALTH", "ISUO", "SSD"], "active"),
    ];
    const registries: RegistryCode[] = ["EDDR", "EHEALTH", "ISUO", "SSD"];
    const { mult, factors } = vulnerability(9, registries, ["F3_neglect"]);
    cases.push({
      rank: 0, entity_id: 5007, unzr: null,
      pib: "Лисенко Артем Петрович", birth_date: "2015-06-25", age: 9,
      tier: "T1", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Запорізька",
      timeline: [
        { date: "2023-09-10", registry: "ISUO", label: "Систематичні пропуски без поважної причини" },
        { date: "2023-10-05", registry: "EHEALTH", label: "Пропущено плановий медичний огляд" },
        { date: "2023-11-20", registry: "SSD", label: "Облік: малозабезпечена родина" },
      ],
      attendance: deriveAttendance(rng(70007), false),
    });
  }

  // 8 ── Булінг (T1)
  {
    const contribs = [
      mkContribution("E1_bullying", ["ISUO", "EHEALTH"], "active"),
    ];
    const registries: RegistryCode[] = ["EDDR", "ISUO", "EHEALTH"];
    const { mult, factors } = vulnerability(12, registries, ["E1_bullying"]);
    cases.push({
      rank: 0, entity_id: 5008, unzr: "20120111-44760",
      pib: "Марченко Вероніка Сергіївна", birth_date: "2012-01-11", age: 12,
      tier: "T1", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Львівська",
      timeline: [
        { date: "2023-11-02", registry: "ISUO", label: "Стрибок пропусків + падіння успішності" },
        { date: "2023-12-10", registry: "EHEALTH", label: "Звернення до психолога" },
        { date: "2024-01-15", registry: "ISUO", label: "Засідання комісії з протидії булінгу" },
      ],
      attendance: deriveAttendance(rng(80008), true),
    });
  }

  // 9 ── Психотравма (T2)
  {
    const contribs = [mkContribution("W2_psych_trauma", ["EHEALTH", "CHILDWAR"], "chronic")];
    const registries: RegistryCode[] = ["EDDR", "EHEALTH", "CHILDWAR"];
    const { mult, factors } = vulnerability(10, registries, ["W2_psych_trauma"]);
    cases.push({
      rank: 0, entity_id: 5009, unzr: "20140822-28819",
      pib: "Руденко Богдан Олександрович", birth_date: "2014-08-22", age: 10,
      tier: "T2", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Чернігівська",
      timeline: [
        { date: "2023-05-14", registry: "CHILDWAR", label: "Статус «Діти війни»: переміщення" },
        { date: "2023-08-30", registry: "EHEALTH", label: "Повторні звернення до психолога" },
      ],
      attendance: null,
    });
  }

  // 10 ── Поза освітою — dropout ІСУО (T1)
  {
    const contribs = [mkContribution("W3_out_of_education", ["EDEBO", "ISUO"], "active")];
    const registries: RegistryCode[] = ["EDDR", "EDEBO", "ISUO"];
    const { mult, factors } = vulnerability(14, registries, ["W3_out_of_education"]);
    cases.push({
      rank: 0, entity_id: 5010, unzr: "20100503-90233",
      pib: "Захарченко Назар Іванович", birth_date: "2010-05-03", age: 14,
      tier: "T1", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Вінницька",
      timeline: [
        { date: "2023-10-01", registry: "ISUO", label: "Останній запис відвідуваності" },
        { date: "2023-10-20", registry: "EDEBO", label: "Відраховано без переведення до іншого закладу" },
      ],
      attendance: deriveAttendance(rng(100010), false),
    });
  }

  // 11 ── Медичний доступ + переміщення (T2)
  {
    const contribs = [
      mkContribution("W8_medical_access", ["EHEALTH", "VPO"], "active"),
      mkContribution("W1_displacement", ["VPO"], "chronic"),
    ].sort((a, b) => b.value - a.value);
    const registries: RegistryCode[] = ["EDDR", "VPO", "EHEALTH"];
    const { mult, factors } = vulnerability(4, registries, ["W1_displacement"]);
    cases.push({
      rank: 0, entity_id: 5011, unzr: "20201207-13408",
      pib: "Петренко Марія Андріївна", birth_date: "2020-12-07", age: 4,
      tier: "T2", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Запорізька",
      timeline: [
        { date: "2023-04-11", registry: "VPO", label: "Облік ВПО" },
        { date: "2023-10-22", registry: "EHEALTH", label: "Декларацію закрито; хронічний діагноз без супроводу" },
      ],
      attendance: null,
    });
  }

  // 12 ── Переміщення (T2, спостереження)
  {
    const contribs = [mkContribution("W1_displacement", ["VPO", "EDEBO"], "chronic")];
    const registries: RegistryCode[] = ["EDDR", "DRACS", "VPO", "EDEBO"];
    const { mult, factors } = vulnerability(16, registries, ["W1_displacement"]);
    cases.push({
      rank: 0, entity_id: 5012, unzr: "20081119-67001",
      pib: "Поліщук Дмитро Миколайович", birth_date: "2008-11-19", age: 16,
      tier: "T2", score: scoreOf(contribs, mult), immediate: false,
      vulnerability: mult, vuln_factors: factors,
      violations: contribs.map((c) => c.violation), registries, contributions: contribs,
      oblast: "Харківська",
      timeline: [
        { date: "2023-03-22", registry: "VPO", label: "Облік ВПО" },
        { date: "2023-09-01", registry: "EDEBO", label: "Переведення до іншого закладу освіти" },
      ],
      attendance: null,
    });
  }

  return cases;
}

/* ============================================================
   Збірка повного набору
   ============================================================ */
function build() {
  const featured = hero();
  const generated: FullCase[] = [];
  for (let i = 0; i < 235; i++) generated.push(genCase(i));

  const all = [...featured, ...generated];
  // сортування як у scoring.score_all: tier → immediate → -score
  const order: Record<Tier, number> = { T0: 0, T1: 1, T2: 2 };
  all.sort((a, b) => order[a.tier] - order[b.tier] || Number(b.immediate) - Number(a.immediate) || b.score - a.score);
  all.forEach((c, idx) => (c.rank = idx + 1));

  const items: QueueItem[] = all.map(({ oblast, timeline, attendance, ...q }) => {
    void oblast; void timeline; void attendance;
    return q;
  });

  const entities: Record<number, Entity & { oblast: string }> = {};
  const timelines: Record<number, TimelineEvent[]> = {};
  const attendance: Record<number, AttendanceSeries | null> = {};
  for (const c of all) {
    const records: Partial<Record<RegistryCode, number>> = {};
    for (const reg of c.registries) {
      // правдоподібна кількість записів на реєстр
      records[reg] = reg === "ISUO" ? 10 : reg === "EHEALTH" ? 2 + (c.entity_id % 3) : 1;
    }
    entities[c.entity_id] = {
      entity_id: c.entity_id,
      unzr: c.unzr,
      pib: c.pib,
      birth_date: c.birth_date,
      registries: c.registries,
      n_registries: c.registries.length,
      records,
      oblast: c.oblast,
    };
    timelines[c.entity_id] = c.timeline;
    attendance[c.entity_id] = c.attendance;
  }

  return { all, items, entities, timelines, attendance };
}

const DATA = build();

/* ── метрики (відповідають README: ~5000 дітей) ── */
export const MOCK_METRICS: Metrics = {
  matching: {
    true_children: 5000,
    entities: 5218,
    reconstruction_rate: 0.961,
    pure_clusters: 4894,
    fuzzy_attached: 612,
  },
  detection: {
    overall: { precision: 0.98, recall: 0.89, f1: 0.93 },
    per_violation: {
      W7_trafficking: { tp: 34, fp: 0, fn: 2, precision: 1.0, recall: 0.94 },
      F6_sexual_abuse: { tp: 31, fp: 0, fn: 3, precision: 1.0, recall: 0.91 },
      W5_deportation: { tp: 46, fp: 1, fn: 4, precision: 0.98, recall: 0.92 },
      P1_physical_home: { tp: 152, fp: 4, fn: 17, precision: 0.97, recall: 0.9 },
      W6_orphanhood: { tp: 58, fp: 1, fn: 6, precision: 0.98, recall: 0.91 },
      W8_medical_access: { tp: 121, fp: 6, fn: 19, precision: 0.95, recall: 0.86 },
      F3_neglect: { tp: 138, fp: 9, fn: 24, precision: 0.94, recall: 0.85 },
      W3_out_of_education: { tp: 174, fp: 7, fn: 21, precision: 0.96, recall: 0.89 },
      W2_psych_trauma: { tp: 96, fp: 8, fn: 22, precision: 0.92, recall: 0.81 },
      W1_displacement: { tp: 287, fp: 11, fn: 28, precision: 0.96, recall: 0.91 },
      E1_bullying: { tp: 142, fp: 12, fn: 26, precision: 0.92, recall: 0.85 },
    },
  },
  privacy: {
    n_pairs: 5218,
    precision: 1.0,
    recall: 0.95,
  },
};

/* ── публічний доступ до моків ── */
export const mockData = {
  items: DATA.items,
  full: DATA.all,
  entities: DATA.entities,
  timelines: DATA.timelines,
  attendance: DATA.attendance,
  metrics: MOCK_METRICS,
};

export function mockOblastOf(entityId: number): string {
  return DATA.entities[entityId]?.oblast ?? "—";
}
