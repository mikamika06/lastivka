"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { PERSONAS, DEMO_PASSWORD, setSessionCookie, type Persona } from "@/lib/session";
import { useTx } from "@/components/providers/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const t = useTx();
  const [selected, setSelected] = useState<Persona | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const enter = () => {
    if (!selected) {
      setError(t({ uk: "Оберіть користувача.", en: "Select a user." }));
      return;
    }
    if (password !== DEMO_PASSWORD) {
      setError(t({ uk: "Невірний пароль.", en: "Wrong password." }));
      return;
    }
    setSessionCookie(selected.id);
    router.push(selected.landing);
    router.refresh();
  };

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo />
          <h1 className="h-display mt-5 text-2xl font-bold text-ink">
            {t({ uk: "Вхід за роллю", en: "Role-based sign-in" })}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {t({
              uk: "Доступ до даних залежить від ролі.",
              en: "Data access depends on your role.",
            })}
          </p>
        </div>

        <div className="space-y-2.5">
          {PERSONAS.map((p) => {
            const active = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setSelected(p); setError(""); }}
                className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                  active ? "border-brand-line bg-brand-soft" : "border-line bg-surface hover:border-brand-line"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                  p.pii ? "bg-brand text-primary-fg" : "bg-paper-2 text-ink-2"
                }`}>
                  {(t(p.name).match(/[А-ЯІЇЄҐA-Z]/g) ?? ["?"]).slice(0, 2).join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{t(p.name)}</span>
                  <span className="block text-xs text-muted">{t(p.scopeLabel)}</span>
                </span>
                <span className="text-right text-xs">
                  <span className="block text-muted">{p.email}</span>
                  <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 font-semibold ${
                    p.pii ? "bg-brand-soft text-brand-ink" : "border border-line text-faint"
                  }`}>
                    {p.pii ? t({ uk: "з ПІБ", en: "with PII" }) : t({ uk: "без ПІБ", en: "no PII" })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && enter()}
            placeholder={t({ uk: "Пароль (lastivka)", en: "Password (lastivka)" })}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand"
          />
          {error && <p className="text-xs font-medium text-brand">{error}</p>}
          <button
            onClick={enter}
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-primary-fg transition hover:opacity-90"
          >
            {t({ uk: "Увійти", en: "Sign in" })}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-faint">
          {t({ uk: "Спільний пароль", en: "Shared password" })} <span className="font-mono">lastivka</span>
        </p>
      </div>
    </div>
  );
}
