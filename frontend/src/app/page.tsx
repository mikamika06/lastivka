import Link from "next/link";
import { getMetrics } from "@/lib/api";
import { formatPct } from "@/lib/format";
import { getT } from "@/lib/i18n.server";
import type { Msg } from "@/lib/i18n";
import { NAV, CASELOAD_NAV } from "@/components/layout/nav";
import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { HeroPreview } from "@/components/landing/HeroPreview";
import {
  IconArrowRight,
  IconLayers,
  IconClock,
  IconPulse,
  IconGlobe,
  IconShield,
  IconScale,
  IconDashboard,
  IconQueue,
  IconProfile,
} from "@/components/ui/icons";

export default async function LandingPage() {
  const metrics = await getMetrics();
  const t = await getT();

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />

      <main className="flex-1">
        <Hero metrics={metrics} t={t} />
        <Problem t={t} />
        <MainTask t={t} />
        <HowItWorks t={t} />
        <Screens t={t} />
        <Audience t={t} />
        <CtaBand t={t} />
      </main>

      <LandingFooter />
    </div>
  );
}

type T = (m: Msg) => string;

/* ───────────────────────── HERO ───────────────────────── */
function Hero({ metrics, t }: Readonly<{ metrics: Awaited<ReturnType<typeof getMetrics>>; t: T }>) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-surface px-3 py-1.5 text-xs font-medium text-brand-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />{" "}
            {t({ uk: "Українсько-естонське партнерство · 16–18.06.2026", en: "Ukrainian-Estonian partnership · 16–18.06.2026" })}
          </span>

          <h1 className="h-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[3.4rem]">
            {t({ uk: "Побачити дитину, яку ", en: "See the child that " })}
            <span className="text-brand">{t({ uk: "не бачить", en: "no single" })}</span>
            {t({ uk: " жодна окрема система", en: " system can see" })}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            {t({ uk: "Ластівка збирає дитину з розрізнених окремих реєстрів — ", en: "Lastivka assembles a child from disconnected registries — " })}
            <span className="font-medium text-ink-2">{t({ uk: "із захистом персональних даних", en: "with personal-data protection" })}</span>
            {t({
              uk: " — знаходить порушення там, де збігаються сигнали з кількох реєстрів, ранжує за терміновістю і віддає спеціалісту зрозумілу чергу на реагування з поясненням.",
              en: " — detects violations where signals from several registries align, ranks them by urgency, and hands the specialist a clear response queue with an explanation.",
            })}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-fg transition hover:opacity-90"
            >
              {t({ uk: "Відкрити систему", en: "Open the system" })}
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink-2 transition hover:bg-paper-2"
            >
              {t({ uk: "Як це працює", en: "How it works" })}
            </a>
          </div>

          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-4">
            <Stat value={metrics.detection.overall.f1.toFixed(2)} label={t({ uk: "загальна якість виявлення (F1)", en: "overall detection quality (F1)" })} />
            <Stat value={formatPct(metrics.matching.reconstruction_rate)} label={t({ uk: "дітей зібрано з окремих реєстрів", en: "children assembled from registries" })} />
            <Stat value={metrics.privacy.precision.toFixed(2)} label={t({ uk: "точність зіставлення · без розкриття імен", en: "matching precision · names never exposed" })} />
          </dl>
        </div>

        <div className="lg:pl-6">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <div>
      <dd className="font-display text-3xl font-bold tnum text-ink">{value}</dd>
      <dt className="mt-0.5 max-w-[12rem] text-xs text-muted">{label}</dt>
    </div>
  );
}

/* ───────────────────────── ПРОБЛЕМА ───────────────────────── */
const PROBLEMS: { icon: typeof IconLayers; title: Msg; text: Msg }[] = [
  {
    icon: IconLayers,
    title: { uk: "Фрагментовані дані про дитину", en: "Fragmented data about the child" },
    text: {
      uk: "Інформація розпорошена між установами — цивільний стан, здоров'я, освіта, правоохоронні системи — без наскрізної координації.",
      en: "Information is scattered across agencies — civil status, health, education, law enforcement — with no end-to-end coordination.",
    },
  },
  {
    icon: IconClock,
    title: { uk: "Реактивна модель захисту", en: "A reactive protection model" },
    text: {
      uk: "Держава втручається часто лише після того, як криза вже сталася, а права дитини вже серйозно порушені.",
      en: "The state often steps in only after the crisis has already happened and the child's rights are already seriously violated.",
    },
  },
  {
    icon: IconPulse,
    title: { uk: "Немає раннього попередження", en: "No early warning" },
    text: {
      uk: "Відсутня єдина цифрова система, що рано виявляє ризики й запускає адресну підтримку до того, як ситуація стане критичною.",
      en: "There is no single digital system that detects risks early and triggers targeted support before the situation turns critical.",
    },
  },
];

function Problem({ t }: Readonly<{ t: T }>) {
  return (
    <Section id="problem">
      <SectionLabel index="01" eyebrow={t({ uk: "Проблема", en: "The problem" })} title={t({ uk: "Дитина зникає у щілині між системами", en: "A child slips through the cracks between systems" })} />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PROBLEMS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title.uk} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-t0-soft text-t0">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="h-display mt-4 text-lg font-bold">{t(p.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(p.text)}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ───────────────────────── ГОЛОВНЕ ЗАВДАННЯ ───────────────────────── */
const TASKS: { icon: typeof IconGlobe; title: Msg; text: Msg }[] = [
  {
    icon: IconGlobe,
    title: { uk: "Міжвідомча екосистема", en: "An inter-agency ecosystem" },
    text: {
      uk: "Звʼязати дані з державних реєстрів у єдину цифрову траєкторію дитини — від народження до дорослішання.",
      en: "Link data from state registries into a single digital trajectory for the child — from birth to adulthood.",
    },
  },
  {
    icon: IconShield,
    title: { uk: "Проактивне виявлення ризиків", en: "Proactive risk detection" },
    text: {
      uk: "Алгоритми автоматично виявляють червоні прапорці до того, як виникне критична ситуація.",
      en: "Algorithms automatically flag red flags before a critical situation arises.",
    },
  },
  {
    icon: IconScale,
    title: { uk: "Підтримка ведення випадків", en: "Case-management support" },
    text: {
      uk: "Інструмент на основі даних: підтримка рішень, не вирок — для раннього втручання та супроводу дітей службами захисту.",
      en: "A data-driven tool: decision support, not a verdict — for early intervention and support of children by protection services.",
    },
  },
];

function MainTask({ t }: Readonly<{ t: T }>) {
  return (
    <Section tone="alt">
      <SectionLabel index="02" eyebrow={t({ uk: "Головне завдання", en: "The core mission" })} title={t({ uk: "Від реакції — до проактивного захисту", en: "From reaction to proactive protection" })} />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {TASKS.map((task) => {
          const Icon = task.icon;
          return (
            <div key={task.title.uk} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="h-display mt-4 text-lg font-bold">{t(task.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(task.text)}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ───────────────────────── ЯК ПРАЦЮЄ ───────────────────────── */
const STEPS: { n: string; title: Msg; text: Msg }[] = [
  {
    n: "01",
    title: { uk: "Інтеграція даних", en: "Data integration" },
    text: {
      uk: "Збираємо життєві події та сигнали з держреєстрів (цив. стан, здоров'я, освіта) у електронний профіль дитини.",
      en: "We gather life events and signals from state registries (civil status, health, education) into a digital child profile.",
    },
  },
  {
    n: "02",
    title: { uk: "Виявлення ризиків", en: "Risk detection" },
    text: {
      uk: "Моніторимо червоні прапорці й критичні відхилення в траєкторії дитини до ескалації в кризу.",
      en: "We monitor red flags and critical deviations in the child's trajectory before they escalate into a crisis.",
    },
  },
  {
    n: "03",
    title: { uk: "Цілеспрямоване реагування", en: "Targeted response" },
    text: {
      uk: "Надсилаємо ранжований ризик-сигнал відповідальному місцевому спеціалісту для раннього втручання.",
      en: "We send a ranked risk signal to the responsible local specialist for early intervention.",
    },
  },
  {
    n: "04",
    title: { uk: "Управлінська панель", en: "Management dashboard" },
    text: {
      uk: "Єдина панель моніторингу стану захисту прав дитини та підтримки управлінських рішень.",
      en: "A single dashboard to monitor the state of child-rights protection and support management decisions.",
    },
  },
];

function HowItWorks({ t }: Readonly<{ t: T }>) {
  return (
    <Section id="how">
      <SectionLabel index="03" eyebrow={t({ uk: "Як це працює", en: "How it works" })} title={t({ uk: "Чотири кроки — від сигналу до реагування", en: "Four steps — from signal to response" })} />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.n} className="relative">
            <div className="card h-full p-6">
              <span className="section-index text-4xl text-brand/15">{s.n}</span>
              <h3 className="h-display mt-3 text-base font-bold">{t(s.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(s.text)}</p>
            </div>
            {i < STEPS.length - 1 && (
              <IconArrowRight className="absolute -right-4 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-line lg:block" />
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        {t({
          uk: "Дані готуються через покрокове моделювання життя дитини: прихована причина (раптовий удар по родині) поступово проявляється сигналами в кількох реєстрах. Система бачить лише окремі реєстри, а не повну картину згори — так само, як у реальному житті.",
          en: "The data is prepared through step-by-step simulation of a child's life: a hidden cause (a sudden blow to the family) gradually surfaces as signals across several registries. The system sees only the separate registries, not the full picture from above — just as in real life.",
        })}
      </p>
    </Section>
  );
}

/* ───────────────────────── ЕКРАНИ ───────────────────────── */
const SCREEN_ICONS = {
  "/dashboard": IconDashboard,
  "/queue": IconQueue,
  "/profile": IconProfile,
  "/privacy": IconShield,
  "/caseload": IconScale,
  "/my-queue": IconClock,
} as const;

function Screens({ t }: Readonly<{ t: T }>) {
  return (
    <Section id="screens" tone="alt">
      <SectionLabel index="04" eyebrow={t({ uk: "Система", en: "The system" })} title={t({ uk: "Шість екранів продукту", en: "Six product screens" })} />
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {[...NAV, ...CASELOAD_NAV].map((n) => {
          const Icon = SCREEN_ICONS[n.href as keyof typeof SCREEN_ICONS] ?? IconDashboard;
          return (
            <Link
              key={n.href}
              href={n.href}
              className="card group flex items-start gap-4 p-6 transition hover:-translate-y-0.5 hover:border-brand-line"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line bg-surface text-brand transition group-hover:border-brand-line group-hover:bg-brand-soft">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="section-index text-sm text-brand/40">{n.pillar}</span>
                  <h3 className="h-display text-lg font-bold">{t(n.title)}</h3>
                </div>
                <p className="mt-1 text-sm text-muted">{t(n.desc)}</p>
              </div>
              <IconArrowRight className="h-5 w-5 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

/* ───────────────────────── ДЛЯ КОГО ───────────────────────── */
const AUDIENCE: { icon: typeof IconDashboard; role: Msg; text: Msg; href: string; cta: Msg }[] = [
  {
    icon: IconDashboard,
    role: { uk: "Керівник служби", en: "Service manager" },
    text: {
      uk: "Бачить масштаб і структуру ризиків, спирається на дані для управлінських рішень.",
      en: "Sees the scale and structure of risks and relies on data for management decisions.",
    },
    href: "/dashboard",
    cta: { uk: "Управлінська панель", en: "Management dashboard" },
  },
  {
    icon: IconQueue,
    role: { uk: "Соціальний працівник / спеціаліст", en: "Social worker / specialist" },
    text: {
      uk: "Отримує зрозумілу впорядковану за терміновістю чергу: що з ким робити сьогодні й чому саме так.",
      en: "Gets a clear queue ordered by urgency: what to do, with whom, today — and why exactly so.",
    },
    href: "/queue",
    cta: { uk: "Черга реагування", en: "Response queue" },
  },
  {
    icon: IconProfile,
    role: { uk: "Дитина та родина", en: "Child and family" },
    text: {
      uk: "Застосунок «Ластівка»: доступ до допомоги й потрібних сервісів в одному місці — навіть в екстреній ситуації.",
      en: "The Lastivka app: access to help and the services you need in one place — even in an emergency.",
    },
    href: "/profile",
    cta: { uk: "Профіль дитини", en: "Child profile" },
  },
];

function Audience({ t }: Readonly<{ t: T }>) {
  return (
    <Section id="audience">
      <SectionLabel eyebrow={t({ uk: "Для кого", en: "Who it is for" })} title={t({ uk: "Один продукт — три ролі", en: "One product — three roles" })} />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {AUDIENCE.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.role.uk} className="card flex flex-col p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="h-display mt-4 text-lg font-bold">{t(a.role)}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{t(a.text)}</p>
              <Link
                href={a.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                {t(a.cta)}
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ───────────────────────── CTA ───────────────────────── */
function CtaBand({ t }: Readonly<{ t: T }>) {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-band px-8 py-14 text-center sm:px-16">
        <div className="relative">
          <h2 className="h-display text-3xl font-bold text-white sm:text-4xl">
            {t({ uk: "Подивіться, як це працює", en: "See how it works" })}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
            {t({
              uk: "Жива демонстрація на навчальних даних: управлінська панель, зрозуміла черга реагування з поясненням і профіль дитини, зібраний з кількох реєстрів.",
              en: "A live demo on training data: the management dashboard, a clear response queue with explanations, and a child profile assembled from several registries.",
            })}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-band transition hover:bg-white/90"
            >
              {t({ uk: "Відкрити систему", en: "Open the system" })}
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/queue"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t({ uk: "Перейти до черги", en: "Go to the queue" })}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── helpers ───────────────────────── */
function Section({
  children,
  id,
  tone = "base",
}: Readonly<{
  children: React.ReactNode;
  id?: string;
  tone?: "base" | "alt";
}>) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20 ${tone === "alt" ? "bg-surface" : ""}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function SectionLabel({
  index,
  eyebrow,
  title,
}: Readonly<{
  index?: string;
  eyebrow: string;
  title: string;
}>) {
  return (
    <div className="flex items-start gap-4">
      {index && (
        <span className="section-index select-none text-5xl text-brand/15 sm:text-6xl" aria-hidden="true">
          {index}
        </span>
      )}
      <div className="pt-1">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</span>
        <h2 className="h-display mt-1 max-w-2xl text-2xl font-bold sm:text-3xl">{title}</h2>
      </div>
    </div>
  );
}
