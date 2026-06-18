"""
Модуль 4 — Detection. На відновленій (матчингом) крос-реєстровій таймлінії
рахує формули порушень (перетин реєстрів) + change-point/dropout.
Повертає для кожної сутності перелік виявлених порушень з доказовими реєстрами,
місяцем onset і гостротою (acuity).
"""
from __future__ import annotations
from datetime import date


def _i(v, default=0):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def _f(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _b(v) -> bool:
    return str(v) in ("1", "True", "true")


def _month_index(date_str, start_year) -> int | None:
    if not date_str or date_str == "None":
        return None
    try:
        d = date.fromisoformat(str(date_str)[:10])
        return (d.year - start_year) * 12 + (d.month - 1)
    except ValueError:
        return None


def change_point(series: list[float]):
    """Найкраща точка зсуву середнього. Повертає (idx, magnitude, direction)."""
    n = len(series)
    if n < 4:
        return None, 0.0, 0
    best_idx, best_mag, best_dir = None, 0.0, 0
    for k in range(2, n - 1):
        before = sum(series[:k]) / k
        after = sum(series[k:]) / (n - k)
        mag = abs(after - before)
        if mag > best_mag:
            best_idx, best_mag, best_dir = k, mag, (1 if after > before else -1)
    return best_idx, best_mag, best_dir


def _acuity(onset: int | None, T: int) -> str:
    if onset is None:
        return "active"
    if onset >= T - 4:
        return "acute"
    if onset >= T // 2:
        return "active"
    return "chronic"


def _erdr_article(text):
    t = str(text or "")
    for a in ("149", "152", "156", "126-1"):
        if a in t:
            return a
    return None


def _childwar_status(text):
    t = str(text or "")
    if any(k in t for k in ("поранен", "контуз", "загибел")):
        return "injured"
    if any(k in t for k in ("залуч", "збройн")):
        return "militarized"
    if "депорт" in t:
        return "deported"
    if "втрат" in t:
        return "lost_parents"
    if "перемі" in t:
        return "displaced"
    return None


def _signals(ent, cfg) -> dict:
    sy = cfg["population"]["start_year"]
    T = cfg["population"]["months"]
    R = ent["rows_by_reg"]
    s = {"T": T}

    # ── ВПО (точні поля)
    vpo = R.get("VPO", [])
    s["has_idp"] = bool(vpo)
    s["idp_month"] = _month_index(vpo[0].get("displacement_date"), sy) if vpo else None
    s["reatt_school"] = bool(vpo[0].get("education_place")) if vpo else True
    s["reatt_doctor"] = (vpo[0].get("medical_needs") == "забезпечено") if vpo else True

    # ── ЄДЕБО
    edebo = R.get("EDEBO", [])
    s["school_exit"] = bool(edebo) and edebo[0].get("study_status") in ("transferred", "expelled")
    s["exit_month"] = _month_index(edebo[0].get("status_effective_date"), sy) if edebo else None
    s["enrolled_ever"] = bool(edebo)
    s["edebo_inclusive"] = bool(edebo) and bool(edebo[0].get("special_category"))

    # ── АІКОМ (відвідуваність/оцінки) — change-point + dropout
    aikom = sorted(R.get("AIKOM", []), key=lambda r: r.get("attendance_period", ""))
    absc = [_i(r.get("missed_lessons_count")) for r in aikom]
    gpa = [_f(r.get("score_12")) for r in aikom]
    _, cp_mag, cp_dir = change_point(absc)
    _, g_mag, g_dir = change_point(gpa)
    s["absence_spike"] = cp_mag >= 4 and cp_dir > 0
    s["gpa_drop"] = g_mag >= 2 and g_dir < 0
    s["anti_bullying"] = any(_b(r.get("anti_bullying_commission")) for r in aikom)
    s["out_of_education"] = any(_b(r.get("out_of_education_flag")) for r in aikom)
    s["isuo_last_month"] = None
    if aikom:
        last = aikom[-1].get("attendance_period")
        try:
            y, m = map(int, last.split("-"))
            s["isuo_last_month"] = (y - sy) * 12 + (m - 1)
        except (ValueError, AttributeError):
            pass

    # ── eHealth (resource_type: person/declaration/encounter/condition/immunization)
    eh = R.get("EHEALTH", [])
    decl = [r for r in eh if r.get("resource_type") == "declaration"]
    s["decl_terminated"] = bool(decl) and decl[0].get("status") == "terminated"
    s["decl_end_month"] = _month_index(decl[0].get("end_date"), sy) if decl else None
    s["has_chronic"] = any(r.get("condition_code") == "chronic" for r in eh)
    s["missed_checkup"] = any(r.get("resource_type") == "immunization" and r.get("status") == "not_done"
                              for r in eh)
    traumas = [r for r in eh if r.get("condition_category") == "trauma"]
    s["trauma_present"] = bool(traumas)
    s["trauma_repeat"] = any(_b(r.get("is_repeat")) for r in traumas) or len(traumas) >= 2
    s["psych_present"] = any(r.get("condition_category") == "psych" for r in eh)

    # ── «Діти війни»
    cw = R.get("CHILDWAR", [])
    s["childwar_status"] = _childwar_status(cw[0].get("status_category")) if cw else None

    # ── ССД / «Діти»
    dity = R.get("DITY", [])
    s["ssd_present"] = bool(dity)
    s["ssd_status"] = (dity[0].get("child_status") if dity else None)
    s["ssd_unaccompanied"] = bool(dity) and "без супроводу" in str(dity[0].get("child_status", ""))
    s["ssd_low_income"] = bool(dity) and dity[0].get("difficult_life_circumstances") == "так"
    s["ssd_open_month"] = _month_index(dity[0].get("primary_registration_date"), sy) if dity else None

    # ── ДРАЦС (смерть батька/матері)
    dracs = R.get("DRACS", [])
    s["parent_death"] = any(r.get("act_type") == "смерть" for r in dracs)

    # ── ЄРДР
    erdr = R.get("ERDR", [])
    s["erdr_article"] = _erdr_article(erdr[0].get("preliminary_legal_qualification")) if erdr else None
    s["erdr_month"] = _month_index(erdr[0].get("register_entry_datetime"), sy) if erdr else None

    # ── ДН-реєстр + суд + інвалідність
    s["police_calls"] = len(R.get("DV", []))
    s["dv_witness"] = any(r.get("child_role") == "свідок" for r in R.get("DV", []))
    s["court_deprivation"] = any("батьк" in str(r.get("case_category", "")) for r in R.get("EDRSR", []))
    s["has_disability"] = bool(R.get("CBI_DISABILITY"))

    # ── нові реєстри: ДРРП (житло), гарячі лінії, ПФУ, СКАЙД
    s["housing_alienation"] = any(r.get("child_residence_alienation") == "так" for r in R.get("DRRP", []))
    hot = R.get("HOTLINE", [])
    s["hotline_present"] = bool(hot)
    s["hotline_psych"] = any(r.get("violence_type") == "психологічне" for r in hot)
    s["pfu_unemployed"] = any(r.get("employment_status_indicator") == "безробітний" for r in R.get("PFU", []))
    s["skaid_present"] = bool(R.get("SKAID"))
    s["dv_psych"] = any(r.get("form_of_violence") == "психологічне" for r in R.get("DV", []))

    # ── сімейний граф (C1-rollup із familygraph.rollup; інертні дефолти, якщо rollup не запущено)
    s["sibling_in_care"] = bool(ent.get("sibling_in_care"))
    s["sibling_prior_violation"] = set(ent.get("sibling_prior_violation") or [])
    s["parent_incarcerated"] = bool(ent.get("parent_incarcerated", False))  # push-only, НІКОЛИ з ЄРДР
    s["parent_criminal"] = bool(ent.get("parent_criminal", False))          # факт-судимості, push/post-conviction
    s["parent_addiction"] = bool(ent.get("parent_addiction", False))        # медтаємниця: факт не зміст, push/consent
    s["parent_mental_health"] = bool(ent.get("parent_mental_health", False))  # медтаємниця: факт не зміст, push/consent
    s["new_cohabitant_recent"] = bool(ent.get("new_cohabitant_recent"))
    s["kinship_care"] = bool(ent.get("kinship_care"))
    s["household_churn"] = int(ent.get("household_churn", 0))
    s["single_parent_unemployed"] = bool(ent.get("single_parent_unemployed"))
    s["household_risk_density"] = float(ent.get("household_risk_density", 0.0))

    bd = ent.get("birth_date")
    s["age_end"] = None
    if bd and bd != "None":
        try:
            b = date.fromisoformat(str(bd)[:10])
            s["age_end"] = (sy + (T - 1) // 12) - b.year
        except ValueError:
            pass
    return s


def _earliest(*months):
    vals = [m for m in months if m is not None]
    return min(vals) if vals else None


def detect_entity(ent, cfg) -> list[dict]:
    s = _signals(ent, cfg)
    T = s["T"]
    found = []

    def add(vid, evidence, onset):
        found.append({"violation": vid, "evidence": sorted(set(evidence)),
                      "onset_month": onset, "acuity": _acuity(onset, T)})

    school_age = s["age_end"] is None or 6 <= s["age_end"] <= 17
    # dropout = тиша в АІКОМ задовго до кінця (НЕ через випуск зі школи у 18 р.)
    isuo_dropout = school_age and s["isuo_last_month"] is not None and s["isuo_last_month"] < T - 3
    w3_sig = s["school_exit"] or isuo_dropout
    w8_sig = (s["decl_terminated"] or s["missed_checkup"]) and s["has_chronic"]
    w2_sig = s["psych_present"]

    # W1 Вимушене переміщення (ВПО + обрив сервісу: освіта, або медицина не через нехтування)
    w8_displacement = w8_sig and not s["ssd_low_income"]
    if s["has_idp"] and (w3_sig or w8_displacement):
        ev = ["VPO"] + (["EDEBO"] if s["school_exit"] else []) + \
             (["EHEALTH"] if w8_displacement else []) + (["CHILDWAR"] if s["childwar_status"] else [])
        add("W1_displacement", ev, _earliest(s["idp_month"], s["exit_month"]))

    # W3 Поза освітою (вихід зі школи АБО тривала тиша відвідуваності)
    if school_age and (s["enrolled_ever"] or s["isuo_last_month"] is not None) and w3_sig:
        ev = (["EDEBO"] if s["school_exit"] else []) + (["AIKOM"] if s["isuo_last_month"] is not None else [])
        add("W3_out_of_education", ev or ["EDEBO"], _earliest(s["exit_month"]))

    # W8 Обмеження доступу до медицини (хронік + обрив декларації + переміщення, не нехтування)
    # Guard: догляд поновлено в новому місці (зміна лікаря) і немає корроборації → не відмова в доступі
    w8_care_back = s["reatt_doctor"] and not (
        s["sibling_prior_violation"] or s["police_calls"] or s["dv_psych"]
        or s["parent_incarcerated"] or s["parent_criminal"]
        or s["parent_addiction"] or s["parent_mental_health"])
    if w8_sig and s["decl_terminated"] and s["has_idp"] and not s["ssd_low_income"] and not w8_care_back:
        ev = ["EHEALTH"] + (["VPO"] if not s["reatt_doctor"] else [])
        add("W8_medical_access", ev, s["decl_end_month"])

    # W6 Сирітство / втрата опіки (смерть батьків АБО рішення суду) + облік ССД
    if (s["parent_death"] or s["court_deprivation"]) and s["ssd_present"]:
        ev = (["DRACS"] if s["parent_death"] else []) + (["EDRSR"] if s["court_deprivation"] else []) + ["DITY"]
        add("W6_orphanhood", ev, s["ssd_open_month"])

    # W5 Депортація [immediate] — лише за статусом «депортована» (без супроводу ≠ депортована)
    if s["childwar_status"] == "deported":
        ev = ["CHILDWAR"] + (["DITY"] if s["ssd_present"] else [])
        add("W5_deportation", ev, s["ssd_open_month"])

    # W10 Мілітаризація [immediate] — дитина залучена до збройних формувань / у зоні бойових дій
    if s["childwar_status"] == "militarized":
        ev = ["CHILDWAR"] + (["DITY"] if s["ssd_present"] else [])
        add("W10_militarization", ev, s["ssd_open_month"])

    # W4 Загибель / поранення [immediate] — дитина постраждала від бойових дій
    if s["childwar_status"] == "injured":
        ev = ["CHILDWAR"] + (["DITY"] if s["ssd_present"] else [])
        add("W4_death_injury", ev, s["ssd_open_month"])

    # W7 Торгівля людьми [immediate] — за провадженням ЄРДР ст.149
    if s["erdr_article"] == "149":
        ev = ["ERDR"] + (["DITY"] if s["ssd_present"] else [])
        add("W7_trafficking", ev, _earliest(s["erdr_month"], s["ssd_open_month"]))

    # F3 Нехтування потребами
    if s["missed_checkup"] and (s["absence_spike"] or s["isuo_last_month"] is not None) and s["ssd_low_income"]:
        add("F3_neglect", ["EHEALTH", "AIKOM", "DITY"], s["ssd_open_month"])

    # P1 Фізичне насильство вдома (повторні травми + виклики поліції / провадження 126-1)
    if s["trauma_repeat"] and (s["police_calls"] > 0 or s["erdr_article"] == "126-1"):
        ev = ["EHEALTH"] + (["DV"] if s["police_calls"] else []) + \
             (["ERDR"] if s["erdr_article"] == "126-1" else []) + (["DITY"] if s["ssd_present"] else [])
        add("P1_physical_home", ev, s["erdr_month"])

    # E1 Булінг
    # psych сам по собі (генералізована тривога) НЕ корроборує булінг — benign-двійник.
    # Потрібна комісія (anti_bullying) АБО psych + незалежна household-корроборація ризику.
    e1_corrob = (s["police_calls"] > 0 or s["dv_psych"] or bool(s["sibling_prior_violation"])
                 or s["parent_criminal"] or s["parent_incarcerated"]
                 or s["parent_addiction"] or s["parent_mental_health"])
    if s["absence_spike"] and s["gpa_drop"] and (s["anti_bullying"] or (s["psych_present"] and e1_corrob)):
        ev = ["AIKOM"] + (["EHEALTH"] if s["psych_present"] else [])
        add("E1_bullying", ev, None)

    # F4 Дитяча праця (систематичні невиправдані пропуски без ознак булінгу/нехтування/відсіву)
    # АУДИТ-ВИСНОВОК: illness-absence нерозрізнювана від labor-absence на рівні реєстрів. Генератор
    # тепер моделює illness-driven пропуски (realmodel.inject_illness_confounders) — і гейт довів, що
    # БУДЬ-ЯКЕ придушення F4 за has_chronic/disability ріже recall (−5.7%), тобто ПРОПУСКАЄ справжню
    # дитячу працю хворих дітей (FN). Тож НЕ придушуємо: краще FP+людина, ніж FN. Конфаундер
    # пом'якшується інтейк-корроборацією (гаряча лінія/школа) та рішенням Комісії. Див. out/audit/report.md.
    if (s["absence_spike"] and not w3_sig and not s["missed_checkup"]
            and not s["psych_present"] and not s["anti_bullying"]):
        add("F4_child_labor", ["AIKOM"], None)

    # E4 Обмеження доступу до інклюзивної освіти (інвалідність + немає інклюзивного супроводу)
    if s["has_disability"] and school_age and not s["edebo_inclusive"]:
        ev = ["CBI_DISABILITY"] + (["EDEBO"] if s["enrolled_ever"] else [])
        add("E4_inclusion", ev, None)

    # F6 Сексуальне насильство [immediate] — за провадженням ЄРДР ст.152
    if s["erdr_article"] == "152":
        add("F6_sexual_abuse", ["ERDR"], s["erdr_month"])

    # W9 Порушення права на ідентичність (відчуження житла дитини без дозволу опіки)
    if s["housing_alienation"]:
        add("W9_identity", ["DRRP", "EDDR"], None)

    # F1 Психологічне насильство в сім'ї (гаряча лінія / реєстр ДН (психологічне) + психолог/облік)
    found_ids = {f["violation"] for f in found}
    if ((s["hotline_psych"] or s["dv_psych"]) and (s["psych_present"] or s["ssd_present"])
            and not (found_ids & {"P1_physical_home", "F6_sexual_abuse"})):
        ev = (["HOTLINE"] if s["hotline_psych"] else []) + (["DV"] if s["dv_psych"] else []) + \
             (["EHEALTH"] if s["psych_present"] else []) + (["DITY"] if s["ssd_present"] else [])
        add("F1_psych_violence", ev, None)

    # F5 Свідок домашнього насильства — дитина у домогосподарстві з ДН, але НЕ пряма жертва
    found_ids = {f["violation"] for f in found}
    if s["dv_witness"] and not (found_ids & {"P1_physical_home", "F1_psych_violence", "F6_sexual_abuse"}):
        ev = ["DV"] + (["DITY"] if s["ssd_present"] else [])
        add("F5_dv_witness", ev, None)

    # W2 Психотравма — в кінці, ЛИШЕ якщо немає іншого пояснення (насильство/булінг/F1)
    found_ids = {f["violation"] for f in found}
    abuse_related = {"P1_physical_home", "F6_sexual_abuse", "W7_trafficking", "E1_bullying", "F1_psych_violence"}
    if s["psych_present"] and not (found_ids & abuse_related):
        ev = ["EHEALTH"] + (["CHILDWAR"] if s["childwar_status"] else [])
        add("W2_psych_trauma", ev, None)

    # ── сімейний граф: КОРРОБОРАЦІЯ + ЕСКАЛАЦІЯ (набір порушень НЕ змінюється) ──
    dens = s.get("household_risk_density", 0.0)
    fam_targets = {"W6_orphanhood", "F3_neglect", "P1_physical_home", "F1_psych_violence"}
    for f in found:
        if f["violation"] not in fam_targets:
            continue
        corr = []
        if s.get("sibling_in_care"):
            corr.append("sibling_in_care")
        if f["violation"] == "F3_neglect" and s.get("sibling_prior_violation"):
            corr.append("sibling_prior_violation")     # рецидив household: evidenced, не лише бідність
        if f["violation"] in ("P1_physical_home", "F1_psych_violence") and s.get("new_cohabitant_recent"):
            corr.append("new_cohabitant_recent")       # role=context, не sole-trigger
        if corr:
            f["household_corroboration"] = corr
        if dens >= 0.5:
            f["escalated"] = True

    # ── батьківсько-сімейна вісь ризику (dimension=parental): превентивні кейси ──
    # Закриває §7: дитина з сімейним ризиком, але БЕЗ власного порушення, тепер досяжна.
    # Лише СПОСТЕРЕЖУВАНІ сигнали; батьківське завжди нижче за дитячі тяжкості (→ «спостереження»).
    found_ids = {f["violation"] for f in found}

    def add_parental(code, evidence):
        found.append({"violation": code, "evidence": sorted(set(evidence)),
                      "onset_month": None, "acuity": "active", "dimension": "parental"})

    if s.get("sibling_in_care"):
        add_parental("P_sibling_in_care", ["DITY"])
    if s.get("sibling_prior_violation"):
        add_parental("P_sibling_violation", ["DITY"])
    # позбавлення прав батька без сирітства дитини = ризик-контекст (не дублюємо W6)
    if s.get("court_deprivation") and "W6_orphanhood" not in found_ids:
        add_parental("P_parent_rights", ["EDRSR"])
    # кримінал батька — лише факт-судимості (push/post-conviction); ЄРДР НІКОЛИ не traverse-иться
    if s.get("parent_criminal") or s.get("parent_incarcerated"):
        add_parental("P_parent_criminal", ["push"])
    # залежність / психічне здоровʼя — медтаємниця: факт не зміст (push/consent булеан), не діагноз
    if s.get("parent_addiction"):
        add_parental("P_parent_addiction", ["push"])
    if s.get("parent_mental_health"):
        add_parental("P_parent_mh", ["push"])

    # ── КОМПАУНДНИЙ household-watch: дифузний ризик у СУМІ факторів без жодного тригера ──
    # Закриває FN, виявлений аудитом: дитина з кількома слабкими факторами (щільність ризику
    # сім'ї ≥0.5, АБО одинокий-безробітний + новий-співмешканець/churn), де жоден сигнал
    # поодинці не дає порушення і немає сиблінг/parent-сигналу — раніше зникала з черги повністю.
    # Тепер досяжна як «спостереження» (T2). dimension=parental → виключено з F1.
    child_found = any(f.get("dimension") != "parental" for f in found)
    other_parental = any(f.get("dimension") == "parental" for f in found)
    compound = (dens >= 0.5
                or (s.get("single_parent_unemployed")
                    and (s.get("new_cohabitant_recent") or s.get("household_churn", 0) >= 1)))
    if compound and not child_found and not other_parental:
        add_parental("P_household_watch", ["DITY", "PFU"])

    return found


def detect_all(entities, cfg) -> list[dict]:
    out = []
    for ent in entities:
        det = detect_entity(ent, cfg)
        if det:
            out.append({"entity_id": ent["entity_id"], "unzr": ent["unzr"],
                        "pib": ent["pib"], "birth_date": ent["birth_date"],
                        "n_registries": ent["n_registries"], "detections": det})
    return out
