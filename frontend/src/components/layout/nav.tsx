import type { ComponentType, SVGProps } from "react";
import { IconDashboard, IconQueue, IconProfile, IconShield } from "@/components/ui/icons";

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
