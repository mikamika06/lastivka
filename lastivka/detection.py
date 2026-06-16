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


def _signals(ent, cfg) -> dict:
    sy = cfg["population"]["start_year"]
    T = cfg["population"]["months"]
    R = ent["rows_by_reg"]
    s = {"T": T}

    # ── ВПО
    vpo = R.get("VPO", [])
    s["has_idp"] = bool(vpo)
    s["idp_month"] = _month_index(vpo[0].get("displacement_date"), sy) if vpo else None
    s["reatt_school"] = _b(vpo[0].get("reattached_school")) if vpo else True
    s["reatt_doctor"] = _b(vpo[0].get("reattached_doctor")) if vpo else True

    # ── ЄДЕБО
    edebo = R.get("EDEBO", [])
    s["school_exit"] = bool(edebo) and edebo[0].get("study_status") in ("transferred", "expelled")
    s["exit_month"] = _month_index(edebo[0].get("exit_date"), sy) if edebo else None
    s["enrolled_ever"] = bool(edebo)

    # ── ІСУО (відвідуваність/оцінки) — change-point + dropout
    isuo = sorted(R.get("ISUO", []), key=lambda r: r.get("period", ""))
    absc = [_i(r.get("absences_unexcused")) for r in isuo]
    gpa = [_f(r.get("gpa")) for r in isuo]
    cp_idx, cp_mag, cp_dir = change_point(absc)
    g_idx, g_mag, g_dir = change_point(gpa)
    s["absence_spike"] = cp_mag >= 3 and cp_dir > 0
    s["gpa_drop"] = g_mag >= 2 and g_dir < 0
    s["anti_bullying"] = any(_b(r.get("anti_bullying_commission")) for r in isuo)
    # dropout: останній період ІСУО задовго до кінця
    s["isuo_last_month"] = None
    if isuo:
        last = isuo[-1].get("period")
        try:
            y, m = map(int, last.split("-"))
            s["isuo_last_month"] = (y - sy) * 12 + (m - 1)
        except (ValueError, AttributeError):
            pass

    # ── eHealth
    eh = R.get("EHEALTH", [])
    decl = [r for r in eh if r.get("record_type") == "DECLARATION"]
    s["decl_terminated"] = bool(decl) and decl[0].get("status") == "terminated"
    s["decl_end_month"] = _month_index(decl[0].get("end_date"), sy) if decl else None
    s["has_chronic"] = any(r.get("category") == "chronic" for r in eh)
    s["missed_checkup"] = any(r.get("category") in ("checkup", "chronic") and not _b(r.get("done"))
                              for r in eh if r.get("record_type") == "ENCOUNTER")
    traumas = [r for r in eh if r.get("category") == "trauma"]
    s["trauma_present"] = bool(traumas)
    s["trauma_repeat"] = any(_b(r.get("is_repeat")) for r in traumas) or len(traumas) >= 2
    s["psych_present"] = any(r.get("category") == "psych" for r in eh)

    # ── інші реєстри
    cw = R.get("CHILDWAR", [])
    s["childwar_status"] = cw[0].get("status") if cw else None
    ssd = R.get("SSD", [])
    s["ssd_present"] = bool(ssd)
    s["ssd_status"] = ssd[0].get("status") if ssd else None
    s["ssd_low_income"] = bool(ssd) and ssd[0].get("family_type") == "low_income"
    s["ssd_open_month"] = _month_index(ssd[0].get("open_date"), sy) if ssd else None
    dracs = R.get("DRACS", [])
    s["parent_death"] = any(r.get("act_type") == "DEATH" for r in dracs)
    erdr = R.get("ERDR", [])
    s["erdr_article"] = erdr[0].get("article") if erdr else None
    s["erdr_month"] = _month_index(erdr[0].get("open_date"), sy) if erdr else None
    s["police_calls"] = len(R.get("VIOLENCE", []))

    # вік на кінець симуляції
    bd = ent.get("birth_date")
    s["age_end"] = None
    if bd and bd != "None":
        try:
            b = date.fromisoformat(str(bd)[:10])
            end_year = sy + (T - 1) // 12
            s["age_end"] = end_year - b.year
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

    # W1 Вимушене переміщення (ВПО + будь-який обрив сервісу або статус «Діти війни»)
    if s["has_idp"] and (s["school_exit"] or s["decl_terminated"] or s["childwar_status"]):
        ev = ["VPO"] + (["EDEBO"] if s["school_exit"] else []) + \
             (["EHEALTH"] if s["decl_terminated"] else []) + (["CHILDWAR"] if s["childwar_status"] else [])
        add("W1_displacement", ev, _earliest(s["idp_month"], s["exit_month"]))

    # W3 Поза освітою (вихід зі школи АБО обрив відвідуваності без активного зарахування)
    isuo_dropout = s["isuo_last_month"] is not None and s["isuo_last_month"] < T - 3
    if school_age and (s["enrolled_ever"] or s["isuo_last_month"] is not None) and (s["school_exit"] or isuo_dropout):
        ev = (["EDEBO"] if s["school_exit"] else []) + (["ISUO"] if s["isuo_last_month"] is not None else [])
        add("W3_out_of_education", ev or ["EDEBO"], _earliest(s["exit_month"]))

    # W8 Обмеження доступу до медицини (у контексті переміщення)
    if (s["decl_terminated"] or s["missed_checkup"]) and s["has_chronic"] and s["has_idp"]:
        ev = ["EHEALTH"] + (["VPO"] if not s["reatt_doctor"] else [])
        add("W8_medical_access", ev, s["decl_end_month"])

    # W6 Сирітство / втрата опіки
    if s["parent_death"] and s["ssd_present"]:
        add("W6_orphanhood", ["DRACS", "SSD"], s["ssd_open_month"])

    # W5 Депортація [immediate]
    if s["childwar_status"] == "deported" or (s["ssd_status"] == "unaccompanied" and s["childwar_status"]):
        ev = ["CHILDWAR"] + (["SSD"] if s["ssd_present"] else [])
        add("W5_deportation", ev, s["ssd_open_month"])

    # W7 Торгівля людьми [immediate] — за провадженням ЄРДР ст.149
    if s["erdr_article"] == "149":
        ev = ["ERDR"] + (["SSD"] if s["ssd_present"] else [])
        add("W7_trafficking", ev, _earliest(s["erdr_month"], s["ssd_open_month"]))

    # F3 Нехтування потребами
    if s["missed_checkup"] and (s["absence_spike"] or s["isuo_last_month"] is not None) and s["ssd_low_income"]:
        add("F3_neglect", ["EHEALTH", "ISUO", "SSD"], s["ssd_open_month"])

    # P1 Фізичне насильство вдома (повторні травми + виклики поліції / провадження 126-1)
    if s["trauma_repeat"] and (s["police_calls"] > 0 or s["erdr_article"] == "126-1"):
        ev = ["EHEALTH"] + (["VIOLENCE"] if s["police_calls"] else []) + \
             (["ERDR"] if s["erdr_article"] == "126-1" else []) + (["SSD"] if s["ssd_present"] else [])
        add("P1_physical_home", ev, s["erdr_month"])

    # E1 Булінг
    if s["absence_spike"] and s["gpa_drop"] and (s["psych_present"] or s["anti_bullying"]):
        ev = ["ISUO"] + (["EHEALTH"] if s["psych_present"] else [])
        add("E1_bullying", ev, None)

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
