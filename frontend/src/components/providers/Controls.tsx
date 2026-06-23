"use client";

import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

/** Кластер керування: мова + тема. Роль — єдина, обрана на вході (без окремого світчера). */
export function Controls() {
  return (
    <div className="flex items-center gap-2">
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}
