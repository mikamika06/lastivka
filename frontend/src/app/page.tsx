import Link from "next/link";
import { getMetrics } from "@/lib/api";
import { formatPct } from "@/lib/format";
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

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />

      <main className="flex-1">
        <Hero metrics={metrics} />
        <Problem />
        <MainTask />
        <HowItWorks />
        <Screens />
        <Audience />
        <CtaBand />
      </main>

      <LandingFooter />
    </div>
  );
}

/* ───────────────────────── HERO ───────────────────────── */
function Hero({ metrics }: Readonly<{ metrics: Awaited<ReturnType<typeof getMetrics>> }>) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-surface px-3 py-1.5 text-xs font-medium text-brand-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />{" "}
            Українсько-естонське партнерство · 16–18.06.2026
          </span>

          <h1 className="h-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[3.4rem]">
            Побачити дитину, яку <span className="text-brand">не бачить</span> жодна окрема система
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Ластівка збирає дитину з розрізнених окремих реєстрів —{" "}
            <span className="font-medium text-ink-2">із захистом персональних даних</span> — знаходить
            порушення там, де збігаються сигнали з кількох реєстрів, ранжує за терміновістю і віддає
            спеціалісту зрозумілу чергу на реагування з поясненням.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-fg transition hover:opacity-90"
            >
              Відкрити систему
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink-2 transition hover:bg-paper-2"
            >
              Як це працює
            </a>
          </div>

          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-4">
            <Stat value={metrics.detection.overall.f1.toFixed(2)} label="загальна якість виявлення (F1)" />
            <Stat value={formatPct(metrics.matching.reconstruction_rate)} label="дітей зібрано з окремих реєстрів" />
            <Stat value={metrics.privacy.precision.toFixed(2)} label="точність зіставлення · без розкриття імен" />
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
const PROBLEMS = [
  {
    icon: IconLayers,
    title: "Фрагментовані дані про дитину",
    text: "Інформація розпорошена між установами — цивільний стан, здоров'я, освіта, правоохоронні системи — без наскрізної координації.",
  },
  {
    icon: IconClock,
    title: "Реактивна модель захисту",
    text: "Держава втручається часто лише після того, як криза вже сталася, а права дитини вже серйозно порушені.",
  },
  {
    icon: IconPulse,
    title: "Немає раннього попередження",
    text: "Відсутня єдина цифрова система, що рано виявляє ризики й запускає адресну підтримку до того, як ситуація стане критичною.",
  },
];

function Problem() {
  return (
    <Section id="problem">
      <SectionLabel index="01" eyebrow="Проблема" title="Дитина зникає у щілині між системами" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PROBLEMS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-t0-soft text-t0">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="h-display mt-4 text-lg font-bold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ───────────────────────── ГОЛОВНЕ ЗАВДАННЯ ───────────────────────── */
const TASKS = [
  {
    icon: IconGlobe,
    title: "Міжвідомча екосистема",
    text: "Звʼязати дані з державних реєстрів у єдину цифрову траєкторію дитини — від народження до дорослішання.",
  },
  {
    icon: IconShield,
    title: "Проактивне виявлення ризиків",
    text: "Алгоритми автоматично виявляють червоні прапорці до того, як виникне критична ситуація.",
  },
  {
    icon: IconScale,
    title: "Підтримка ведення випадків",
    text: "Інструмент на основі даних: підтримка рішень, не вирок — для раннього втручання та супроводу дітей службами захисту.",
  },
];

function MainTask() {
  return (
    <Section tone="alt">
      <SectionLabel index="02" eyebrow="Головне завдання" title="Від реакції — до проактивного захисту" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {TASKS.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.title} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="h-display mt-4 text-lg font-bold">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.text}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ───────────────────────── ЯК ПРАЦЮЄ ───────────────────────── */
const STEPS = [
  {
    n: "01",
    title: "Інтеграція даних",
    text: "Збираємо життєві події та сигнали з держреєстрів (цив. стан, здоров'я, освіта) у електронний профіль дитини.",
  },
  {
    n: "02",
    title: "Виявлення ризиків",
    text: "Моніторимо червоні прапорці й критичні відхилення в траєкторії дитини до ескалації в кризу.",
  },
  {
    n: "03",
    title: "Цілеспрямоване реагування",
    text: "Надсилаємо ранжований ризик-сигнал відповідальному місцевому спеціалісту для раннього втручання.",
  },
  {
    n: "04",
    title: "Управлінська панель",
    text: "Єдина панель моніторингу стану захисту прав дитини та підтримки управлінських рішень.",
  },
];

function HowItWorks() {
  return (
    <Section id="how">
      <SectionLabel index="03" eyebrow="Як це працює" title="Чотири кроки — від сигналу до реагування" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.n} className="relative">
            <div className="card h-full p-6">
              <span className="section-index text-4xl text-brand/15">{s.n}</span>
              <h3 className="h-display mt-3 text-base font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </div>
            {i < STEPS.length - 1 && (
              <IconArrowRight className="absolute -right-4 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-line lg:block" />
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
        Дані готуються через покрокове моделювання життя дитини: прихована причина (раптовий удар по
        родині) поступово проявляється сигналами в кількох реєстрах. Система бачить лише окремі
        реєстри, а не повну картину згори — так само, як у реальному житті.
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

function Screens() {
  return (
    <Section id="screens" tone="alt">
      <SectionLabel index="04" eyebrow="Система" title="Шість екранів продукту" />
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
                  <h3 className="h-display text-lg font-bold">{n.title}</h3>
                </div>
                <p className="mt-1 text-sm text-muted">{n.desc}</p>
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
const AUDIENCE = [
  {
    icon: IconDashboard,
    role: "Керівник служби",
    text: "Бачить масштаб і структуру ризиків, спирається на дані для управлінських рішень.",
    href: "/dashboard",
    cta: "Управлінська панель",
  },
  {
    icon: IconQueue,
    role: "Соціальний працівник / спеціаліст",
    text: "Отримує зрозумілу впорядковану за терміновістю чергу: що з ким робити сьогодні й чому саме так.",
    href: "/queue",
    cta: "Черга реагування",
  },
  {
    icon: IconProfile,
    role: "Дитина та родина",
    text: "Застосунок «Ластівка»: доступ до допомоги й потрібних сервісів в одному місці — навіть в екстреній ситуації.",
    href: "/profile",
    cta: "Профіль дитини",
  },
];

function Audience() {
  return (
    <Section id="audience">
      <SectionLabel eyebrow="Для кого" title="Один продукт — три ролі" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {AUDIENCE.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.role} className="card flex flex-col p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="h-display mt-4 text-lg font-bold">{a.role}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{a.text}</p>
              <Link
                href={a.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                {a.cta}
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
function CtaBand() {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-band px-8 py-14 text-center sm:px-16">
        <div className="relative">
          <h2 className="h-display text-3xl font-bold text-white sm:text-4xl">
            Подивіться, як це працює
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
            Жива демонстрація на навчальних даних: управлінська панель, зрозуміла черга реагування з
            поясненням і профіль дитини, зібраний з кількох реєстрів.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-band transition hover:bg-white/90"
            >
              Відкрити систему
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/queue"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Перейти до черги
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
