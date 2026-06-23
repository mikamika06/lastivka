import Link from "next/link";
import { getT } from "@/lib/i18n.server";
import { Logo } from "@/components/ui/Logo";
import { Controls } from "@/components/providers/Controls";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — Lastivka" };

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ next?: string }> }>) {
  const [t, sp] = await Promise.all([getT(), searchParams]);
  const next = sp.next ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Logo />
        <Controls />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="h-display text-2xl font-bold">
              {t({ uk: "Вхід до системи", en: "Sign in to the system" })}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {t({
                uk: "Демо-аутентифікація. Оберіть персону, щоб побачити рівень доступу: фахівець громади (персональні дані своєї громади) або регіональний аналітик (знеособлені агрегати).",
                en: "Demo authentication. Pick a persona to see its access level: a community worker (personal data for their own hromada) or a regional analyst (de-identified aggregates).",
              })}
            </p>
          </div>

          <div className="card p-6 sm:p-7">
            <LoginForm next={next} />
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            <Link href="/about" className="font-medium text-brand hover:underline">
              {t({ uk: "Що це за рішення?", en: "What is this solution?" })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
