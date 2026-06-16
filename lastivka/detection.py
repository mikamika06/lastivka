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
    s["court_deprivation"] = any("батьк" in str(r.get("case_category", "")) for r in R.get("EDRSR", []))
    s["has_disability"] = bool(R.get("CBI"))

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
    # dropout = тиша в АІКОМ задовго до кінця (дитина перестала відвідувати)
    isuo_dropout = s["isuo_last_month"] is not None and s["isuo_last_month"] < T - 3
    w3_sig = s["school_exit"] or isuo_dropout
    w8_sig = (s["decl_terminated"] or s["missed_checkup"]) and s["has_chronic"]
    w2_sig = s["psych_present"]

    # W1 Вимушене переміщення (ВПО + реальний обрив сервісу: освіта або медицина)
    if s["has_idp"] and (w3_sig or w8_sig):
        ev = ["VPO"] + (["EDEBO"] if s["school_exit"] else []) + \
             (["EHEALTH"] if w8_sig else []) + (["CHILDWAR"] if s["childwar_status"] else [])
        add("W1_displacement", ev, _earliest(s["idp_month"], s["exit_month"]))

    # W3 Поза освітою (вихід зі школи АБО тривала тиша відвідуваності)
    if school_age and (s["enrolled_ever"] or s["isuo_last_month"] is not None) and w3_sig:
        ev = (["EDEBO"] if s["school_exit"] else []) + (["AIKOM"] if s["isuo_last_month"] is not None else [])
        add("W3_out_of_education", ev or ["EDEBO"], _earliest(s["exit_month"]))

    # W8 Обмеження доступу до медицини (хронік + обрив декларації + контекст переміщення/фронту)
    if w8_sig and s["decl_terminated"] and s["has_idp"]:
        ev = ["EHEALTH"] + (["VPO"] if not s["reatt_doctor"] else [])
        add("W8_medical_access", ev, s["decl_end_month"])

    # W6 Сирітство / втрата опіки (смерть батьків АБО рішення суду) + облік ССД
    if (s["parent_death"] or s["court_deprivation"]) and s["ssd_present"]:
        ev = (["DRACS"] if s["parent_death"] else []) + (["EDRSR"] if s["court_deprivation"] else []) + ["DITY"]
        add("W6_orphanhood", ev, s["ssd_open_month"])

    # W5 Депортація [immediate]
    if s["childwar_status"] == "deported" or (s["ssd_unaccompanied"] and s["childwar_status"]):
        ev = ["CHILDWAR"] + (["DITY"] if s["ssd_present"] else [])
        add("W5_deportation", ev, s["ssd_open_month"])

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
    if s["absence_spike"] and s["gpa_drop"] and (s["psych_present"] or s["anti_bullying"]):
        ev = ["AIKOM"] + (["EHEALTH"] if s["psych_present"] else [])
        add("E1_bullying", ev, None)

    # F4 Дитяча праця (систематичні невиправдані пропуски без ознак булінгу/нехтування/відсіву)
    if (s["absence_spike"] and not w3_sig and not s["missed_checkup"]
            and not s["psych_present"] and not s["anti_bullying"]):
        add("F4_child_labor", ["AIKOM"], None)

    # E4 Обмеження доступу до інклюзивної освіти (інвалідність + немає інклюзивного супроводу)
    if s["has_disability"] and school_age and not s["edebo_inclusive"]:
        ev = ["CBI"] + (["EDEBO"] if s["enrolled_ever"] else [])
        add("E4_inclusion", ev, None)

    # F6 Сексуальне насильство [immediate] — за провадженням ЄРДР ст.152
    if s["erdr_article"] == "152":
        add("F6_sexual_abuse", ["ERDR"], s["erdr_month"])

    # W2 Психотравма — додаємо в кінці, ЛИШЕ якщо немає іншого пояснення (насильство/булінг)
    found_ids = {f["violation"] for f in found}
    abuse_related = {"P1_physical_home", "F6_sexual_abuse", "W7_trafficking", "E1_bullying"}
    if s["psych_present"] and not (found_ids & abuse_related):
        ev = ["EHEALTH"] + (["CHILDWAR"] if s["childwar_status"] else [])
        add("W2_psych_trauma", ev, None)

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
