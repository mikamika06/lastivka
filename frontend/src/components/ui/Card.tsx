import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: Readonly<{
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}>) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function CardTitle({
  children,
  hint,
  icon,
}: Readonly<{
  children: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}>) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {children}
      </h3>
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </div>
  );
}

/** Великий індекс розділу (01–04) у стилі концепт-слайда. */
export function SectionHeading({
  index,
  title,
  subtitle,
}: Readonly<{
  index: string;
  title: string;
  subtitle?: string;
}>) {
  return (
    <div className="flex items-start gap-4">
      <span
        className="section-index select-none text-5xl text-brand/15 sm:text-6xl"
        aria-hidden="true"
      >
        {index}
      </span>
      <div className="pt-1">
        <h1 className="h-display text-xl font-bold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function pillToneClass(tone: "brand" | "neutral" | "ok"): string {
  if (tone === "brand") {
    return "bg-brand-soft text-brand-ink ring-brand-line";
  }
  if (tone === "ok") {
    return "bg-ok-soft text-ok-ink ring-ok/20";
  }
  return "bg-paper-2 text-muted ring-line";
}

export function Pill({
  children,
  tone = "brand",
}: Readonly<{
  children: ReactNode;
  tone?: "brand" | "neutral" | "ok";
}>) {
  const cls = pillToneClass(tone);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${cls}`}>
      {children}
    </span>
  );
}
