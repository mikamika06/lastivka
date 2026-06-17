import type { ComponentType, SVGProps } from "react";
import type { Msg } from "@/lib/i18n";
import { IconDashboard, IconQueue, IconProfile, IconShield, IconScale, IconClock } from "@/components/ui/icons";

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
