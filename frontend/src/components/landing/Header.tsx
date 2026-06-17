import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Controls } from "@/components/providers/Controls";
import { IconArrowRight } from "@/components/ui/icons";

const LINKS = [
  { href: "#problem", label: "Проблема" },
  { href: "#how", label: "Як працює" },
  { href: "#screens", label: "Система" },
  { href: "#audience", label: "Для кого" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-paper-2 hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <Controls />
          <Link
            href="/dashboard"
            className="hidden items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition hover:opacity-90 sm:inline-flex"
          >
            Відкрити систему
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
