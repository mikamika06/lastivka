"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { DEMO_USERS, DEMO_PASSWORD, ROLE_LABEL } from "@/lib/auth";
import { oblastLabel } from "@/lib/registries";
import { useTx, useLocale } from "@/components/providers/I18nProvider";
import { IconArrowRight } from "@/components/ui/icons";

const initial: LoginState = { error: null };

export function LoginForm({ next }: Readonly<{ next: string }>) {
  const t = useTx();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted">
            {t({ uk: "Демо-логін", en: "Demo login" })}
          </label>
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            defaultValue={DEMO_USERS[0].id}
            list="demo-logins"
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
          />
          <datalist id="demo-logins">
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted">
            {t({ uk: "Пароль", en: "Password" })}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            defaultValue={DEMO_PASSWORD}
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
          />
        </div>

        {state.error && (
          <p className="rounded-lg border border-t0-line bg-t0-soft px-3 py-2 text-sm text-t0-ink">
            {t({ uk: "Невірний логін або пароль.", en: "Invalid login or password." })}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? t({ uk: "Вхід…", en: "Signing in…" }) : t({ uk: "Увійти", en: "Sign in" })}
          {!pending && <IconArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <div className="rounded-xl border border-line bg-paper/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
          {t({ uk: "Демо-персони (рівні доступу)", en: "Demo personas (access levels)" })}
        </p>
        <ul className="mt-3 space-y-2.5">
          {DEMO_USERS.map((u) => (
            <li key={u.id} className="text-sm">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("email") as HTMLInputElement | null;
                  if (el) el.value = u.id;
                }}
                className="group w-full rounded-lg border border-line bg-surface px-3 py-2 text-left transition hover:border-brand-line"
              >
                <span className="block font-semibold text-ink">{u.name}</span>
                <span className="block text-xs text-muted">
                  {t(ROLE_LABEL[u.role])} ·{" "}
                  {u.hromada
                    ? `${u.hromada} (${oblastLabel(u.oblast, locale)})`
                    : oblastLabel(u.oblast, locale)}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-faint">{u.id}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          {t({
            uk: `Спільний демо-пароль: ${DEMO_PASSWORD}. Це демо — вхід лише демонструє рівні доступу (RBAC і скоуп даних), реального бекенду немає.`,
            en: `Shared demo password: ${DEMO_PASSWORD}. This is a demo — sign-in only illustrates the access levels (RBAC and data scope); there is no real backend.`,
          })}
        </p>
      </div>
    </div>
  );
}
