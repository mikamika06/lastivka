/** Форматери для української локалі. */

const MONTHS_GEN = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];

const MONTHS_SHORT = [
  "січ", "лют", "бер", "кві", "тра", "чер",
  "лип", "сер", "вер", "жов", "лис", "гру",
];

export function formatDate(iso: string | null): string {
  if (!iso || iso === "None") return "—";
  // Парсимо YYYY-MM-DD вручну — без new Date(), щоб уникнути зсуву через
  // часовий пояс (UTC-парсинг + локальні getters) і hydration mismatch.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return iso;
  return `${day} ${MONTHS_GEN[month - 1]} ${year}`;
}

/** YYYY-MM → «вер 2023» */
export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("uk-UA").format(n);
}

export function formatScore(n: number): string {
  return n.toFixed(2);
}

export function formatPct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/** «8 років» з правильним відмінком. */
export function ageLabel(age: number | null): string {
  if (age === null) return "вік невідомий";
  const mod10 = age % 10;
  const mod100 = age % 100;
  let word = "років";
  if (mod10 === 1 && mod100 !== 11) word = "рік";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "роки";
  return `${age} ${word}`;
}

/** «247 сигналів» / «1 сигнал» */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}
