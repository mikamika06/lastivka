# Фінальний адверсарний рев'ю діфу — аудит-трейл

> Workflow `lastivka-final-review` (26 агентів: 5 дименсій → перевірка кожної знахідки → синтез) проти повного діфу збірки. Усі must-fix застосовано й верифіковано.

## Підтверджено CLEAN (ключові інваріанти тримаються)
- **F1-інваріант:** регенерація з `build_family_graph` як no-op дає байт-ідентичні мітки; пост-прохід має окремий `random.Random(seed+777)`, не споживає основний rng → генерація не збурена.
- **Нуль циркулярності:** набір (entity_id, violation) ідентичний з/без `familygraph.rollup` (1507==1507, 0 додано/прибрано). Household-блок лише ставить прапорці на вже-знайдені порушення.
- **WALLED-контент:** `can_read_content` дає зміст лише власній вертикалі (лікар→ЕСОЗ, поліція→ЄРДР) + представнику-пацієнту (батьки→своя медкарта); крос-вертикально — завжди закрито.

## 🔴 Must-fix (застосовано)
| # | Знахідка | Файл | Фікс |
|---|---|---|---|
| 1 | **CRITICAL** — `is_signal_only` протікав present/absent: аналітик отримував по-запису сигнал на ЕСОЗ/ЄРДР/TERVIS, ССД — на ЕСОЗ (`signal_off`) | `roles.py` | `signal_off` прибрано з `_SIGNAL_MARKS`; явний guard `if m=='signal_off': return False`; стіна `return m in _SIGNAL_MARKS`. Перевірено: `signal_registries('analyst')==set()`, ССД ЕСОЗ без сигналу; контент-читання збережені |
| 2 | **HIGH** — `/queue` віддавав сирі WALLED-назви реєстрів + докази (ЄРДР для F6!) ССД без редакції | `app/api.py`, `roles.py` | `roles.split_walled()`; у `queue()` редагуємо `registries` + `evidence` (walled→лічильник `protected_sources`/`evidence_protected`); `role`-параметр. Перевірено: 0 витоків, 498 рядків з protected_sources |

## 🟢 Цінні nice-to-have (застосовано)
- **Perpetrator-guard load-bearing:** `if role=='parent' and registry in PERPETRATOR_SUPPRESSED: return False` на початку `can_read_content`/`is_signal_only` (не покладаємось на пропуск у `_M`).
- **edge_agent:** `_blocked`-envelope отримує `pseudonym` (audit-список перетину більше не порожній).
- **intake:** детермінований `blake2b` замість builtin `hash()` (стабільно між процесами).
- **frontend `registries.ts`:** `CBI→CBI_DISABILITY`, EE-записи (RAHV/EHIS_EE/TERVIS/SKAIS), `WALLED_REGISTRIES`/`isWalled`; типи `protected_sources`/`evidence_protected`.

## 🔵 Відомі low (документовано, не виправлено — безпечні/латентні/синтетичні)
- **Parent-auth gap:** `is_own_child` похідне лише від рядка ролі (демо без автентифікації). **Перед реальним PII — звʼязати з підтвердженим опікун↔дитина.** Perpetrator-suppressed реєстри лишаються закритими в будь-якому разі.
- Dead-cohabitant гілка (`new_cohabitant_recent` не пишеться в entity) — лише анотація, набору не змінює.
- `crossborder.apply` `detections2` без фільтра merged EE-id — латентно (0 orphans; жодне правило не читає EE-реєстри сьогодні).
- Стейл `REG_ACCESS` мапи (`app/api.py`, `app/dashboard.py`) — 0 споживачів (логіка на `WALLED`).
- `intake_uncorroborated_mult` (0.85) структурно недосяжний у черзі (всі забальовані = corroborated) — підтримує інваріант «не топити реальні кейси».

## Фінальні метрики (після фіксів)
F1 **0.844** · reconstruction 0.931 · PPRL 1.0/0.937 · черга 1077 · **WALLED-витоків 0** · фронтенд білд чистий.
