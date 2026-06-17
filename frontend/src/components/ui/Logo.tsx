import Link from "next/link";

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
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="Ластівка — на головну">
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl transition-transform group-hover:-translate-y-0.5 ${
          invert ? "bg-white/10 text-white" : "bg-ink text-white"
        }`}
      >
        <SwallowMark className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className={`block font-display text-[17px] font-bold tracking-tight ${invert ? "text-white" : "text-ink"}`}>
          Ластівка
        </span>
        {subtitle && (
          <span className={`block text-[10.5px] font-medium uppercase tracking-[0.14em] ${invert ? "text-white/55" : "text-faint"}`}>
            Захист прав дитини
          </span>
        )}
      </span>
    </Link>
  );
}
