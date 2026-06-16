"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { SidebarContent } from "./Sidebar";
import { Logo } from "@/components/ui/Logo";
import { IconMenu, IconClose } from "@/components/ui/icons";

export function AppShell({ children }: { children: ReactNode }) {
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
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo subtitle={false} />
        <button
          onClick={() => setOpen(true)}
          aria-label="Відкрити меню"
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink-2"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Навігація">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div id="mobile-nav" className="absolute left-0 top-0 h-full w-[290px] animate-[fade-in_0.2s_ease] border-r border-line bg-surface shadow-pop">
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрити меню"
              className="absolute right-3 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-paper-2"
            >
              <IconClose className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0">
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
