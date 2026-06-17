import { getMetrics } from "@/lib/api";
import { violName } from "@/lib/registries";
import { formatNumber, formatPct } from "@/lib/format";
import { Card, CardTitle, SectionHeading, Pill } from "@/components/ui/Card";
import { MiniStat } from "@/components/ui/Stat";
import { LockIcon } from "@/components/ui/badges";
import { IconShield, IconCheck, IconLayers } from "@/components/ui/icons";

export const metadata = { title: "Захист даних і якість — Ластівка" };

export default async function PrivacyPage() {
  const metrics = await getMetrics();
  const o = metrics.detection.overall;
  const rows = Object.entries(metrics.detection.per_violation)
    .map(([k, m]) => ({ key: k, ...m }))
    .sort((a, b) => b.precision - a.precision);

  return (
    <div className="space-y-6">
      <SectionHeading
        index="04"
        title="Захист даних і якість системи"
        subtitle="Чому системі можна довіряти: вона зіставляє дітей, не розкриваючи персональні дані, і чесно показує, наскільки точно працює."
      />

      {/* приватне зіставлення */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <CardTitle icon={<LockIcon className="h-4 w-4 text-lock" />}>
              Як ми зіставляємо дитину, не розкриваючи її дані
            </CardTitle>
            <p className="text-sm leading-relaxed text-ink-2">
              Реєстри порівнюють не самі імена, а їхні{" "}
              <span className="font-semibold text-ink">зашифровані цифрові відбитки</span>. Тобто система
              розуміє, що в двох реєстрах — та сама дитина, але{" "}
              <span className="font-semibold text-ink">не бачить ні імені, ні номерів</span>. Зіставлення
              стійке до різного написання: «Олександр», «Oleksandr» чи «Alexander» система впізнає як
              одну людину.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="brand">За зашифрованими відбитками</Pill>
              <Pill tone="brand">Стійко до різного написання імені</Pill>
              <Pill tone="neutral">Без доступу до самих імен</Pill>
            </div>
            <div className="mt-5 rounded-xl border border-lock/20 bg-lock-soft/60 p-4">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-lock-ink">
                <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Найчутливіші дані (кримінальні провадження, медицина) система отримує лише як сигнал{" "}
                  <span className="font-semibold">«є / немає»</span> — без доступу до вмісту. Повний
                  доступ можливий тільки за рішенням суду чи в межах лікарської таємниці. Це єдиний
                  законний спосіб користуватися такими даними.
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MiniStat label="Перевірено пар записів" value={formatNumber(metrics.privacy.n_pairs)} tone="neutral" />
            <MiniStat
              label="Точність зіставлення"
              value={metrics.privacy.precision.toFixed(2)}
              tone="ok"
            />
            <MiniStat label="Повнота" value={metrics.privacy.recall.toFixed(2)} tone="brand" />
          </div>
        </div>
      </Card>

      {/* якість виявлення */}
      <Card className="p-5 sm:p-6">
        <CardTitle
          icon={<IconShield className="h-4 w-4 text-brand" />}
          hint="звірено з відомими випадками"
        >
          Наскільки точно система виявляє кожен тип порушення
        </CardTitle>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3 font-medium">Порушення</th>
                <th className="px-2 py-2 text-center font-medium">Вірно</th>
                <th className="px-2 py-2 text-center font-medium">Хибні</th>
                <th className="px-2 py-2 text-center font-medium">Пропущено</th>
                <th className="px-3 py-2 font-medium">Точність</th>
                <th className="px-3 py-2 font-medium">Повнота</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line-2 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink">{violName(r.key)}</td>
                  <td className="px-2 text-center tnum text-ink-2">{r.tp}</td>
                  <td className="px-2 text-center tnum text-muted">{r.fp}</td>
                  <td className="px-2 text-center tnum text-muted">{r.fn}</td>
                  <td className="px-3 py-2">
                    <MetricBar value={r.precision} color="var(--color-brand)" />
                  </td>
                  <td className="px-3 py-2">
                    <MetricBar value={r.recall} color="var(--color-brand-2)" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          <span className="font-medium text-ink-2">Точність</span> — яка частка тривог справдилась (менше
          марних тривог). <span className="font-medium text-ink-2">Повнота</span> — яку частку реальних
          випадків система вловила (менше пропусків).
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-ok/20 bg-ok-soft/60 px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ok text-white">
            <IconCheck className="h-4 w-4" />
          </span>
          <p className="text-sm text-ok-ink">
            Загалом: <span className="font-bold">точність {o.precision.toFixed(2)}</span> ·{" "}
            <span className="font-bold">повнота {o.recall.toFixed(2)}</span> ·{" "}
            <span className="font-bold">загальна якість {o.f1.toFixed(2)}</span> — перевірено на{" "}
            {formatNumber(metrics.matching.true_children)} синтетичних дітях із заздалегідь відомими порушеннями.
          </p>
        </div>
      </Card>

      {/* збирання дитини з реєстрів */}
      <Card className="p-5 sm:p-6">
        <CardTitle icon={<IconLayers className="h-4 w-4 text-brand" />} hint="як дитина збирається з реєстрів">
          Збирання дитини з різних реєстрів
        </CardTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Профілів зібрано" value={formatNumber(metrics.matching.entities)} />
          <MiniStat
            label="Зібрано в один профіль"
            value={formatPct(metrics.matching.reconstruction_rate, 1)}
            tone="ok"
          />
          <MiniStat label="Без помилок зіставлення" value={formatNumber(metrics.matching.pure_clusters)} />
          <MiniStat label="Знайдено за схожістю імені" value={formatNumber(metrics.matching.fuzzy_attached)} tone="brand" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Якщо в дитини є єдиний номер запису (УНЗР) — записи зводяться точно. Якщо номера немає (немовлята,
          звернення на гарячі лінії) — система знаходить ту саму дитину за збігом імені та дати народження.
          Вона працює лише з даними реєстрів і ніколи не бачить «повної картини» згори.
        </p>
      </Card>
    </div>
  );
}

function MetricBar({ value, color }: Readonly<{ value: number; color: string }>) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="w-9 text-xs font-semibold tnum text-ink-2">{value.toFixed(2)}</span>
    </div>
  );
}
