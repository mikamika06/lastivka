import type { ComponentType, SVGProps } from "react";
import { IconDashboard, IconQueue, IconProfile, IconShield, IconScale, IconClock, IconGlobe } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  pillar: string; // індекс стовпа продукту (зі слайда)
  title: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV: NavItem[] = [
  {
    href: "/dashboard",
    pillar: "04",
    title: "Управлінська панель",
    desc: "Огляд і підтримка рішень",
    icon: IconDashboard,
  },
  {
    href: "/queue",
    pillar: "03",
    title: "Черга реагування",
    desc: "Ранжовані кейси",
    icon: IconQueue,
  },
  {
    href: "/profile",
    pillar: "01",
    title: "Профіль дитини",
    desc: "Інтеграція даних",
    icon: IconProfile,
  },
  {
    href: "/privacy",
    pillar: "02",
    title: "Приватність і якість",
    desc: "Довіра до моделі",
    icon: IconShield,
  },
];

/** Фаза 3 — кейсворкінг: розподіл навантаження та персональна черга. */
export const CASELOAD_NAV: NavItem[] = [
  {
    href: "/caseload",
    pillar: "05",
    title: "Навантаження",
    desc: "Розподіл по службах",
    icon: IconScale,
  },
  {
    href: "/my-queue",
    pillar: "06",
    title: "Моя черга",
    desc: "Кейси наглядача",
    icon: IconClock,
  },
];

/** Крос-кордон Україна ↔ Естонія: privacy-preserving звʼязок реєстрів і нові ризики. */
export const CROSSBORDER_NAV: NavItem[] = [
  {
    href: "/cross-border",
    pillar: "07",
    title: "Крос-кордон UA↔EE",
    desc: "Естонія: звʼязок і ризики",
    icon: IconGlobe,
  },
];
