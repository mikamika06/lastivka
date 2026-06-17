import Link from "next/link";
import { getT } from "@/lib/i18n.server";
import type { Msg } from "@/lib/i18n";
import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import {
  IconArrowRight,
  IconLayers,
  IconShield,
  IconScale,
  IconGlobe,
  IconDashboard,
  IconQueue,
  IconPulse,
  IconClock,
} from "@/components/ui/icons";

export const metadata = { title: "About the solution — Lastivka" };

type T = (m: Msg) => string;

export default async function AboutPage() {
  const t = await getT();
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <Intro t={t} />
        <Problem t={t} />
        <WhatItDoes t={t} />
        <Pillars t={t} />
        <Roles t={t} />
        <Privacy t={t} />
        <CrossBorder t={t} />
        <RisksLater t={t} />
        <Cta t={t} />
      </main>
      <LandingFooter />
    </div>
  );
}

/* ───────────────────────── INTRO ───────────────────────── */
function Intro({ t }: Readonly<{ t: T }>) {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          {t({ uk: "Про рішення", en: "About the solution" })}
        </span>
        <h1 className="h-display mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          {t({
            uk: "Ластівка — крос-реєстровий захист прав дитини",
            en: "Lastivka — cross-registry child-rights protection",
          })}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          {t({
            uk: "Ластівка зводить розрізнені державні реєстри в єдину захищену картину дитини, виявляє, де права дитини реально під загрозою, і віддає спеціалісту зрозумілу чергу реагування з поясненням — із суворим захистом персональних даних.",
            en: "Lastivka brings scattered state registries together into a single protected picture of a child, surfaces where a child's rights are genuinely at risk, and hands the specialist a clear, explained response queue — all with strict personal-data protection.",
          })}
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── PROBLEM ───────────────────────── */
function Problem({ t }: Readonly<{ t: T }>) {
  return (
    <Block index="01" eyebrow={t({ uk: "Проблема", en: "The problem" })} title={t({ uk: "Дитину видно лише на перетині реєстрів", en: "A child is only visible at the intersection of registries" })}>
      <p>
        {t({
          uk: "Жоден окремий реєстр не доводить, що дитина страждає. Сигнали розпорошені: цивільний стан у ДРАЦС, переміщення у реєстрі ВПО, освіта в ЄДЕБО/АІКОМ, здоровʼя в eHealth, правопорушення в ЄРДР. Поки ніхто не зводить їх докупи, дитина «зникає у щілині» між відомствами — і держава реагує вже після кризи.",
          en: "No single registry proves that a child is suffering. Signals are scattered: civil status in DRACS, displacement in the IDP registry, education in EDDR/AIKOM, health in eHealth, offences in ERDR. Until someone brings them together, the child “slips through the cracks” between agencies — and the state reacts only after the crisis.",
        })}
      </p>
    </Block>
  );
}

/* ───────────────────────── WHAT IT DOES ───────────────────────── */
function WhatItDoes({ t }: Readonly<{ t: T }>) {
  return (
    <Block tone="alt" index="02" eyebrow={t({ uk: "Що робить система", en: "What the system does" })} title={t({ uk: "Підтримка рішень, а не вирок", en: "Decision support, not a verdict" })}>
      <p>
        {t({
          uk: "Ластівка не ухвалює рішень за людину і не «прогнозує злочинність». Вона звіряє сигнали з кількох реєстрів, ранжує випадки за терміновістю та пояснює кожне рішення. Останнє слово завжди за відповідальним спеціалістом — людина в контурі (human-in-the-loop).",
          en: "Lastivka does not decide for people and does not “predict crime”. It cross-checks signals from several registries, ranks cases by urgency, and explains every decision. The final call always rests with the responsible specialist — a human in the loop.",
        })}
      </p>
    </Block>
  );
}

/* ───────────────────────── 4 PILLARS ───────────────────────── */
const PILLARS: { icon: typeof IconLayers; title: Msg; text: Msg }[] = [
  {
    icon: IconLayers,
    title: { uk: "1. Інтеграційний шар", en: "1. Integration layer" },
    text: {
      uk: "Підключення до державних реєстрів через Trembita (державна шина обміну даними / X-Road). Це канал доступу, а не право на масове профілювання.",
      en: "Connection to state registries via Trembita (the state data-exchange bus / X-Road). This is an access channel, not a right to mass profiling.",
    },
  },
  {
    icon: IconPulse,
    title: { uk: "2. Сховище індикаторів", en: "2. Indicator store" },
    text: {
      uk: "Зберігаються прапорці та посилання на джерела, а не масові копії персональних даних — мінімізація за призначенням.",
      en: "Flags and links to sources are stored — not mass copies of personal data — data minimisation by design.",
    },
  },
  {
    icon: IconScale,
    title: { uk: "3. Прозорі правила", en: "3. Transparent rules engine" },
    text: {
      uk: "Зрозуміла черга за терміновістю без «чорної скриньки»: кожен пріоритет можна простежити до сигналів, що його сформували.",
      en: "A clear priority queue with no black box: every priority can be traced back to the signals that produced it.",
    },
  },
  {
    icon: IconShield,
    title: { uk: "4. Кабінет фахівця", en: "4. Specialist cabinet" },
    text: {
      uk: "Рольовий доступ і журнал аудиту кожного перегляду. Хто, що й коли бачив — фіксується.",
      en: "Role-based access and an audit log of every view. Who saw what and when is recorded.",
    },
  },
];

function Pillars({ t }: Readonly<{ t: T }>) {
  return (
    <Block index="03" eyebrow={t({ uk: "Архітектура", en: "Architecture" })} title={t({ uk: "Чотири стовпи продукту", en: "Four product pillars" })}>
      <div className="mt-2 grid gap-5 sm:grid-cols-2">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title.en} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="h-display mt-4 text-lg font-bold">{t(p.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(p.text)}</p>
            </div>
          );
        })}
      </div>
    </Block>
  );
}

/* ───────────────────────── ROLES & ACCESS LEVELS ───────────────────────── */
const ROLES: { icon: typeof IconQueue; role: Msg; scope: Msg; sees: Msg }[] = [
  {
    icon: IconQueue,
    role: { uk: "Фахівець ССД (громада)", en: "Community worker (Child Services, SSD)" },
    scope: { uk: "Лише власна громада (hromada)", en: "Own hromada only" },
    sees: {
      uk: "Бачить ПІБ, адреси, телефони, кейси, строки та візити — але виключно своєї громади. Працівник однієї громади не бачить кейси іншої. Це оператор: черга, профіль, навантаження.",
      en: "Sees full names, addresses, phones, cases, deadlines and visits — but only for their own hromada. A worker in one hromada cannot see another hromada's cases. This is the operator role: queue, profile, caseload.",
    },
  },
  {
    icon: IconDashboard,
    role: { uk: "Регіональний контролер / аналітик", en: "Regional manager / analyst" },
    scope: { uk: "Область (oblast), знеособлено", en: "Oblast level, de-identified" },
    sees: {
      uk: "Бачить агрегати, статистику, кількості, повноту даних і стратегічне планування по всій території — БЕЗ персональних даних (без ПІБ та адрес).",
      en: "Sees aggregates, statistics, counts, data completeness and strategic planning across the whole territory — WITHOUT personal data (no names, no addresses).",
    },
  },
];

function Roles({ t }: Readonly<{ t: T }>) {
  return (
    <Block tone="alt" index="04" eyebrow={t({ uk: "Ролі та доступ", en: "Roles & access" })} title={t({ uk: "Дві ролі, два рівні доступу", en: "Two roles, two access levels" })}>
      <div className="mt-2 grid gap-5 md:grid-cols-2">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.role.en} className="card flex flex-col p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="h-display mt-4 text-lg font-bold">{t(r.role)}</h3>
              <span className="mt-1 inline-flex w-fit rounded-full bg-paper-2 px-2.5 py-1 text-[11px] font-semibold text-muted">
                {t(r.scope)}
              </span>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{t(r.sees)}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        {t({
          uk: "Принцип: персональні дані бачить лише той, хто веде конкретну дитину у своїй громаді. Аналітика по території — завжди знеособлена.",
          en: "Principle: personal data is visible only to the worker handling a specific child in their hromada. Territory-wide analytics are always de-identified.",
        })}
      </p>
    </Block>
  );
}

/* ───────────────────────── PRIVACY ───────────────────────── */
const TIERS: { tier: string; title: Msg; text: Msg }[] = [
  {
    tier: "1",
    title: { uk: "Рівень 1 — лише сигнал «є / немає»", en: "Level 1 — yes/no signal only" },
    text: {
      uk: "Найчутливіші дані (медицина в eHealth, кримінальні провадження в ЄРДР). Система бачить тільки булеан «є / немає» — без доступу до вмісту. Повний доступ — лише за рішенням суду чи в межах лікарської таємниці.",
      en: "The most sensitive data (health in eHealth, criminal proceedings in ERDR). The system sees only a yes/no boolean — with no access to the content. Full access requires a court order or medical confidentiality.",
    },
  },
  {
    tier: "2",
    title: { uk: "Рівень 2 — за призначенням", en: "Level 2 — purpose-bound" },
    text: {
      uk: "Більшість реєстрів (ДРАЦС, ЄДДР, ЄДЕБО, ВПО, ССД). Доступ за конкретним призначенням і з аудитом кожного перегляду.",
      en: "Most registries (DRACS, EDDR, EDDR, IDP, Child Services). Access is purpose-bound and every view is audited.",
    },
  },
  {
    tier: "3",
    title: { uk: "Рівень 3 — публічно/судово", en: "Level 3 — public / judicial" },
    text: {
      uk: "Наприклад, ЄДРСР — судові рішення. Найвищий рівень формальної відкритості серед джерел системи.",
      en: "For example, EDRSR — court rulings. The highest level of formal openness among the system's sources.",
    },
  },
];

function Privacy({ t }: Readonly<{ t: T }>) {
  return (
    <Block index="05" eyebrow={t({ uk: "Приватність", en: "Privacy" })} title={t({ uk: "Три рівні доступу до даних + приватне зіставлення", en: "Three data-access levels + private matching" })}>
      <div className="mt-2 grid gap-5 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div key={tier.tier} className="card p-6">
            <span className="section-index text-4xl text-brand/15">{tier.tier}</span>
            <h3 className="h-display mt-2 text-base font-bold">{t(tier.title)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t(tier.text)}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        {t({
          uk: "Зіставлення (matching) — privacy-preserving: реєстри порівнюють не імена, а зашифровані цифрові відбитки (PSI — private set intersection / PPRL). Система розуміє, що це та сама дитина, не бачачи ні імен, ні номерів, і ніколи не зливає персональні дані в одну спільну базу. Бідність ≠ ризик: соціально-економічні фактори самі по собі не є тригером (узгоджено з EU AI Act).",
          en: "Matching is privacy-preserving: registries compare encrypted digital fingerprints, not names (PSI — private set intersection / PPRL). The system knows it is the same child without seeing names or numbers, and never merges personal data into one shared database. Poverty ≠ risk: socio-economic factors alone are never a trigger (aligned with the EU AI Act).",
        })}
      </p>
    </Block>
  );
}

/* ───────────────────────── CROSS-BORDER ───────────────────────── */
function CrossBorder({ t }: Readonly<{ t: T }>) {
  return (
    <Block tone="alt" index="06" eyebrow={t({ uk: "Крос-кордон", en: "Cross-border" })} title={t({ uk: "Україна ↔ Естонія, без спільного ключа", en: "Ukraine ↔ Estonia, with no shared key" })}>
      <p className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <IconGlobe className="h-5 w-5" />
        </span>
        <span>
          {t({
            uk: "Дитина, що перетнула кордон, випадає з української системи раніше, ніж потрапляє в естонську. Спільного ідентифікатора немає (УНЗР ≠ isikukood), тож звʼязок privacy-preserving: кордон перетинає лише зашифрований відбиток (PPRL), а не персональні дані. Рішення ухвалює фахівець у відповідній юрисдикції.",
            en: "A child who crosses the border drops out of the Ukrainian system before entering the Estonian one. There is no shared identifier (UNZR ≠ isikukood), so the linkage is privacy-preserving: only an encrypted fingerprint (PPRL) crosses the border, not personal data. The specialist in the relevant jurisdiction makes the call.",
          })}
        </span>
      </p>
    </Block>
  );
}

/* ───────────────────────── RISKS LATER ───────────────────────── */
function RisksLater({ t }: Readonly<{ t: T }>) {
  return (
    <Block index="07" eyebrow={t({ uk: "Дорожня карта", en: "Roadmap" })} title={t({ uk: "Скоринг ризиків — наступна фаза", en: "Risk scoring — the next phase" })}>
      <p className="flex items-start gap-3 rounded-xl border border-t1-line bg-t1-soft px-4 py-3 text-sm text-t1-ink">
        <IconClock className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          {t({
            uk: "Цей реліз навмисно не реалізує автоматичний скоринг ризиків. Інтерфейс залишає чистий «шов» (типи й місця в UI), куди підключатимуться ризик-сигнали на наступній фазі — без жодних обчислень зараз.",
            en: "This release deliberately does not implement automatic risk scoring. The interface leaves a clean seam (types and UI placeholders) where risk signals will plug in during the next phase — with no computation happening now.",
          })}
        </span>
      </p>
    </Block>
  );
}

/* ───────────────────────── CTA ───────────────────────── */
function Cta({ t }: Readonly<{ t: T }>) {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-3xl bg-band px-8 py-12 text-center sm:px-16">
        <h2 className="h-display text-2xl font-bold text-white sm:text-3xl">
          {t({ uk: "Подивіться, як це працює", en: "See how it works" })}
        </h2>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-band transition hover:bg-white/90"
          >
            {t({ uk: "Відкрити систему", en: "Open the system" })}
            <IconArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t({ uk: "На головну", en: "Back to home" })}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── helpers ───────────────────────── */
function Block({
  children,
  index,
  eyebrow,
  title,
  tone = "base",
}: Readonly<{
  children: React.ReactNode;
  index?: string;
  eyebrow: string;
  title: string;
  tone?: "base" | "alt";
}>) {
  return (
    <section className={`px-4 py-14 sm:px-6 ${tone === "alt" ? "bg-surface" : ""}`}>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start gap-4">
          {index && (
            <span className="section-index select-none text-5xl text-brand/15" aria-hidden="true">
              {index}
            </span>
          )}
          <div className="pt-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</span>
            <h2 className="h-display mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>
          </div>
        </div>
        <div className="mt-6 text-base leading-relaxed text-muted">{children}</div>
      </div>
    </section>
  );
}
