/** Форматери (двомовні: укр за замовчуванням, англ за locale). */
import type { Locale } from "./i18n";

const MONTHS_GEN_UK = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];
const MONTHS_FULL_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT_UK = [
  "січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру",
];
const MONTHS_SHORT_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso: string | null, locale: Locale = "uk"): string {
  if (!iso || iso === "None") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return iso;
  return locale === "en"
    ? `${day} ${MONTHS_FULL_EN[month - 1]} ${year}`
    : `${day} ${MONTHS_GEN_UK[month - 1]} ${year}`;
}

/** YYYY-MM → «вер 2023» / «Sep 2023» */
export function formatPeriod(period: string, locale: Locale = "uk"): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  const arr = locale === "en" ? MONTHS_SHORT_EN : MONTHS_SHORT_UK;
  return `${arr[m - 1]} ${y}`;
}

export function formatNumber(n: number, locale: Locale = "uk"): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "uk-UA").format(n);
}

export function formatScore(n: number): string {
  return n.toFixed(2);
}

export function formatPct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/** «8 років» / «8 years» з правильним відмінком. */
export function ageLabel(age: number | null, locale: Locale = "uk"): string {
  if (age === null) return locale === "en" ? "age unknown" : "вік невідомий";
  if (locale === "en") return `${age} ${age === 1 ? "year" : "years"}`;
  const mod10 = age % 10;
  const mod100 = age % 100;
  let word = "років";
  if (mod10 === 1 && mod100 !== 11) word = "рік";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "роки";
  return `${age} ${word}`;
}

/** Українська множина: «247 сигналів» / «1 сигнал». */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** Двомовний лічильник: pluralLoc(n, {uk:[one,few,many], en:[one,many]}, locale). */
export function pluralLoc(
  n: number,
  forms: { uk: [string, string, string]; en: [string, string] },
  locale: Locale = "uk",
): string {
  if (locale === "en") return `${n} ${n === 1 ? forms.en[0] : forms.en[1]}`;
  return plural(n, forms.uk[0], forms.uk[1], forms.uk[2]);
}
