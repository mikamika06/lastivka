"use client";

import { useTheme } from "./ThemeProvider";
import { IconSun, IconMoon } from "@/components/ui/icons";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
      title={dark ? "Світла тема" : "Темна тема"}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink-2 transition hover:bg-paper-2 hover:text-ink"
    >
      {dark ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
    </button>
  );
}
