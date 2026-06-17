"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SidebarContent } from "./Sidebar";
import { Logo } from "@/components/ui/Logo";
import { Controls } from "@/components/providers/Controls";
import { IconMenu, IconClose } from "@/components/ui/icons";
import { useTx } from "@/components/providers/I18nProvider";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTx();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[290px_1fr]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo subtitle={false} />
        <div className="flex items-center gap-2">
          <Controls />
          <button
            onClick={() => setOpen(true)}
            aria-label={t({ uk: "Відкрити меню", en: "Open menu" })}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink-2"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t({ uk: "Навігація", en: "Navigation" })}>
          <button
            type="button"
            aria-label={t({ uk: "Закрити меню", en: "Close menu" })}
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-sm"
          />
          <div id="mobile-nav" className="absolute left-0 top-0 h-full w-[290px] animate-[fade-in_0.2s_ease] border-r border-line bg-surface shadow-pop">
            <button
              onClick={() => setOpen(false)}
              aria-label={t({ uk: "Закрити меню", en: "Close menu" })}
              className="absolute right-3 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-paper-2"
            >
              <IconClose className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0">
        {/* desktop top bar з керуванням (мова/тема) */}
        <div className="sticky top-0 z-20 hidden border-b border-line bg-paper/80 backdrop-blur lg:block">
          <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-2 px-8 py-2.5">
            <Controls />
          </div>
        </div>
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
