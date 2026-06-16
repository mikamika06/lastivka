"""
Модуль 2 — Registry emitters. Кожен реєстр НЕЗАЛЕЖНО (силос) читає прихований стан
дитини й емітує записи у власну таблицю з полями, наближеними до реальних держреєстрів,
із шумом і рівнем доступу (access_level: 1 судова ухвала / 2 ССД через Трембіту / 3 публічно).

Записи НЕ містять god-view internal_id — лише УНЗР (коли є) + ПІБ + дата народження.
ID записів випадкові (різні namespace на реєстр) -> не зливаються тривіально.
"""
from __future__ import annotations
from datetime import date, timedelta

from ..entity import Child
from ..names import corrupt_name

# ── метадані реєстрів (реальні Trembita-ідентифікатори зі словника) ──
REGISTRIES = [
    {"code": "DRACS", "ua": "ДРАЦС (акти цив. стану)", "member": "00015622",
     "subsystem": "3_MJU_DRACS_prod", "owner": "Мінʼюст", "db": "dracs.db", "access": 2},
    {"code": "EDDR", "ua": "ЄДДР (демографічний реєстр)", "member": "00032684",
     "subsystem": "20_DMS_EDDR_prod", "owner": "МВС", "db": "eddr.db", "access": 2},
    {"code": "EHEALTH", "ua": "eHealth / ЕСОЗ", "member": "42032422",
     "subsystem": "50_ESOZ_prod_ME_EHR", "owner": "НСЗУ", "db": "ehealth.db", "access": 2},
    {"code": "EDEBO", "ua": "ЄДЕБО (освіта)", "member": "38621185",
     "subsystem": "38_EDBO_prod", "owner": "МОН", "db": "edebo.db", "access": 2},
    {"code": "ISUO", "ua": "ІСУО/AIKOM (відвідуваність)", "member": "38621185",
     "subsystem": "38_AIKOM_prod", "owner": "МОН", "db": "isuo.db", "access": 2},
    {"code": "VPO", "ua": "Реєстр ВПО", "member": "37567866",
     "subsystem": "85_OISSS_VPO_prod", "owner": "Мінсоцполітики", "db": "vpo.db", "access": 2},
    {"code": "CHILDWAR", "ua": "«Діти війни»", "member": "37567866",
     "subsystem": "childrenofwar_prod", "owner": "Нацсоцслужба", "db": "childwar.db", "access": 2},
    {"code": "SSD", "ua": "ССД / ЕІАС «Діти»", "member": "37567866",
     "subsystem": "85_OISSS_DITY_prod", "owner": "Нацсоцслужба", "db": "ssd.db", "access": 2},
    {"code": "ERDR", "ua": "ЄРДР (досудові розслідування)", "member": "00034051",
     "subsystem": "ERDR_prod", "owner": "Офіс Генпрокурора", "db": "erdr.db", "access": 1},
    {"code": "VIOLENCE", "ua": "Реєстр домашнього насильства", "member": "00032684",
     "subsystem": "20_MVS_DN_prod", "owner": "МВС/Мінсоц", "db": "violence.db", "access": 2},
]
REG_BY_CODE = {r["code"]: r for r in REGISTRIES}

_ENCOUNTER_ACCESS = {"psych": 1, "trauma": 1, "combat_injury": 1, "addiction": 1,
                     "checkup": 2, "vaccination": 2, "chronic": 2}


# ── допоміжні ──
def sim_start(cfg) -> date:
    return date(cfg["population"]["start_year"], 1, 1)


def month_date(cfg, t: int) -> date:
    s = sim_start(cfg)
    y = s.year + (s.month - 1 + t) // 12
    m = (s.month - 1 + t) % 12 + 1
    return date(y, m, 15)


def _ident(child: Child, cfg, rng, keep_unzr_prob_extra=0.0) -> dict:
    nv = cfg["noise"]["name_variation_rate"]
    unzr = child.unzr
    if rng.random() < cfg["noise"]["no_unzr_rate"] - keep_unzr_prob_extra:
        unzr = None
    return {
        "last_name": corrupt_name(child.last_name, rng, nv),
        "first_name": corrupt_name(child.first_name, rng, nv),
        "second_name": corrupt_name(child.second_name, rng, nv),
        "birth_date": child.birth_date.isoformat(),
        "unzr": unzr,
    }


def _first_month(child, pred):
    for t, s in enumerate(child.states):
        if pred(s):
            return t
    return None


def _rid(rng, n=10):
    return str(rng.randint(10 ** (n - 1), 10 ** n - 1))


# ── R1 ДРАЦС ──
def emit_dracs(child, cfg, rng):
    rows = []
    rows.append({**_ident(child, cfg, rng, keep_unzr_prob_extra=0.07),  # акт народження майже завжди з УНЗР
                 "act_id": _rid(rng, 8), "act_type": "BIRTH", "role": "child",
                 "birth_place": child.settlement,
                 "cert_series": rng.choice(["I-АБ", "I-БК", "II-АН", "I-ВЛ"]),
                 "cert_number": _rid(rng, 6),
                 "reg_date": (child.birth_date + timedelta(days=rng.randint(2, 20))).isoformat(),
                 "access_level": 2})
    if "W6_orphanhood" in child.labels:  # смерть одного з батьків
        m = child.labels["W6_orphanhood"]
        rows.append({"last_name": child.last_name, "first_name": "—", "second_name": "—",
                     "birth_date": None, "unzr": None,
                     "act_id": _rid(rng, 8), "act_type": "DEATH", "role": "parent",
                     "birth_place": child.settlement, "cert_series": None, "cert_number": _rid(rng, 6),
                     "reg_date": month_date(cfg, m).isoformat(),
                     "linked_child_unzr": child.unzr, "access_level": 2})
    return rows


# ── R2 ЄДДР ──
def emit_eddr(child, cfg, rng):
    age0 = child.age_at(sim_start(cfg), 0)
    doc_type = "ID_CARD" if age0 >= 14 else "BIRTH_CERT"
    return [{**_ident(child, cfg, rng),
             "rnokpp": child.rnokpp,
             "doc_type": doc_type,
             "doc_series": None if doc_type == "ID_CARD" else rng.choice(["I-АБ", "II-БК"]),
             "doc_number": _rid(rng, 9),
             "citizenship": "UA",
             "registered_address": f"{child.oblast} обл., {child.settlement}",
             "access_level": 2}]


# ── R3 eHealth ──
def emit_ehealth(child, cfg, rng):
    rows = []
    ident = _ident(child, cfg, rng)
    lapse = _first_month(child, lambda s: s.health == "lapsed")
    # декларація з сімейним лікарем
    rows.append({**ident, "record_type": "DECLARATION", "declaration_id": _rid(rng, 10),
                 "doctor_id": _rid(rng, 6), "legal_entity_id": _rid(rng, 6),
                 "status": "terminated" if lapse is not None else "active",
                 "start_date": month_date(cfg, 0).isoformat(),
                 "end_date": month_date(cfg, lapse).isoformat() if lapse is not None else None,
                 "category": "declaration", "is_repeat": False, "is_unexplained": False,
                 "location_context": None, "done": None, "access_level": 2})
    T = cfg["population"]["months"]
    checkup_offset = child.internal_id % 6
    for t, s in enumerate(child.states):
        # планові огляди кожні 6 міс
        if t % 6 == checkup_offset:
            done = s.health == "active"
            rows.append({**ident, "record_type": "ENCOUNTER", "encounter_id": _rid(rng, 10),
                         "category": "chronic" if child.has_chronic else "checkup",
                         "date": month_date(cfg, t).isoformat(), "is_repeat": False,
                         "is_unexplained": False, "location_context": None,
                         "done": done, "access_level": 2})
        # психологічні звернення (лише за реальної травми/кризи, не за фоновим 'stressed')
        if s.safety in ("abuse_risk", "abuse_active") or s.family == "crisis":
            if rng.random() < 0.5:
                rows.append({**ident, "record_type": "ENCOUNTER", "encounter_id": _rid(rng, 10),
                             "category": "psych", "date": month_date(cfg, t).isoformat(),
                             "is_repeat": False, "is_unexplained": False,
                             "location_context": None, "done": True,
                             "access_level": _ENCOUNTER_ACCESS["psych"]})
        # травми (фізичне/сексуальне насильство)
        if s.safety == "abuse_active" and rng.random() < 0.5:
            prior = any(r.get("category") == "trauma" for r in rows)
            rows.append({**ident, "record_type": "ENCOUNTER", "encounter_id": _rid(rng, 10),
                         "category": "trauma", "date": month_date(cfg, t).isoformat(),
                         "is_repeat": prior, "is_unexplained": True,
                         "location_context": "home", "done": True,
                         "access_level": _ENCOUNTER_ACCESS["trauma"]})
    return rows


# ── R4 ЄДЕБО ──
def emit_edebo(child, cfg, rng):
    ever = any(s.school in ("enrolled", "at_risk", "dropped") for s in child.states)
    if not ever:
        return []
    drop = _first_month(child, lambda s: s.school == "dropped")
    displaced = any(s.residence in ("displaced", "abroad", "TOT") for s in child.states)
    if drop is not None:
        status = "transferred" if displaced else "expelled"
        exit_date = month_date(cfg, drop).isoformat()
    else:
        status, exit_date = "active", None
    return [{**_ident(child, cfg, rng),
             "rnokpp": child.rnokpp,
             "student_id": _rid(rng, 7),
             "institution_code": _rid(rng, 6),
             "institution_name": f"Заклад освіти, {child.settlement}",
             "study_status": status,
             "enrollment_date": month_date(cfg, 0).isoformat(),
             "exit_date": exit_date,
             "access_level": 2}]


# ── R5 ІСУО (відвідуваність/оцінки) ──
def emit_isuo(child, cfg, rng):
    rows = []
    ident = _ident(child, cfg, rng)
    bully = "E1_bullying" in child.labels
    bully_m = child.labels.get("E1_bullying")
    for t, s in enumerate(child.states):
        if s.school not in ("enrolled", "at_risk"):
            continue
        at_risk = s.school == "at_risk"
        rows.append({**ident, "student_id": _rid(rng, 7),
                     "period": month_date(cfg, t).strftime("%Y-%m"),
                     "absences_unexcused": rng.randint(4, 12) if at_risk else rng.randint(0, 2),
                     "gpa": round(rng.uniform(3.0, 6.0), 1) if at_risk else round(rng.uniform(7.0, 11.5), 1),
                     "behavior_withdrawn": at_risk and rng.random() < 0.5,
                     "behavior_aggression": at_risk and rng.random() < 0.3,
                     "class_changed": s.residence != "stable" and rng.random() < 0.3,
                     "anti_bullying_commission": bool(bully and bully_m is not None and t == bully_m + 1),
                     "access_level": 2})
    return rows


# ── R6 ВПО ──
def emit_vpo(child, cfg, rng):
    # ВПО = ВНУТРІШНЬО переміщені; депортовані за кордон сюди не потрапляють
    m = _first_month(child, lambda s: s.residence == "displaced")
    if m is None:
        return []
    reatt_school = any(s.school == "enrolled" for s in child.states[m + 1:])
    reatt_doc = any(s.health == "active" for s in child.states[m + 1:])
    origin = f"{child.oblast} обл."
    dest = rng.choice([o for o in cfg["oblasts"] if o != child.oblast])
    return [{**_ident(child, cfg, rng),
             "idp_cert_number": _rid(rng, 10),
             "status": "active",
             "origin_address": origin,
             "current_address": f"{dest} обл.",
             "displacement_date": month_date(cfg, m).isoformat(),
             "reattached_school": reatt_school,
             "reattached_doctor": reatt_doc,
             "access_level": 2}]


# ── R7 «Діти війни» ──
def emit_childwar(child, cfg, rng):
    status = None
    if "W5_deportation" in child.labels:
        status, m = "deported", child.labels["W5_deportation"]
    elif "W1_displacement" in child.labels:
        status, m = "displaced", child.labels["W1_displacement"]
    if status is None:
        return []
    sep = any(s.family == "separated" or s.protection == "unaccompanied" for s in child.states)
    return [{**_ident(child, cfg, rng),
             "record_id": _rid(rng, 8), "status": status, "region": child.oblast,
             "event_date": month_date(cfg, m).isoformat(),
             "guardian_link": "broken" if sep else "intact", "access_level": 2}]


# ── R8 ССД / «Діти» ──
def emit_ssd(child, cfg, rng):
    m = _first_month(child, lambda s: s.protection in ("observed", "in_care", "unaccompanied"))
    if m is None:
        return []
    prot = child.states[m].protection
    status = {"observed": "difficult_circumstances", "in_care": "no_parental_care",
              "unaccompanied": "unaccompanied"}[prot]
    fam = "low_income" if "F3_neglect" in child.labels else rng.choice(["—", "many_children"])
    return [{"last_name": child.last_name, "first_name": child.first_name,
             "second_name": child.second_name, "birth_date": child.birth_date.isoformat(),
             "unzr": child.unzr,  # ССД — ключовий, тримає УНЗР
             "case_id": _rid(rng, 8), "status": status, "family_type": fam,
             "in_institution": "intern" if prot == "in_care" and rng.random() < 0.5 else "none",
             "open_date": month_date(cfg, m).isoformat(), "access_level": 2}]


# ── R9 ЄРДР ──
def emit_erdr(child, cfg, rng):
    article = None
    if "W7_trafficking" in child.labels:
        article, m = "149", child.labels["W7_trafficking"]
    elif "F6_sexual_abuse" in child.labels:
        article, m = "152", child.labels["F6_sexual_abuse"]
    elif "P1_physical_home" in child.labels and rng.random() < 0.7:
        article, m = "126-1", child.labels["P1_physical_home"]
    if article is None:
        return []
    return [{"victim_pib_initials": f"{child.last_name} {child.first_name[0]}.",
             "victim_unzr": child.unzr,  # Рівень 1 — повні дані лише за ухвалою
             "proceeding_no": _rid(rng, 12), "article": article,
             "address": f"{child.oblast} обл., {child.settlement}",
             "status": "investigation", "open_date": month_date(cfg, m).isoformat(),
             "access_level": 1}]


# ── R10 Реєстр домашнього насильства / виклики ──
def emit_violence(child, cfg, rng):
    if "P1_physical_home" not in child.labels:
        return []
    m = child.labels["P1_physical_home"]
    rows = []
    for _ in range(rng.randint(1, 3)):
        dm = min(m + rng.randint(0, 4), cfg["population"]["months"] - 1)
        rows.append({**_ident(child, cfg, rng),
                     "incident_id": _rid(rng, 9),
                     "address": f"{child.oblast} обл., {child.settlement}",
                     "child_present": True, "source": "police",
                     "call_date": month_date(cfg, dm).isoformat(), "access_level": 2})
    return rows


EMITTERS = {
    "DRACS": emit_dracs, "EDDR": emit_eddr, "EHEALTH": emit_ehealth, "EDEBO": emit_edebo,
    "ISUO": emit_isuo, "VPO": emit_vpo, "CHILDWAR": emit_childwar, "SSD": emit_ssd,
    "ERDR": emit_erdr, "VIOLENCE": emit_violence,
}
