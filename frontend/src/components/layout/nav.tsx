import type { ComponentType, SVGProps } from "react";
import type { Msg } from "@/lib/i18n";
import type { AppRole } from "@/lib/session";
import { IconDashboard, IconQueue, IconProfile, IconShield, IconScale, IconClock, IconPulse, IconLayers, IconCheck } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  pillar: string; // порядковий індекс розділу
  title: Msg;
  desc: Msg;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV: NavItem[] = [
  {
    href: "/dashboard",
    pillar: "01",
    title: { uk: "Управлінська панель", en: "Management dashboard" },
    desc: { uk: "Загальна картина для керівника", en: "Big picture for managers" },
    icon: IconDashboard,
  },
  {
    href: "/queue",
    pillar: "02",
    title: { uk: "Черга реагування", en: "Response queue" },
    desc: { uk: "Список дітей за терміновістю", en: "Children by urgency" },
    icon: IconQueue,
  },
  {
    href: "/profile",
    pillar: "03",
    title: { uk: "Профіль дитини", en: "Child profile" },
    desc: { uk: "Зібрано з різних реєстрів", en: "Assembled from registries" },
    icon: IconProfile,
  },
  {
    href: "/privacy",
    pillar: "04",
    title: { uk: "Захист даних і якість", en: "Data protection & quality" },
    desc: { uk: "Чому системі можна довіряти", en: "Why you can trust it" },
    icon: IconShield,
  },
];

/** Фаза 3 — робота служби: розподіл навантаження та кабінет фахівця. */
export const CASELOAD_NAV: NavItem[] = [
  {
    href: "/caseload",
    pillar: "05",
    title: { uk: "Навантаження служб", en: "Service caseload" },
    desc: { uk: "Скільки дітей на одного фахівця", en: "Children per specialist" },
    icon: IconScale,
  },
  {
    href: "/my-queue",
    pillar: "06",
    title: { uk: "Кабінет фахівця", en: "Specialist workspace" },
    desc: { uk: "Особиста черга та рішення", en: "Personal queue & decisions" },
    icon: IconClock,
  },
];

/** Федеративна детекція: пояснення compute-to-data (граф реєстри→докази→порушення). */
export const FEDERATED_NAV: NavItem[] = [
  {
    href: "/federated",
    pillar: "07",
    title: { uk: "Федеративна детекція", en: "Federated detection" },
    desc: { uk: "Як сигнали стають порушеннями", en: "How signals become violations" },
    icon: IconLayers,
  },
];

/** Інтейк-перші двері: звернення (лінія/школа) відкривають кейс; крос-реєстр = тріаж. */
export const INTAKE_NAV: NavItem[] = [
  {
    href: "/intake",
    pillar: "08",
    title: { uk: "Інтейк звернень", en: "Reports intake" },
    desc: { uk: "Звернення → кейс → тріаж", en: "Reports → case → triage" },
    icon: IconPulse,
  },
];

/** Сімейний граф: household/сиблінги — стан сімʼї для контексту ризику (ССД-рівень). */
export const FAMILY_NAV: NavItem[] = [
  {
    href: "/family",
    pillar: "09",
    title: { uk: "Сімейний граф", en: "Family graph" },
    desc: { uk: "Стан сімʼї та сиблінги", en: "Family state & siblings" },
    icon: IconLayers,
  },
];

/** Екрани окремих ролей (наглядові/вертикальні/батьківські). */
export const ROLE_SCREENS: NavItem[] = [
  { href: "/oversight", pillar: "10", title: { uk: "Наглядова панель", en: "Oversight" }, desc: { uk: "Зведена картина + захищені сигнали", en: "Unified view + protected signals" }, icon: IconShield },
  { href: "/inbox", pillar: "11", title: { uk: "Вхідні сигнали", en: "Inbox" }, desc: { uk: "Адресні сигнали вашої вертикалі", en: "Targeted signals for your vertical" }, icon: IconPulse },
  { href: "/child", pillar: "12", title: { uk: "Моя дитина", en: "My child" }, desc: { uk: "Статуси, нагадування, поради", en: "Statuses, reminders, advice" }, icon: IconProfile },
  { href: "/audit", pillar: "13", title: { uk: "Журнал доступу", en: "Access log" }, desc: { uk: "Хто, коли, до чого звертався", en: "Who accessed what, when" }, icon: IconCheck },
];

const ALL_NAV: NavItem[] = [
  ...NAV, ...CASELOAD_NAV, ...FEDERATED_NAV, ...INTAKE_NAV, ...FAMILY_NAV, ...ROLE_SCREENS,
];
const BY_HREF: Record<string, NavItem> = Object.fromEntries(ALL_NAV.map((n) => [n.href, n]));

/** Які екрани бачить кожна роль (docs/FINAL_ACTOR_MODEL.md §1). Чужий пункт не потрапляє в DOM. */
export const ROLE_NAV: Record<AppRole, string[]> = {
  // ССД — фронт-лайн: кейси/профілі своєї громади (з ПІБ).
  ssd: ["/queue", "/profile", "/federated"],
  // Поліція — той самий пошук/профіль, що ССД, але вищий допуск (бачить ЄРДР, національний скоуп).
  police: ["/queue", "/profile", "/federated"],
  // Регіональний керівник — статистика, якість, агрегати області (без PII).
  regional: ["/dashboard", "/caseload", "/intake", "/privacy", "/federated"],
  supervisor: ["/dashboard", "/caseload", "/intake", "/privacy", "/federated"],
  vertical: ["/inbox"],
  parent: ["/child"],
};

export function navForRole(role: AppRole | undefined): NavItem[] {
  const hrefs = ROLE_NAV[role ?? "ssd"] ?? ROLE_NAV.ssd;
  return hrefs.map((h) => BY_HREF[h]).filter(Boolean);
}
