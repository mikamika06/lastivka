I now have a thorough picture of the system. The model emits rich attributes (e.g., `is_repeat`, `primary_recurrent_flag`, `victim_age`, `form_of_violence`, `emergency_restraining_order`), but `detection.py` collapses most of them into booleans and `scoring.py` uses flat per-violation severity × evidence-count × acuity. I have everything needed to write the staged plan grounded in the actual code.

---

# Ластівка: план переходу «від прапорців до СУТІ події»

## 0. Діагноз поточного стану (що саме треба змінити)

Я простежив ланцюг `realmodel → emitters/registries → detection → scoring`. Висновок: **сутність події вже частково народжується в емітерах, але вмирає в детекції.**

Конкретні точки втрати суті в наявному коді:

- **`detection.py:_signals`** перетворює багаті поля на булеани. Приклади:
  - `s["police_calls"] = len(R.get("DV", []))` — рахує **кількість рядків**, але ігнорує `primary_recurrent_flag`, `emergency_restraining_order`, `form_of_violence`, `incident_datetime` (давність), `parents_are_abusers_flag` (роль).
  - `s["trauma_repeat"] = any(is_repeat) or len(traumas) >= 2` — бінарна повторність; втрачено `condition_code` (тяжкість травми), послідовність дат (хронічність).
  - `s["erdr_article"]` зведено до коду статті — втрачено `victim_age`, `investigation_status` (наслідок: триває / закрито / вирок), роль (`victim` vs підозрюваний-опікун).
- **`scoring.py:score_entity`** рахує `sev × evidence_count × acuity`, де `severity` — **константа на тип порушення** (`scoring.yaml`). Тяжкість конкретного епізоду, роль кривдника, давність останньої події, повторність — у формулу **не входять**. `evidence` — це лише *кількість реєстрів*, не сила доказу (вирок ≠ відкрите провадження).
- **Немає household-виміру.** `entity.py` = одна дитина; матчинг (`matching.py`) зв'язує реєстри в межах однієї дитини, але брати/сестри й спільний кривдник не агрегуються.
- **`acuity`** (`detection.py:_acuity`) — єдиний субстантивний вимір, що вже працює (давність через onset). Це наш плацдарм.

Принцип, підтверджений доказами (SDM, (E)MMCS, Signs of Safety, ACE dose-response): **структуруй, ЯКІ фактори оцінюються (рівність/надійність), але зважуй за СУТТЮ — тяжкість, давність, повторність, роль, наслідок.** Сам прапорець присутності — слабкий предиктор (King 2013: звернення школи у 1.84× частіше непідтверджені; Hood 2020: у більшості кейсів із toxic-trio шкоди не підтверджено).

---

## Етап 1. Збагатити схему подій субстантивними атрибутами

Мета: кожна **подія** (рядок реєстру → нормалізований `Event`) несе 5 субстантивних осей, а не один факт. Спираюся на (E)MMCS (subtype × severity 1-5 × frequency × chronicity × perpetrator) та поля українських реєстрів.

### 1.1 Канонічна п'ятивісна схема `Event`

Додати проміжний шар нормалізації між `rows_by_reg` і детекцією — `lastivka/events.py`. Кожна подія:

| Вісь | Поле | Тип | Джерело (реальні поля українських реєстрів) |
|---|---|---|---|
| **Тяжкість** | `severity` | ordinal 1–5 | ЄРДР: `стаття+частина ККУ` (152 → 5, 126-1 → 3-4); ЄДРСР: тип рішення (`вирок` > `ухвала`); ДН: `form_of_violence` + ступінь тілесних ушкоджень; eHealth: `condition_code`/МКХ-10 (S/T-коди, переломи = severe); CBI: `disability_group` |
| **Роль** | `actor_role` | enum | ДН: `parents_are_abusers_flag`, `abuser_full_name`, `child_witnessed_violence` (жертва/свідок); ЄРДР: процесуальний статус (потерпілий/підозрюваний); стосунок кривдника до дитини (біол. батько / вітчим / сторонній) |
| **Давність** | `event_date` → `recency_months` | int | усі реєстри мають дату: ДН `incident_datetime`, ЄРДР `datetime_of_offence`, eHealth дата `condition`, ВПО `displacement_date` |
| **Повторність** | `recurrence_n`, `is_repeat` | int/bool | ДН `primary_recurrent_flag`; eHealth `is_repeat`; кількість проваджень ЄРДР; кількість рішень ЄДРСР |
| **Наслідок** | `outcome` / `adjudication` | enum | ЄРДР `investigation_status` (триває/закрито/вирок); ЄДРСР тип рішення; ДН `emergency_restraining_order` + його **порушення**; eHealth: госпіталізація/смерть |

### 1.2 Що саме додати в емітери (`emitters/registries.py`)

Багато вже є — треба **доповнити, а не переписати**:

- **ЄРДР** (`emit_erdr`): додати `legal_qualification_part` (частина статті → тяжкість), `case_outcome` (триває / закрито за відсутністю / **обвинувальний вирок**), `relationship_to_victim` (батько/вітчим/сторонній). Зараз `investigation_status` завжди «триває» — це знищує вісь наслідку.
- **ДН** (`emit_dv`): вже є `primary_recurrent_flag`, `emergency_restraining_order`, `child_witnessed_violence`. **Додати**: `injury_severity` (легкі/середні/тяжкі тілесні — українська Форма оцінки ризиків п.5), `strangulation_flag` (п.4 — near-lethal маркер), `restraining_order_violation` (п.24 — найсильніший проксі рецидиву), `risk_level` (високий/середній/низький — підсумкове поле Наказу 369/180), `weapon_threat`, `threat_to_kill_children` (п.1-3).
- **eHealth** (`emit_ehealth`): для травм додати `body_region`/`fracture_flag` і `hospitalized`; для psych — `diagnosis_severity` (амбулаторно / госпіталізація). Хронічність виводиться з **послідовності дат**, не з одного поля.
- **ЄДРСР** (`emit_edrsr`): `decision_type` (вирок/ухвала/постанова), `legal_force_date` (давність), `restraining_order_issued`.
- **PFU/EISSS** (економіка): різниця між «отримує допомогу» (буфер) і **«санкція/припинення виплати»** (каузальний ризик, Ginther 2017). Додати `benefit_termination_flag`, `breadwinner_unemployed` (роль — Rork 2023: батьківське безробіття OR 1.54, материнське нз).

### 1.3 Чесна межа даних (важливо для етапу 6)

Медична таємниця: eHealth дає **факт** діагнозу/обліку, але клінічну тяжкість/прихильність до лікування система легально часто **не бачить**. Тому вісь `severity` для psych/addiction має дозволяти значення `unknown` і **не штрафувати за відсутність даних** (інакше караємо бідних/недіагностованих).

---

## Етап 2. Детекція, що читає СУТЬ, а не факт

Рефактор `detection.py:_signals` + `detect_entity`: замість булеанів повертати **структуровані суб-об'єкти**.

### 2.1 Замінити лічильники-прапорці на субстантивні агрегати

Зараз:
```python
s["police_calls"] = len(R.get("DV", []))            # факт
s["trauma_repeat"] = any(is_repeat) or len(...)>=2  # бінарно
```
Стане (концептуально):
```python
s["dv"] = {
  "n_incidents": ...,                  # повторність (count, не bool)
  "max_severity": max(injury_severity),# тяжкість найгіршого епізоду
  "recency_months": T - last_incident, # давність
  "role": "victim"|"witness",          # роль дитини
  "restraining_order_violated": ...,   # наслідок/ескалація
  "strangulation": ...,                # near-lethal маркер
  "risk_level": "високий",             # офіційне підсумкове поле
}
```

### 2.2 Детектори читають профіль, а не наявність

`P1_physical_home` зараз: `trauma_repeat AND (police_calls>0 OR 126-1)`. Стане: спрацьовує на наявності, але **emit з профілем суті** — `{severity, recency, recurrence, role, outcome}` — який передається далі в скоринг. Детектор більше не вирішує «є/нема» бінарно для тяжких речей; він кваліфікує **подію**, а скоринг зважує її дозу.

### 2.3 Harm vs Danger (Signs of Safety)

Розділити в детекції дві осі (зараз злиті):
- **Harm** = задокументована минула шкода (вирок, травма, підтверджений епізод).
- **Danger** = поточний/майбутній ризик (активне провадження, свіжий change-point, кривдник має доступ).

Це прямо лягає на наявну `acuity`: `chronic` harm із давнім onset ≠ `acute` danger. Додати поле `evidence_strength` (adjudicated `вирок` > substantiated > allegation/відкрите провадження) — King 2013, Besemer official-bias.

### 2.4 Зберегти антидубль-логіку

Наявні застереження (`W2` лише якщо немає abuse-пояснення; `F1` not if P1/F6) — це **вже** «суть, не факт» у зародку. Зберегти й розширити: не подвоювати рахунок одного інциденту, що потрапив у 3 реєстри.

---

## Етап 3. Кумулятивний + toxic-trio скоринг (dose-response, у сукупності)

Рефактор `scoring.py:score_entity`. Зараз: `value = severity_const × evidence_count × acuity`, потім `max + 0.2·Σothers`.

### 3.1 Dose-response всередині фактора

Severity типу більше **не константа**, а множиться на субстантивні осі епізоду (з `scoring.yaml`, калібровані):

```
contrib = base_severity[type]
        × dose(episode_severity)      # 1..5 → множник (ACE dose-response усередині фактора)
        × recurrence_mult(n)          # SDM-стиль: 0→1.0, 1→1.2, 2→1.4, 3+→1.7 (монотонно)
        × recency_decay(months)       # експонента, half-life ~ місяці (Fluke: пік 30дн–4міс)
        × role_mult(role)             # біол.батько-кривдник > сторонній; жертва ≈ свідок (обидва ризик)
        × evidence_strength(outcome)  # вирок 1.3 / substantiated 1.0 / allegation 0.6
```

`recency_decay` замінює грубий `acuity` enum (зберегти enum як fallback). Прямо обґрунтовано event-history аналізом рецидиву.

### 3.2 Кумулятивний індекс + нелінійність на високих рівнях

Зберегти `max + secondary_weight·Σ`, але додати **нелінійний доданок** при високій концентрації (Felitti dose-response експоненційна; verification: переважно адитивно, але прискорення на високих counts реальне):

```
cumulative_boost = 1 + k · max(0, n_substantive_factors - threshold)   # threshold ~3
```
Не рівні ваги — **модельно-оцінені** (verification: weighted > equal weighting). Це їде як seed у `scoring.yaml`, калібрується коли будуть мітки (шов `features()`/`load_calibration()` вже існує — ідеальне місце).

### 3.3 Toxic-trio: обережно, з обов'язковим severity-gating

**Критично** (verification 0/3 + Skinner 2021): toxic-trio (ДН + психічне нездоров'я батьків + залежність) — **не** валідований сильний предиктор. Тому:
- toxic-trio дає **множник лише за наявності тяжкості/наслідку** хоча б в одному факторі (Hood 2020: ризик дає категорія II = висока концентрація+тяжкість, не сам набір).
- НЕ давати T0-override за саму co-presence трьох прапорців. Це залишити для `immediate_override` (вирок ст.152, депортація — справжня суть).
- Логувати toxic-trio як **пояснювальний контекст**, не як автоматичний бал. Уникати ярлика (NSPCC): показувати окремі фактори та їх вплив.

### 3.4 Severity-override понад арифметику (SDM mandatory overrides)

Розширити наявний `immediate_override`: каталог подій, де **суть перебиває суму** — тяжкі тілесні дитині <2 р., душіння (ДН), порушення обмежувального припису, обвинувальний вирок за насильство проти дитини. Це структурна відповідь на «одна тяжка подія важить більше за багато дрібних».

---

## Етап 4. Household-агрегація (родина, брати/сестри, рецидив)

Найбільший новий шар — його зараз **немає**.

### 4.1 Сутність `Household`

Новий `lastivka/household.py`. Ключ зв'язування: **спільний кривдник** (ЄРДР `abuser`, ДН `abuser_full_name`), спільна адреса (`registered_residence`), спільні батьки (ДРАЦС, ЄДРСР рішення про батьків). У realmodel — додати `family_id` дітям, генерувати sibling-групи (зараз кожна дитина незалежна).

### 4.2 Household-сигнали (субстантивні, не сума балів дітей)

- **Sibling spillover**: насильство над одним = ризик для всіх (StatPearls: кривдники партнерки б'ють дітей у 30-60%). Подія на брата підвищує `danger`-вісь сиблінгів, але **не дублює harm**.
- **Household-рецидив**: повторні події по **різних дітях** однієї родини = патерн (re-perpetration new-victim — вітчим/«батько не всіх дітей» предиктує new-victim, ScienceDirect S0145213421004889).
- **Перенесення вразливості**: наймолодший / дитина з інвалідністю в родині піднімає household-поріг (DVRIM: діти <7 р.).

### 4.3 Агрегація

Household-score = функція від макс. дитячого score + household-патернів (спільний кривдник з порушенням припису; рецидив по сиблінгах), **не** проста сума — щоб уникнути механічного завищення для багатодітних (verification: бідність/багатодітність ≠ ризик).

---

## Етап 5. Як це лягає на наявний код: адитивне vs рефактор

### Адитивне (низький ризик, робимо першим)
- **`scoring.yaml`**: усі нові множники (`dose`, `recurrence_mult`, `recency_decay`, `role_mult`, `evidence_strength`, `cumulative_boost`) — нові секції конфіга. Структура ваг уже там.
- **Емітери**: додавання полів (`injury_severity`, `case_outcome`, `restraining_order_violation`, `legal_qualification_part`) — **адитивне**, старі поля лишаються.
- **`scoring.py:features()`**: розширити вектор фіч (max, sum, n, vuln, immediate) → додати dose/recency/role-агрегати. Шов під каліброану модель (`load_calibration`) уже існує — нічого ламати.
- **`acuity`**: лишається як fallback; `recency_decay` — поряд.

### Потребує рефактора (вищий ризик, етапно)
- **`detection.py:_signals`**: з пласких булеанів → структуровані суб-об'єкти. Це **ядро рефактора**. Зробити через новий `events.py` (нормалізація), щоб `detect_entity` читав `Event`-и, а старий `_signals` лишити сумісним shim'ом на час міграції.
- **`scoring.py:score_entity`**: формула `sev×ev×acu` → dose-response. Рефактор, але локальний (одна функція).
- **`realmodel.py`**: sibling/`family_id` генерація — новий код у `build_population` (зараз цикл по незалежних дітях). Помірний рефактор.
- **`household.py` + матчинг**: новий модуль; `matching.py` розширити на cross-child зв'язування за кривдником/адресою.

### Порядок впровадження
1. Емітери (атрибути) — адитивно, нічого не ламає.
2. `events.py` нормалізація — паралельно зі старим `_signals`.
3. `scoring.yaml` + `score_entity` dose-response — за фіч-флагом, A/B проти старої формули.
4. Household-шар — окремо, наприкінці.

---

## Етап 6. Чесні застереження (прозорість, упередженість, межі даних)

Це не додаток, а вимога — рішення про дитину, чорна скриня неприпустима (як зазначено в docstring `scoring.py`).

1. **Прозорість > точність балу.** Кожен бал мусить нести `contributions` із **поясненням осей**: «P1: тяжкість 4/5, повторно (3 епізоди), свіже (2 міс), кривдник=вітчим, є вирок». Наявний `contributions`-механізм розширити, не ховати dose-множники.

2. **Toxic-trio — пояснення, не вирок.** Доказова база «alarmingly weak» (Skinner 2021; verification 0/3). Не давати автобал за co-presence; показувати окремі фактори (NSPCC). Множник лише з severity-gating.

3. **Бідність ≠ нехтування.** Найсильніший хибнопозитив (Kim & Drake; >half штатів США мають poverty-exemption). `F3_neglect` має вимагати **спроможність-vs-брак-ресурсів**: депривація + ознаки відмови/недбалості, не сам факт бідності. Економічні фактори (PFU/EISSS) — буфер/контекст, штрафувати лише **санкцію/припинення**, не сам статус малозабезпеченості.

4. **Межі даних = `unknown`, не «0».** Медтаємниця ховає клінічну тяжкість psych/addiction. Відсутність даних не штрафує і не вважається «низькою тяжкістю» — інакше караємо недіагностованих/бідних.

5. **Сила доказу.** Відкрите провадження ЄРДР ≠ вирок ЄДРСР (Besemer official-bias; King школа 1.84× частіше непідтверджена). `evidence_strength` має занижувати allegation відносно adjudicated.

6. **Помірна валідність — закладено в дизайн.** Навіть найкращі структуровані інструменти AUC ~0.69-0.75 (meta 2025). Тому: decision **support**, human-in-the-loop, періодичний reassessment (~180 днів, бо динамічний ризик згасає), і **аудит рівності** (CFRA монотонність тримається across race — нам теж треба перевіряти across oblast/ВПО/бідність, щоб не кодувати соцградієнт як ризик).

7. **Рецидив — найсильніший предиктор, але як суть, не як «вилучення».** Verification 3/3: попередній контакт із системою — найсильніший сигнал (38% vs 13% рецидиву). Рахувати **попередні підтверджені події/звернення**, не прирівнювати «попереднє вилучення» до рецидиву (методологічно різне).

---

## Релевантні файли (абсолютні шляхи)

- `/Users/macbook/lastivka/lastivka/realmodel.py` — sibling/`family_id` (етап 4); атрибути латентних факторів.
- `/Users/macbook/lastivka/lastivka/emitters/registries.py` — додати субстантивні поля (`emit_erdr` ~р.397, `emit_dv` ~р.425, `emit_ehealth` ~р.210, `emit_edrsr` ~р.515).
- `/Users/macbook/lastivka/lastivka/detection.py` — рефактор `_signals` (р.83) і `detect_entity` (р.186) на структуровані події; зберегти `change_point`/`_acuity`.
- `/Users/macbook/lastivka/lastivka/scoring.py` — `score_entity` (р.62) dose-response; розширити `features` (р.103).
- `/Users/macbook/lastivka/config/scoring.yaml` — нові секції `dose`, `recurrence_mult`, `recency_decay`, `role_mult`, `evidence_strength`, `cumulative_boost`, розширений `immediate_override`.
- **Нові**: `/Users/macbook/lastivka/lastivka/events.py` (нормалізація `Event`), `/Users/macbook/lastivka/lastivka/household.py` (агрегація родини).
- `/Users/macbook/lastivka/lastivka/matching.py` — розширити на cross-child зв'язування (кривдник/адреса).

**Ключова теза для всіх етапів:** суть події (тяжкість × давність × повторність × роль × наслідок) зважується dose-response; toxic-trio й сама присутність прапорців — слабкі предиктори, тож лишаються поясненням, а severity-override (вирок, депортація, душіння, порушення припису) перебиває арифметику — як mandatory overrides у SDM.