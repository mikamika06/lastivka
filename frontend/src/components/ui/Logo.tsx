"use client";

import Link from "next/link";
import { useTx } from "@/components/providers/I18nProvider";

export function SwallowMark({ className = "h-7 w-7" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <path
        d="M32 13 L58 38 L40 36 L46 54 L32 44 L18 54 L24 36 L6 38 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  subtitle = true,
  invert = false,
}: Readonly<{
  href?: string;
  subtitle?: boolean;
  invert?: boolean;
}>) {
  const t = useTx();
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={t({ uk: "Ластівка — на головну", en: "Lastivka — home" })}>
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl transition-transform group-hover:-translate-y-0.5 ${
          invert ? "bg-white/10 text-white" : "bg-primary text-primary-fg"
        }`}
      >
        <SwallowMark className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className={`block font-display text-[17px] font-bold tracking-tight ${invert ? "text-white" : "text-ink"}`}>
          {t({ uk: "Ластівка", en: "Lastivka" })}
        </span>
        {subtitle && (
          <span className={`block text-xs font-medium uppercase tracking-[0.14em] ${invert ? "text-white/55" : "text-faint"}`}>
            {t({ uk: "Захист прав дитини", en: "Child Rights Protection" })}
          </span>
        )}
      </span>
    </Link>
  );
}
