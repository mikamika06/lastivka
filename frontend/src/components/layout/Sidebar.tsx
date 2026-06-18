"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { navForRole, type NavItem } from "./nav";
import type { AppRole } from "@/lib/session";
import { useTx } from "@/components/providers/I18nProvider";
import { IconArrowRight } from "@/components/ui/icons";

export function SidebarContent({ onNavigate, role }: Readonly<{ onNavigate?: () => void; role?: AppRole }>) {
  const pathname = usePathname();
  const t = useTx();

  const renderItem = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
          active ? "bg-brand-soft" : "hover:bg-paper-2"
        }`}
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition ${
            active
              ? "border-brand-line bg-surface text-brand"
              : "border-line bg-surface text-muted group-hover:text-ink-2"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-semibold ${active ? "text-brand-ink" : "text-ink"}`}>
            {t(item.title)}
          </span>
          <span className="block truncate text-xs text-faint">{t(item.desc)}</span>
        </span>
        <span
          className={`section-index text-base ${active ? "text-brand/40" : "text-line"}`}
          aria-hidden="true"
        >
          {item.pillar}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <p className="px-2 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          {t({ uk: "Розділи за вашою роллю", en: "Sections for your role" })}
        </p>
        {navForRole(role).map(renderItem)}
      </nav>

      <div className="mt-auto space-y-3 px-4 pb-5 pt-4">
        <div className="flex items-center justify-end">
          <Link
            href="/"
            onClick={onNavigate}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            {t({ uk: "Про проєкт", en: "About" })}
            <IconArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
