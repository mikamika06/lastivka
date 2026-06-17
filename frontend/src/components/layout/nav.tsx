import type { ComponentType, SVGProps } from "react";
import { IconDashboard, IconQueue, IconProfile, IconShield, IconScale, IconClock } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  pillar: string; // порядковий індекс розділу
  title: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV: NavItem[] = [
  {
    href: "/dashboard",
    pillar: "01",
    title: "Управлінська панель",
    desc: "Загальна картина для керівника",
    icon: IconDashboard,
  },
  {
    href: "/queue",
    pillar: "02",
    title: "Черга реагування",
    desc: "Список дітей за терміновістю",
    icon: IconQueue,
  },
  {
    href: "/profile",
    pillar: "03",
    title: "Профіль дитини",
    desc: "Зібрано з різних реєстрів",
    icon: IconProfile,
  },
  {
    href: "/privacy",
    pillar: "04",
    title: "Захист даних і якість",
    desc: "Чому системі можна довіряти",
    icon: IconShield,
  },
];

/** Фаза 3 — робота служби: розподіл навантаження та кабінет фахівця. */
export const CASELOAD_NAV: NavItem[] = [
  {
    href: "/caseload",
    pillar: "05",
    title: "Навантаження служб",
    desc: "Скільки дітей на одного фахівця",
    icon: IconScale,
  },
  {
    href: "/my-queue",
    pillar: "06",
    title: "Кабінет фахівця",
    desc: "Особиста черга та рішення",
    icon: IconClock,
  },
];
