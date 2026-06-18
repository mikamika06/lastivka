# Lastivka — Сімейний граф ("стан сімʼї") + Детекція фінансового зловживання

> Грунтується на `docs/LRA_DESIGN.md` (кластери, importance-gate §5.3 PSI≥2, WALLED-стіни) + `docs/ACTORS_AND_REGISTRY_ACCESS.md` + `docs/ROLE_ACCESS_MATRIX.md`. Кожне реєстрове/правове твердження пройшло адверсарну перевірку (воркфлоу `family-graph-financial-abuse`, 17 агентів). Поправки верифікації вбудовано в текст і винесено в «Застереження».
>
> Архітектурні інваріанти, що НЕ порушуються: мінімізація (2297-VI ст.6/11); крос-реєстрове зведення — ЛИШЕ на агрегаторі ССД-рівня (C1) через PSI ≥2 кластери; WALLED-стіни (ЕСОЗ Основи 2801-XII ст.39-1/40; ЄРДР КПК ст.222) тримаються — статус брата/сестри з C4/C5 НІКОЛИ не проходить ребром графа автоматично, лише авторизований push.

---

# ЧАСТИНА 1 — СІМЕЙНИЙ ГРАФ ("стан сімʼї")

Граф = шар ідентичності-хребта **C0** (ДРАЦС+ЄДДР), розширений до household/kinship. `entity.py` уже несе `mother_rnokpp/father_rnokpp/family_type` — це база вузлів. Граф НЕ зберігає сирі дані: на C1-агрегаторі живе лише **rollup за псевдонімами** (UNZR-токени).

## 1.1 Вузли

| Вузол | Ключ (псевдонім) | Атрибути (risk-bearing) | Джерело |
|---|---|---|---|
| **child** (index) | UNZR-токен | age, has_disability, has_chronic, ssd_status | ЄДДР/ДРАЦС, C1 |
| **parent** (mother/father) | RNOKPP-токен | alive\|dead, parental_rights {full\|restricted\|deprived}, employment, incarcerated*, is_care_leaver*, disability | ДРАЦС(смерть), ЄДРСР(права), ПФУ(зайнятість) |
| **guardian** опікун/піклувальник | RNOKPP-токен | relation {kin\|non_kin}, appointment_date, recipient_iban‡ | ЄІАС «Діти», ЄДРСР |
| **foster** прийомний/ДБСТ | RNOKPP-токен | placement_type {опіка\|прийомна\|ДБСТ}, n_children_placed | ЄІАС «Діти» |
| **sibling** | UNZR-токен | in_care, removed, prior_violation_code | ЄІАС «Діти» (тільки C1, PSI) |
| **household** | синтет. id (адреса-хеш) | size, n_children, churn_count | ЄІАС «Діти»; ЄІССС лише L2-локально |
| **cohabitant/new_partner** | RNOKPP-токен (часто null) | entry_date, registered? | **uncertain** — див. застереження 3 |
| **kin_caregiver** (дід/баба) | RNOKPP-токен | relation, care_density | ЄІАС «Діти» |

`*` push/consent-only (немає SSD-pull). `‡` recipient_iban — НЕ модельовано (див. Частину 2).

## 1.2 Ребра (directed, time-stamped; ризик живе НА ребрах)

| Ребро | Напрям | Атрибути | Несе ризик-ногу |
|---|---|---|---|
| **parentage** | parent→child | established_at | базовий лінк (W6-знаменник) |
| **death** | (термінує parent) | date | W6 (нога «сирітство-втрата») |
| **marriage / divorce** | adult↔adult | date | контекст single_parent |
| **deprivation** позбавл./обмеж. прав | court→parent | date, scope {full\|restrict} | W6 (нога «позбавлення») + ↑risk siblings |
| **guardianship** опіка/піклування | guardian→child | date, kin? | W6-контекст, kinship_care |
| **foster-placement** | foster→child | type, date | household_churn |
| **placement-in-care** | child→household/інтернат | date, recurrence | instability; конфлікт із виплатою (M1) |
| **cohabitation** | adult↔adult | entry_date | контекст P1/F1 (role=context, НЕ тригер) |
| **incarceration** | (parent) | — | ACE; push-only |

**Осі суті на ребрі** (мапа на LRA-envelope severity/role/recency/recurrence/outcome): `placement-in-care` несе `recency_months`+`recurrence`=скільки влаштувань; `deprivation` несе severity=scope, recency=date.

## 1.3 Карта реєстр → ребро/атрибут (верифіковано)

| Ребро/атрибут | Реєстр | Статус |
|---|---|---|
| parentage (народж./походження) | **ДРАЦС** ст.9 (2398-VI) = система запису; **ЄДДР** ст.7 ч.1 п.6 «відомості про батьків…» + п.14 «про народження дітей» | grounded. **Поправка:** ЄДДР тримає parentage-edge за статутом (попереднє «лише per-person identity» — спростовано); ДРАЦС = authoritative |
| marriage / divorce / name-change / death | ДРАЦС ст.9 (окремі act_types) | grounded; смерть уже в коді (`parent_death`) |
| UNZR як ключ зшивання | ЄДДР (5492-VI ст.7) — наскрізний пожиттєвий ідентифікатор | **підтверджено** — правомірний PSI-join key |
| deprivation / опіка-рішення | **ЄДРСР** (відкритий) | grounded; уже `court_deprivation`. Скепсис: знеособлений → надійна привʼязка до UNZR потребує непублічного № справи |
| placement / family-form / СЖО | **ЄІАС «Діти»** (C1, ССД-власник; рішення ≤14 кал.днів) | grounded; домашній вузол графа |
| household composition | **ЄІССС** (4607-IX ст.17: картка сімʼї/домогосподарства) | структура є, але читати для дитячого захисту — **БЕЗ правової підстави** (мінімізація ст.9(2)+ціль ст.13(3)); лише L2-локальний сигнал |
| parent employment | ПФУ | grounded; уже `pfu_unemployed` |
| **adoption усиновлення** | НЕ в ЄДРСР (закрита категорія) | граф НЕ реконструює усиновлене батьківство з суд.даних |

**SSD↔ДРАЦС — корекція (uncertain):** моделювати як «доступне-на-запит у встановленому порядку» (Закон 20/95-ВР; Положення z1383-21 — загальне право ССД запитувати), а **НЕ** як підтверджений автоматичний Трембіта-фід parentage/marriage. Death-нога вже працює; parentage/marriage — на запит.

## 1.4 Сигнали структури сімʼї, яких НЕ бачить one-child детекція

| Сигнал | Чому потрібен граф | Джерела | Сила доказу |
|---|---|---|---|
| **sibling_in_care** | живе на сиблінг-вузлі | ЄІАС (PSI на C1) | сильний предиктор рецидиву (US/UK когорти — **зовнішня валідність для воєнного/ВПО не доведена** → контекст, не детермінізм) |
| **sibling_prior_violation** | код порушення в іншого з household | C1 rollup | сильний; чесно гейтить F3 «бідність≠порушення» |
| **parent_incarcerated** | атрибут parent-вузла | ЄРДР=WALLED. Пост-вирок: Єдиний реєстр засуджених (Мінʼюст №2023/5), довідка про судимість (СК ст.212) | **push/consent-only**, НЕ SSD-pull |
| **single_parent_unemployed** | ДРАЦС-single × ПФУ | ДРАЦС+ПФУ | контекст-підсилювач, не тригер |
| **new_cohabitant_recent** | household-ребро з recent ts | ЄІАС / (ЄІССС — uncertain) | контекст P1/F1, role=context |
| **kinship_care** | дід/баба-опікун | ЄІАС | підтримка + churn-індикатор |
| **household_churn** | багато placement/cohab ребер у часі | ЄІАС | нестабільність |
| **parent_care_leaver** | parent — кол. випускник опіки | банк сиріт (z0582-07) трекає особу як кол. дитину, lapse у 23 р. | фактично **недоступний як parent-атрибут** (unmodeled) |

## 1.5 Фреймворки — що позичати, що позначити як евристику

| Фреймворк | Роль | Вердикт доказовості |
|---|---|---|
| **SDM** (Family Risk Assessment + FSNA + reassessment) | actuarial-структура rollup + таксономія атрибутів | **BORROW (найсильніший)**. Ваги US-валідації НЕ переносити дефолтом на воєнний/ВПО без локальної калібровки |
| **Genogram** (McGoldrick-Gerson) | сама схема вузлів/ребер | BORROW як blueprint, не предиктор |
| **Ecomap** (Hartman) | сімʼя↔інституції = крос-реєстрова екомапа | BORROW як blueprint |
| **«Toxic trio»** | лише context-note у UI каскворкера | **FLAG — contested**: «weak, lacking precision», спричинив over-referral. **НІКОЛИ не auto-boolean** |
| **Signs of Safety** | solution-focused рамка UI | **FLAG — low-evidence** (Munro: «little/no evidence»). Рамка UI, не outcome-claim |

**Net:** граф використовується, щоб **знижувати** false positives (відрізнити втрату-W6 від позбавлення, бідність-single-parent від нехтування), а не масово флагувати великі/бідні сімʼї — пряма відповідь на критику over-referral.

## 1.6 Розміщення в LRA + НОВІ derived-сигнали

**Розміщення:** граф = C0-хребет (ДРАЦС+ЄДДР), що емітить псевдонім↔псевдонім ребра (parentage/death/marriage/divorce). **C5-LRA (ЄДРСР, OPEN)** емітить deprivation/опіка-ребра. **C1-LRA (ЄІАС «Діти»)** — де живуть placement-ребра + sibling-стан І де **збирається граф** (єдиний вузол з інтегрованим L2 + PSI-агрегатором). Інваріант: крос-sibling resolution — ЛИШЕ на C1 через `privacy.psi_*`; eHealth(C4)/ЄРДР(C5-walled) брата/сестри не traverse-ить ребро.

**НОВІ ключі `_signals` (рахує C1-rollup над лінкованими household-псевдонімами, НЕ сирі записи):**
```python
s["sibling_in_care"]         = bool       # ЄІАС, PSI
s["sibling_prior_violation"] = set[str]   # коди з household-rollup
s["parent_incarcerated"]     = bool       # push/consent-only; default False
s["new_cohabitant_recent"]   = (bool, recency_m)
s["kinship_care"]            = bool
s["household_churn"]         = int        # к-ть placement/cohab ребер
s["single_parent_unemployed"]= bool       # ДРАЦС single × s["pfu_unemployed"]
s["parent_care_leaver"]      = bool        # зазвичай недоступний → False
s["household_risk_density"]  = float       # SDM-style rollup, гейтить ескалацію
```

**Застосування в `detect_entity` (модифікатори, НЕ нові самостійні тригери):**

| Існуючий код | Зміна через граф |
|---|---|
| **W6_orphanhood** | додати deprivation/placement-ребра як ноги + `sibling_in_care` як corroboration; розрізнити acuity «втрата(death)» vs «позбавлення(deprivation)» |
| **F3_neglect** | `sibling_prior_violation`/`sibling_in_care` → ↑severity і чесно проходить гейт «poverty≠violation» (рецидив — evidenced, не просто бідність). Умова `ssd_low_income` лишається, граф додає corroboration-вісь |
| **P1 / F1** | `new_cohabitant_recent` + household як **role=context** corroborating-вісь, ніколи не sole trigger |
| **escalation gate** | `household_risk_density` гейтить ескалацію разом з importance-gate §5.3 (PSI≥2) |

---

# ЧАСТИНА 2 — ФІНАНСОВЕ ЗЛОВЖИВАННЯ ("батьки взяли виплату від імені дитини неправомірно")

## 2.1 Вердикт (чесний, нюансований)

**Переважно PROXY (за іншими ознаками), але кілька жорстких крос-реєстрових НЕСУМІСНОСТЕЙ — справді DIRECT.** Критична поправка до архітектури: **DIRECT-патерни здебільшого НЕ детектує ССД сам читанням ПФУ** — це окрема центральна функція **платформи верифікації Мінфіну** (ЗУ «Про верифікацію та моніторинг державних виплат» №1865-IX, ПКМУ №136), що крос-звіряє реципієнтів проти ЄДДР-смерть/резиденція/майно/банки/ПФУ, + **щорічна фізична ідентифікація ПФУ** (отримувач живий). У матриці доступу ССД має лише 🔆 на ПФУ і **не бачить особу-отримувача/IBAN**. Тому правильна постура Lastivka: **СПОЖИВАТИ «розбіжність»-сигнал від Мінфін/ПФУ-верифікації через Трембіту**, а не претендувати на власне читання виплатних реєстрів. Сам ССД може лише (а) proxy-детектувати і (б) зіставляти влаштування (ЄІАС «Діти») з фактом опікунської виплати.

**Реформний контекст 2025-2026 (формує всю картину):** з 01.07.2025 **ПФУ** (не Мінсоц/УСЗН) платить більшість сімейних виплат; **БСД** (з 01.11.2025 універсально) консолідує малозабезпечену+одиноким матерям → перехід на БСД припиняє legacy-виплати; з 01.01.2026 нова арх.: 50 000 грн при народженні (одноразово), догляд до 1 р. 7 000/міс, єЯсла 8 000/міс — **на спецкарту з блокуванням готівки + MCC/КВЕД-обмеженням мерчантів** (вбудований цільовий контроль → нецільове зняття готівки фактично унеможливлено для нових щомісячних виплат).

## 2.2 DIRECTLY-DETECTABLE (тільки ті, що пройшли верифікацію)

| Патерн | Реєстри | Чому DIRECT | Хто реально детектує |
|---|---|---|---|
| **Виплата ТРИВАЄ після смерті дитини**: ЄІССС/ПФУ активна виплата на UNZR ↔ ЄДДР death / ДРАЦС act_type='смерть' | ЄІССС, ПФУ, ЄДДР, ДРАЦС | хард-join: «мертва» і «виплата активна» не істинні одночасно; жодного інференсу | **Мінфін-верифікація** (1865-IX), не ССД → Lastivka СПОЖИВАЄ сигнал |
| **Отримувач опік.допомоги ≠ фактичний опікун / дитина в інтернаті**: ЄІАС Placement_form='інтернат' ↔ ЄІССС платить опіку на IBAN фізособи | ЄІАС «Діти», ЄІССС | прямий конфлікт статусу влаштування і підстави виплати | DIRECT **ЛИШЕ якщо** ЄІССС експонує recipient_rnokpp для join з ЄІАС.guardian_rnokpp — поле, якого зараз НЕ модельовано (claim-to-verify, див. 2.6) |
| **Відчуження нерухомості/частки дитини БЕЗ дозволу опіки** (= наш W9): ДРРП зміна власника без рішення ССД (ст.177 СК) | ДРРП, ЄІАС, ЄДДР | реєстраційна дія щодо майна дитини без обовʼязкового дозволу — пряме порушення ст.177 СК | вже `housing_alienation`→W9. Скепсис: нотаріус блокує на вході → частіше детектується спроба/відмова |
| **Судове рішення/виконавче провадження**: ЄДРСР «аліменти»/«управління майном дитини»/«зловживання» АБО відкрите ВП; боржник у ЄРБ (erb.minjust.gov.ua) | ЄДРСР, АСВП/ДВС, ЄРБ | доконаний юр.факт у публічному реєстрі | DIRECT, але ЄДРСР знеособлений → привʼязка до UNZR ненадійна без непублічного № справи |

> Виключено з DIRECT після верифікації: «виплата після виїзду за кордон» — UA-частина (ЄДДР abroad-flag) near-direct, але поле часто порожнє (uncertain); EE-частина — лише PSI-proxy (УНЗР↔isikukood = тільки Bloom-сигнал, не join).

## 2.3 PROXY-ONLY + counter-signals

| Proxy | Counter-signals |
|---|---|
| Виплата надходить, дитина **поза освітою** | ЄІССС/ПФУ активна виплата · ІСУО/АІКОМ `out_of_education`/`isuo_last_month`≪T · ЄДЕБО expelled без поновлення |
| Виплата надходить, **медпотреби не забезпечені** | eHealth decl='terminated' · immunization='not_done' · хронік без encounters. *(C4=WALLED → лише push/PSI-сигнал)* |
| Виплата надходить, дитина **не проживає з отримувачем / занедбаність** | ЄІАС СЖО='так' · ВПО actual_residence≠адреса отримувача · 116111 «занедбаність» · ПФУ опікун безробітний (мотив утримати кошти) |
| **Опікун не звітує** / звіт не підтверджує цільові витрати | ЄІССС опік.виплата активна · відсутній річний звіт опікуна (ЦК ст.72, до 1 лютого) — **поза реєстрами, паперовий облік ССД** · ЦБІ дитина-інвалід (вищий обсяг для зловживання) |

**Контр-сигнали проти false-positive:** активна декларація/encounter, поновлене зарахування, свіжий residence_check, наявний звіт опікуна, виплата на спецкарту 2026 (MCC вже унеможливлює нецільову готівку).

## 2.4 Правова практика детекції (3 канали — лише частина автоматична)

1. **Мінфін-верифікація** (1865-IX, ПКМУ №136): авто-крос-звірка реципієнтів проти ЄДДР/зайнятості/майна/банків/ПФУ; на «розбіжність» інформує ПФУ/Мінсоц для зупинення. **Саме це ловить «виплата мертвій дитині», не ССД.**
2. **ПФУ фізична ідентифікація** (щорічна): перевіряє, що ОТРИМУВАЧ (батько/опікун) живий — не дитину.
3. **ССД/орган опіки — людський, звітно-інспекційний:** (а) звіт опікуна про витрачені суми (ЦК ст.72); (б) **інспекційне відвідування цільового витрачання аліментів** (Наказ Мінсоц №1713, z0102-19) — **запускається ВИКЛЮЧНО за заявою платника аліментів без заборгованості, НЕ автоматично/не за сигналом системи**; наслідок — позов СК ст.186/187 (до 50% на особистий рахунок дитини), не кримінал.

## 2.5 НОВИЙ індикатор — `M1_fin_misuse`

**Тип:** **cross-cluster (PSI на C1)** — перетинає C2 (ЄІССС/ПФУ-виплати) × C1 (ЄІАС влаштування/СЖО) × C0 (ЄДДР смерть/резиденція) × C3/C4 (освіта/медицина як earmarked-need). **Правовий гейт:** жодного власного читання виплатних реєстрів — для DIRECT-ноги потрібен **спожитий «розбіжність»-сигнал Мінфін/ПФУ через Трембіту**; proxy-нога рахується на даних, які ССД уже бачить (✅ ЄІАС/ВПО/освіта).

```python
# у _signals (C1-rollup; усі поля — сигнали, не сирі виплати):
s["payment_active"]        = bool   # СПОЖИТО від ПФУ/Мінфін-верифікації (🔆), НЕ власне читання
s["verif_mismatch"]        = bool   # «розбіжність реципієнта» з Мінфін-платформи
s["child_deceased"]        = bool   # ЄДДР death на UNZR дитини
s["placement_institution"] = bool   # ЄІАС Placement_form='інтернат'
s["recipient_ne_carer"]    = bool   # ЄІССС.recipient_rnokpp != ЄІАС.guardian_rnokpp (потребує поля — 2.6)
s["earmarked_need_unmet"]  = s["out_of_education"] or s["missed_checkup"] or s["ssd_low_income"]
s["guardian_unemployed"]   = s["pfu_unemployed"]   # мотив-вісь, не тригер

# у detect_entity:
direct = s["verif_mismatch"] or (s["payment_active"] and s["child_deceased"]) \
         or (s["payment_active"] and s["placement_institution"]) \
         or (s["recipient_ne_carer"] and s["payment_active"])
proxy  = s["payment_active"] and s["earmarked_need_unmet"] \
         and (s["ssd_present"] or s["guardian_unemployed"])

if direct:
    # доконаний факт / спожита розбіжність — НЕ потребує PSI≥2; WALLED-ноги (eHealth) не входять
    ev = ["EISSS"] + (["EDDR"] if s["child_deceased"] else []) \
         + (["DITY"] if s["placement_institution"] or s["recipient_ne_carer"] else []) \
         + (["DRRP"] if s["housing_alienation"] else [])
    add("M1_fin_misuse", ev, s["ssd_open_month"])
elif proxy and (s_clusters >= 2):          # importance-gate §5.3: ≥2 кластери
    ev = ["EISSS","DITY"] + (["AIKOM"] if s["out_of_education"] else [])
    add("M1_fin_misuse", ev, s["ssd_open_month"])   # acuity нижча; role=context
```

- **W9 лишається окремим** (відчуження житла) — `M1` додає його доказовою ногою, не дублює.
- DIRECT-нога не маркує намір (це юр.факт/спожита розбіжність); PROXY-нога — лише «earmarked-потреба не забезпечена», що **не доводить** вилучення коштів → нижча acuity, обовʼязковий людський контроль (інспекція №1713 / звіт опікуна).

## 2.6 Як сімейний граф покращує `M1`

| Граф дає | Покращення M1 |
|---|---|
| **recipient vs actual-carer mismatch** | граф знає `guardian`-вузол (ЄІАС) і фактичного carer; якщо ЄІССС експонує recipient_rnokpp → DIRECT-нога `recipient_ne_carer` (зараз `emit_eisss` має лише payout_account_iban+rnokpp_child, отримувач відсутній — **claim-to-verify**) |
| **placement-in-care ребро** | конфлікт «дитина в інтернаті ↔ опік.виплата фізособі» стає графовим інваріантом, не ad-hoc join |
| **household_churn / sibling_in_care** | підсилює PROXY (нестабільне household + активна виплата = вищий пріоритет інспекції), гейтить FP |
| **guardian_unemployed** | мотив-вісь (role=context), ніколи не sole trigger |
| **death-ребро** | живить `child_deceased` хард-несумісність (детектує Мінфін; Lastivka споживає) |

---

## Файли, яких торкається дизайн
- `lastivka/detection.py` — `_signals` (household-rollup ключі + M1-сигнали), `detect_entity` (модифікатори W6/F3/P1/F1 + `M1_fin_misuse`).
- `lastivka/entity.py` — `Child` має `mother_rnokpp/father_rnokpp/family_type`; розширити household/sibling-латентами в `realmodel.py`.
- `lastivka/privacy.py` — `psi_tokens/psi_membership` (крос-sibling resolution на C1).
- `lastivka/emitters/` — `emit_eisss` **бракує recipient_rnokpp** → блокує DIRECT-ногу `recipient_ne_carer`; ПФУ-emit моделює лише безробіття, не виплати.
- `docs/LRA_DESIGN.md` — C0 розширити household-ребрами; C1 = збірка графа + PSI §5.
- `lastivka/crossborder.py` — EE RAHV тримає ті самі family-edges по isikukood; cohabitation-misuse EE = той самий proxy; УНЗР≠isikukood → лише PPRL-сигнал.

## Застереження для журі (не приховувати)
1. ЄДДР тримає parentage-edge за статутом (ст.7 ч.1 п.6/п.14) — попереднє «лише per-person identity» спростовано; ДРАЦС = system of record.
2. SSD↔ДРАЦС parentage/marriage — «на запит у встановленому порядку», НЕ підтверджений авто-Трембіта-фід (death-нога працює).
3. ЄІССС склад-сімʼї структурований (4607-IX ст.17), але **читати для дитячого захисту немає правової підстави** (мінімізація ст.9(2)+ціль ст.13(3)) — лише L2-локальний сигнал через PSI; поле «новий партнер/співмешканець» **не підтверджено**.
4. parent_care_leaver / parent_incarcerated — **push/consent-only** (ЄРДР=WALLED ст.222; банк сиріт трекає особу як кол. дитину, lapse у 23 р.; пост-вирок — судимість-витяг/реєстр засуджених за запитом).
5. Більшість DIRECT-фін-несумісностей детектує **Мінфін-верифікація + ПФУ-фізідентифікація**, не ССД — Lastivka СПОЖИВАЄ сигнал.
6. SDM-ваги (US-валідація) не переносити дефолтом на воєнний/ВПО-контекст; toxic-trio та Signs of Safety — лише UI-framing, ніколи auto-score.
