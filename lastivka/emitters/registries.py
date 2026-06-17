"""
Модуль 2 — Registry emitters з ТОЧНИМИ схемами реальних держреєстрів України
(поля з законодавства/офіційних форм; див. docs/REGISTRY_SCHEMAS.md).
Кожен реєстр — окремий силос; назви полів РІЗНІ (як у реальних реєстрах),
тому матчинг використовує id_map. Записи не містять god-view id.
"""
from __future__ import annotations
from datetime import date, timedelta

from ..entity import Child
from ..names import corrupt_name

# Модульні константи для уникнення дублювання літералів
OWNER_MINSOC = "Мінсоцполітики"
COUNTRY_UA = "Україна"

# id_map: яке поле реєстру = яка роль ідентичності (для матчингу)
REGISTRIES = [
    {"code": "DRACS", "ua": "ДРАЦС — актовий запис про народження", "member": "00015622",
     "subsystem": "3_MJU_DRACS_prod", "owner": "Мінʼюст", "db": "dracs.db", "access": 2,
     "id_map": {"last": "surname_child", "first": "name_child", "second": "patronymic_child",
                "unzr": "child_unzr", "rnokpp": "child_rnokpp", "dob": "birth_date"}},
    {"code": "EDDR", "ua": "ЄДДР — демографічний реєстр", "member": "00032684",
     "subsystem": "20_DMS_EDDR_prod", "owner": "ДМС/МВС", "db": "eddr.db", "access": 2,
     "id_map": {"last": "surname", "first": "given_name", "second": "patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "birth_date"}},
    {"code": "EHEALTH", "ua": "eHealth / ЕСОЗ", "member": "42032422",
     "subsystem": "50_ESOZ_prod_ME_EHR", "owner": "НСЗУ", "db": "ehealth.db", "access": 1,
     "id_map": {"last": "last_name", "first": "first_name", "second": "second_name",
                "unzr": "unzr", "rnokpp": "tax_id", "dob": "birth_date"}},
    {"code": "EDEBO", "ua": "ЄДЕБО — освіта", "member": "38621185",
     "subsystem": "38_EDBO_prod", "owner": "МОН", "db": "edebo.db", "access": 2,
     "id_map": {"last": "surname", "first": "given_name", "second": "patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "birth_date"}},
    {"code": "AIKOM", "ua": "ІСУО/АІКОМ — відвідуваність/оцінки", "member": "38621185",
     "subsystem": "38_AIKOM_prod", "owner": "МОН", "db": "aikom.db", "access": 2,
     "id_map": {"last": "last_name", "first": "first_name", "second": "patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "birth_date"}},
    {"code": "VPO", "ua": "ЄІБД ВПО", "member": "37567866",
     "subsystem": "85_OISSS_VPO_prod", "owner": OWNER_MINSOC, "db": "vpo.db", "access": 2,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "unzr", "rnokpp": "child_rnokpp", "dob": "child_birth_date"}},
    {"code": "CHILDWAR", "ua": "«Діти війни»", "member": "37567866",
     "subsystem": "childrenofwar_prod", "owner": "Нацсоцслужба", "db": "childwar.db", "access": 2,
     "id_map": {"last": "last_name", "first": "first_name", "second": "patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "birth_date"}},
    {"code": "DITY", "ua": "ЄІАС «Діти» / ССД", "member": "37567866",
     "subsystem": "85_OISSS_DITY_prod", "owner": "Нацсоцслужба", "db": "dity.db", "access": 2,
     "id_map": {"last": "surname", "first": "given_name", "second": "patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "birth_date"}},
    {"code": "ERDR", "ua": "ЄРДР — досудові розслідування", "member": "00034051",
     "subsystem": "ERDR_prod", "owner": "Офіс Генпрокурора", "db": "erdr.db", "access": 1,
     "id_map": {"last": "victim_last_name", "first": "victim_first_name", "second": "victim_patronymic",
                "unzr": "victim_unzr", "rnokpp": "victim_rnokpp", "dob": "victim_date_of_birth"}},
    {"code": "DV", "ua": "Реєстр випадків домашнього насильства", "member": "00032684",
     "subsystem": "20_MVS_DN_prod", "owner": "МВС/Мінсоц", "db": "dv.db", "access": 2,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "child_unzr", "rnokpp": "child_rnokpp", "dob": "child_date_of_birth"}},
    {"code": "CBI", "ua": "Центр. банк даних з інвалідності", "member": "37567866",
     "subsystem": "CBI_prod", "owner": OWNER_MINSOC, "db": "cbi.db", "access": 2,
     "id_map": {"last": "last_name", "first": "first_name", "second": "patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "birth_date"}},
    {"code": "EISSS", "ua": "ЄІССС — соц. допомоги", "member": "37567866",
     "subsystem": "EISSS_prod", "owner": OWNER_MINSOC, "db": "eisss.db", "access": 2,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp_child", "dob": "birth_date_child"}},
    {"code": "EDRSR", "ua": "ЄДРСР — судові рішення", "member": "00018090",
     "subsystem": "EDRSR_prod", "owner": "ДСА", "db": "edrsr.db", "access": 3,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "child_birth_date"}},
]
REG_BY_CODE = {r["code"]: r for r in REGISTRIES}


# ── helpers ──
def sim_start(cfg) -> date:
    return date(cfg["population"]["start_year"], 1, 1)


def month_date(cfg, t: int) -> date:
    s = sim_start(cfg)
    y = s.year + (s.month - 1 + t) // 12
    m = (s.month - 1 + t) % 12 + 1
    return date(y, m, 15)


def _rid(rng, n=10):
    return str(rng.randint(10 ** (n - 1), 10 ** n - 1))


def _nm(child, cfg, rng, drop_unzr=True):
    """Зашумлена ідентичність: (last, first, second, unzr|None)."""
    nv = cfg["noise"]["name_variation_rate"]
    unzr = child.unzr
    if drop_unzr and rng.random() < cfg["noise"]["no_unzr_rate"]:
        unzr = None
    return (corrupt_name(child.last_name, rng, nv), corrupt_name(child.first_name, rng, nv),
            corrupt_name(child.second_name, rng, nv), unzr)


def _first_month(child, pred):
    for t, s in enumerate(child.states):
        if pred(s):
            return t
    return None


def _full(child):
    return f"{child.last_name} {child.first_name} {child.second_name}"


# ════════════ R1 ДРАЦС (актовий запис про народження) — 39 реальних полів ════════════
def emit_dracs(child, cfg, rng):
    ln, fn, sn, unzr = _nm(child, cfg, rng, drop_unzr=False)  # акт народження майже завжди з УНЗР
    reg_dt = (child.birth_date + timedelta(days=rng.randint(2, 20)))
    rows = [{
        "register_record_id": _rid(rng, 11), "act_type": "народження", "act_number": str(rng.randint(1, 9999)),
        "registration_date": reg_dt.isoformat(), "registration_body": f"Відділ ДРАЦС, {child.settlement}",
        "surname_child": ln, "name_child": fn, "patronymic_child": sn,
        "sex_child": "жіноча" if child.gender == "FEMALE" else "чоловіча",
        "birth_date": child.birth_date.isoformat(), "birth_time": f"{rng.randint(0,23):02d}:{rng.randint(0,59):02d}",
        "birth_place": f"Україна, {child.oblast} обл., {child.settlement}",
        "live_or_stillborn": "живонароджена", "child_order": str(rng.randint(1, 3)), "number_of_children_born": "1",
        "birth_proof_document": f"Медичне свідоцтво про народження ф.103/о № {_rid(rng,6)}",
        "birth_certificate_series_number": f"{rng.choice(['I-СГ','II-БК','I-АБ'])} № {_rid(rng,6)}",
        "mother_full_name": f"{child.last_name} {rng.choice(['Марія','Олена','Ірина','Наталія'])} {rng.choice(['Петрівна','Іванівна'])}",
        "mother_birth_date": (child.birth_date - timedelta(days=rng.randint(7000,12000))).isoformat(),
        "mother_citizenship": COUNTRY_UA, "mother_nationality": "українка",
        "mother_address": f"{child.oblast} обл., {child.settlement}",
        "mother_id_document": f"Паспорт громадянина України № {_rid(rng,9)}", "mother_rnokpp": child.mother_rnokpp,
        "father_full_name": (None if child.father_rnokpp is None else
                             f"{child.last_name} {rng.choice(['Андрій','Іван','Сергій'])} {rng.choice(['Іванович','Петрович'])}"),
        "father_birth_date": None if child.father_rnokpp is None else (child.birth_date - timedelta(days=rng.randint(8000,14000))).isoformat(),
        "father_citizenship": None if child.father_rnokpp is None else COUNTRY_UA,
        "father_address": None if child.father_rnokpp is None else f"{child.oblast} обл., {child.settlement}",
        "father_rnokpp": child.father_rnokpp,
        "basis_father_record": "спільна заява" if child.father_rnokpp else "ч.1 ст.135 СК",
        "applicant_full_name": "мати", "applicant_document": "паспорт",
        "child_rnokpp": child.rnokpp, "child_unzr": unzr,
        "record_status": "чинний", "official_signatory": f"Держреєстратор {_rid(rng,4)}",
    }]
    # акт про смерть одного з батьків (для сирітства)
    if "W6_orphanhood" in child.labels:
        m = child.labels["W6_orphanhood"]
        rows.append({
            "register_record_id": _rid(rng, 11), "act_type": "смерть", "act_number": str(rng.randint(1, 9999)),
            "registration_date": month_date(cfg, m).isoformat(), "registration_body": f"Відділ ДРАЦС, {child.settlement}",
            "surname_child": child.last_name, "name_child": "—", "patronymic_child": "—",
            "birth_date": None, "birth_place": child.settlement, "linked_child_unzr": child.unzr,
            "deceased_role": "батько/мати", "record_status": "чинний",
        })
    return rows


# ════════════ R2 ЄДДР (демографічний реєстр) ════════════
def emit_eddr(child, cfg, rng):
    from ..transliteration import translit_official
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    age0 = child.age_at(sim_start(cfg), 0)
    return [{
        "unzr": unzr, "surname": ln, "given_name": fn, "patronymic": sn,
        "name_latin": translit_official(f"{child.last_name} {child.first_name}"),
        "birth_date": child.birth_date.isoformat(), "date_of_death": None,
        "birth_place": f"{child.oblast} обл., {child.settlement}",
        "sex": "Ж" if child.gender == "FEMALE" else "Ч",
        "register_entry_date": (child.birth_date + timedelta(days=rng.randint(5, 30))).isoformat(),
        "registered_residence": f"{child.oblast} обл., {child.settlement}",
        "parents_info": f"мати: РНОКПП {child.mother_rnokpp}",
        "citizenship": COUNTRY_UA, "citizenship_grounds": "за народженням",
        "issued_document": "ID-картка" if age0 >= 14 else "свідоцтво про народження",
        "issued_document_number": _rid(rng, 9), "rnokpp": child.rnokpp,
        "birth_act_details": f"акт № {rng.randint(1,9999)}", "special_status": None,
    }]


# ════════════ R3 eHealth / ЕСОЗ (точна схема: person/declaration/encounter/condition/immunization) ════════════
def _ehealth_person_row(base, child, cfg, rng, person_id, age0):
    return {**base, "resource_type": "person", "id": person_id,
            "birth_country": COUNTRY_UA, "birth_settlement": child.settlement,
            "gender": "FEMALE" if child.gender == "FEMALE" else "MALE",
            "no_tax_id": "true" if child.rnokpp is None else "false",
            "document_type": "BIRTH_CERTIFICATE" if age0 < 14 else "PASSPORT",
            "document_number": f"ПП{_rid(rng,8)}" if age0 < 14 else _rid(rng, 9),
            "confidant_person_relation": "PRIMARY" if age0 < 14 else None,
            "authentication_method": "THIRD_PERSON" if age0 < 14 else "OTP",
            "status": "active"}


def _ehealth_declaration_row(base, child, cfg, rng):
    lapse = _first_month(child, lambda s: s.health == "lapsed")
    return {**base, "resource_type": "declaration", "declaration_number": f"{_rid(rng,4)}-{_rid(rng,4)}",
            "employee_id": _rid(rng, 6), "legal_entity_id": _rid(rng, 6),
            "start_date": month_date(cfg, 0).isoformat(),
            "end_date": month_date(cfg, lapse).isoformat() if lapse is not None else None,
            "status": "terminated" if lapse is not None else "active"}


def _ehealth_checkup_rows(rows, base, child, cfg, rng, t, s):
    done = s.health == "active"
    rows.append({**base, "resource_type": "immunization", "date": month_date(cfg, t).isoformat(),
                 "vaccine_code": rng.choice(["DTP", "MMR", "Polio", "Hep_B"]),
                 "status": "completed" if done else "not_done"})
    if child.has_chronic:
        rows.append({**base, "resource_type": "condition", "date": month_date(cfg, t).isoformat(),
                     "condition_code": "chronic", "clinical_status": "active",
                     "verification_status": "confirmed"})


def _ehealth_psych_row(rows, base, child, cfg, rng, t, s):
    if rng.random() < 0.5:
        rows.append({**base, "resource_type": "condition", "date": month_date(cfg, t).isoformat(),
                     "condition_code": "F43" if s.safety == "abuse_risk" else "F94",  # ПТСР/стрес
                     "condition_category": "psych", "clinical_status": "active"})


def _ehealth_trauma_row(rows, base, child, cfg, rng, t, s):
    if s.safety == "abuse_active" and rng.random() < 0.5:
        prior = any(r.get("condition_category") == "trauma" for r in rows)
        rows.append({**base, "resource_type": "encounter", "date": month_date(cfg, t).isoformat(),
                     "encounter_class": "emergency", "condition_category": "trauma",
                     "condition_code": "T14", "is_repeat": "true" if prior else "false",
                     "is_unexplained": "true", "location_context": "home"})


def emit_ehealth(child, cfg, rng):
    from ..transliteration import translit_official
    rows = []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    person_id = f"{_rid(rng,8)}-{_rid(rng,4)}-{_rid(rng,4)}"
    age0 = child.age_at(sim_start(cfg), 0)
    base = {"last_name": ln, "first_name": fn, "second_name": sn, "unzr": unzr, "tax_id": child.rnokpp,
            "birth_date": child.birth_date.isoformat()}
    # PERSON
    rows.append(_ehealth_person_row(base, child, cfg, rng, person_id, age0))
    # DECLARATION (декларація з лікарем ПМД)
    rows.append(_ehealth_declaration_row(base, child, cfg, rng))
    # ENCOUNTER/CONDITION/OBSERVATION/IMMUNIZATION у часі
    checkup_off = child.internal_id % 6
    for t, s in enumerate(child.states):
        if t % 6 == checkup_off:  # планові огляди / вакцинація
            _ehealth_checkup_rows(rows, base, child, cfg, rng, t, s)
        if s.safety in ("abuse_risk", "abuse_active") or s.family == "crisis":
            _ehealth_psych_row(rows, base, child, cfg, rng, t, s)
        _ehealth_trauma_row(rows, base, child, cfg, rng, t, s)
    return rows


# ════════════ R4 ЄДЕБО (освіта) ════════════
def _edebo_study_status(drop, displaced):
    if drop is None:
        return "навчається"
    if displaced:
        return "transferred"
    return "expelled"


def emit_edebo(child, cfg, rng):
    ever = any(s.school in ("enrolled", "at_risk", "dropped") for s in child.states)
    if not ever:
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    drop = _first_month(child, lambda s: s.school == "dropped")
    displaced = any(s.residence in ("displaced", "abroad") for s in child.states)
    status = _edebo_study_status(drop, displaced)
    return [{
        "surname": ln, "given_name": fn, "patronymic": sn, "birth_date": child.birth_date.isoformat(),
        "sex": "Ж" if child.gender == "FEMALE" else "Ч", "citizenship": COUNTRY_UA,
        "identity_document": ("свідоцтво про народження" if child.age_at(sim_start(cfg), 0) < 14 else "паспорт"),
        "rnokpp": child.rnokpp, "unzr": unzr,
        "edebo_person_id": _rid(rng, 8), "student_card_id": _rid(rng, 7),
        "educational_institution": f"Заклад загальної середньої освіти, {child.settlement}",
        "education_level": "початкова/базова середня", "form_of_study": "очна",
        "year_of_study": str(rng.randint(1, 11)), "financing_source": "державний бюджет",
        "study_status": status,
        "status_order": None if drop is None else f"наказ № {_rid(rng,4)}",
        "status_effective_date": month_date(cfg, drop).isoformat() if drop is not None else month_date(cfg, 0).isoformat(),
        # ООП-супровід відсутній у дітей з порушенням права на інклюзію (E4)
        "special_category": ("дитина з ООП" if child.has_disability and "E4_inclusion" not in child.labels else None),
    }]


# ════════════ R5 ІСУО/АІКОМ (відвідуваність/оцінки) ════════════
def _aikom_period_row(base, cfg, rng, t, at_risk, missed, consec, ooe, bully_m):
    return {**base, "class_grade": str(rng.randint(1, 11)),
            "attendance_period": month_date(cfg, t).strftime("%Y-%m"),
            "missed_lessons_count": str(missed),
            "absence_is_valid": "false" if at_risk else "true",
            "consecutive_absent_days": str(consec // 6),
            "out_of_education_flag": "true" if ooe else "false",
            "police_notified_date": month_date(cfg, t).isoformat() if ooe else None,
            "child_service_notified_date": month_date(cfg, t).isoformat() if ooe else None,
            "score_12": str(rng.randint(3, 6) if at_risk else rng.randint(7, 12)),
            "behavior_note": ("замкнутість/агресія" if at_risk and rng.random() < 0.4 else None),
            "anti_bullying_commission": "true" if (bully_m is not None and t == bully_m + 1) else "false",
            "nush_level": rng.choice(["початковий", "середній", "достатній", "високий"])}


def emit_aikom(child, cfg, rng):
    rows = []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    pupil_id = _rid(rng, 7)
    bully_m = child.labels.get("E1_bullying")
    base = {"last_name": ln, "first_name": fn, "patronymic": sn, "unzr": unzr, "rnokpp": child.rnokpp,
            "birth_date": child.birth_date.isoformat(), "pupil_record_id": pupil_id,
            "school": f"ЗЗСО, {child.settlement}", "alphabet_book_no": str(rng.randint(1, 30))}
    consec = 0
    for t, s in enumerate(child.states):
        if s.school not in ("enrolled", "at_risk"):
            continue
        at_risk = s.school == "at_risk"
        missed = rng.randint(8, 24) if at_risk else rng.randint(0, 4)
        consec = consec + missed if at_risk else 0
        ooe = consec >= 20
        rows.append(_aikom_period_row(base, cfg, rng, t, at_risk, missed, consec, ooe, bully_m))
    return rows


# ════════════ R6 ВПО (довідка про взяття на облік) ════════════
def emit_vpo(child, cfg, rng):
    if not child.is_idp:
        return []
    m = getattr(child, "idp_month", _first_month(child, lambda s: s.residence == "displaced") or 2)
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    reatt_school = any(s.school == "enrolled" for s in child.states[m + 1:])
    reatt_doctor = any(s.health == "active" for s in child.states[m + 1:])
    dest = rng.choice([o for o in cfg["oblasts"] if o != child.oblast])
    return [{
        "full_name": _full(child), "citizenship": COUNTRY_UA, "birth_date": child.birth_date.isoformat(),
        "birth_place": child.settlement, "sex": "Ж" if child.gender == "FEMALE" else "Ч",
        "child_rnokpp": child.rnokpp, "unzr": unzr,
        "certificate_number": _rid(rng, 10), "certificate_issue_date": month_date(cfg, m).isoformat(),
        "issuing_authority": f"Управління соцзахисту, {dest} обл.",
        "abandoned_housing_address": f"{child.oblast} обл., {child.settlement}",
        "actual_residence_place": f"{dest} обл.", "displacement_date": month_date(cfg, m).isoformat(),
        "displacement_circumstances": "бойові дії", "child_last_name": ln, "child_first_name": fn,
        "child_patronymic": sn, "child_birth_date": child.birth_date.isoformat(),
        "child_sex": "Ж" if child.gender == "FEMALE" else "Ч",
        "education_place": (f"ЗЗСО, {dest} обл." if reatt_school else None),
        "medical_needs": ("прикріплення до закладу" if not reatt_doctor else "забезпечено"),
        "disability_info": "так" if child.has_disability else "ні",
        "social_payments": "щомісячна адресна допомога ВПО", "certificate_status": "active",
    }]


# ════════════ R7 «Діти війни» ════════════
def _childwar_harm(war_status):
    if war_status == "deported":
        return "депортація"
    if war_status == "displaced":
        return "психологічна травма"
    return "втрата піклування"


def emit_childwar(child, cfg, rng):
    if not child.war_status:
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    status_map = {"deported": "депортована/примусово переміщена", "displaced": "переміщена",
                  "lost_parents": "втратила батьків"}
    m = (child.labels.get("W5_deportation") or child.labels.get("W6_orphanhood")
         or getattr(child, "idp_month", 3))
    harm = _childwar_harm(child.war_status)
    return [{
        "last_name": ln, "first_name": fn, "patronymic": sn, "birth_date": child.birth_date.isoformat(),
        "age_at_incident": str(child.age_at(sim_start(cfg), m)), "gender": "ж" if child.gender == "FEMALE" else "ч",
        "status_category": status_map.get(child.war_status, child.war_status),
        "type_of_harm": harm, "sexual_violence_marker": "ні",
        "incident_date": month_date(cfg, m).isoformat(), "region": child.oblast,
        "deportation_destination": ("рф/ТОТ" if child.war_status == "deported" else None),
        "rnokpp": child.rnokpp, "unzr": unzr, "eias_dity_marker": "так",
        "found_returned_flag": "ні" if child.war_status == "deported" else "—",
        "record_id": _rid(rng, 8),
    }]


# ════════════ R8 ЄІАС «Діти» / ССД ════════════
def emit_dity(child, cfg, rng):
    m = _first_month(child, lambda s: s.protection in ("observed", "in_care", "unaccompanied"))
    if m is None:
        return []
    prot = child.states[m].protection
    status = {"observed": "у складних життєвих обставинах", "in_care": "позбавлена батьківського піклування",
              "unaccompanied": "без супроводу"}[prot]
    sjo = "так" if (prot == "observed" or "F3_neglect" in child.labels) else "ні"
    return [{
        "record_number": _rid(rng, 8), "surname": child.last_name, "given_name": child.first_name,
        "patronymic": child.second_name, "birth_date": child.birth_date.isoformat(),
        "sex": "Ж" if child.gender == "FEMALE" else "Ч", "birth_place": child.settlement,
        "birth_certificate": f"{rng.choice(['I-СГ','II-БК'])} № {_rid(rng,6)}",
        "rnokpp": child.rnokpp, "unzr": child.unzr, "citizenship": COUNTRY_UA,
        "place_of_residence": f"{child.oblast} обл., {child.settlement}",
        "child_status": status, "status_grounds": f"наказ ССД № {_rid(rng,4)}",
        "primary_registration_date": month_date(cfg, m).isoformat(),
        "placement_form": ("інтернатний заклад" if prot == "in_care" and rng.random() < 0.4 else "сімейна форма"),
        "parents_data": ("позбавлені прав" if prot == "in_care" else "—"),
        "health_information": ("інвалідність" if child.has_disability else "—"),
        "difficult_life_circumstances": sjo,
        "war_affected_status": child.war_status or "—",
        "serving_ssd": f"Служба у справах дітей, {child.settlement}",
    }]


# ════════════ R9 ЄРДР (досудові розслідування) ════════════
def emit_erdr(child, cfg, rng):
    article = None
    if "W7_trafficking" in child.labels:
        article, m = "149 (торгівля людьми)", child.labels["W7_trafficking"]
    elif "F6_sexual_abuse" in child.labels:
        article, m = "152 (зґвалтування)", child.labels["F6_sexual_abuse"]
    elif "P1_physical_home" in child.labels and rng.random() < 0.7:
        article, m = "126-1 (домашнє насильство)", child.labels["P1_physical_home"]
    if article is None:
        return []
    ln, fn, sn, _ = _nm(child, cfg, rng, drop_unzr=False)
    return [{
        "unique_proceeding_number": _rid(rng, 17), "report_receipt_date": month_date(cfg, m).isoformat(),
        "register_entry_datetime": month_date(cfg, m).isoformat(),
        "victim_last_name": ln, "victim_first_name": fn, "victim_patronymic": sn,
        "fabula": "за ознаками кримінального правопорушення щодо дитини",
        "preliminary_legal_qualification": article, "pretrial_body": f"ВП №{rng.randint(1,9)} ГУНП",
        "victim_rnokpp": child.rnokpp, "victim_unzr": child.unzr,
        "victim_is_minor": "так", "victim_age": str(child.age_at(sim_start(cfg), m)),
        "victim_date_of_birth": child.birth_date.isoformat(),
        "victim_sex": "ж" if child.gender == "FEMALE" else "ч",
        "place_of_offence": f"{child.oblast} обл., {child.settlement}",
        "datetime_of_offence": month_date(cfg, m).isoformat(),
        "investigation_status": "досудове розслідування триває",
    }]


# ════════════ R10 Реєстр випадків домашнього насильства ════════════
def _dv_case_row(child, cfg, rng, ln, fn, sn, unzr, dm, k, is_victim):
    return {
        "case_record_id": _rid(rng, 9), "reporting_authority": f"ГУНП у {child.oblast} обл.",
        "victim_full_name": _full(child) if is_victim else "дорослий член родини",
        "child_last_name": ln, "child_first_name": fn, "child_patronymic": sn,
        "child_date_of_birth": child.birth_date.isoformat(), "child_unzr": unzr, "child_rnokpp": child.rnokpp,
        "child_sex": "ж" if child.gender == "FEMALE" else "ч",
        "child_witnessed_violence": "так",
        "presence_of_children_flag": "так",
        "parents_are_abusers_flag": "так" if is_victim else "ні",
        "abuser_full_name": "член родини", "incident_datetime": month_date(cfg, dm).isoformat(),
        "incident_place": f"{child.oblast} обл., {child.settlement}",
        "form_of_violence": "фізичне" if is_victim else "психологічне",
        "primary_recurrent_flag": "повторний" if (is_victim and k > 0) else "первинний",
        "police_call": "так", "emergency_restraining_order": "так" if is_victim else "ні",
        "child_services_notification": "так",
        "record_timestamp": month_date(cfg, dm).isoformat(),
    }


def emit_dv(child, cfg, rng):
    if not (getattr(child, "dv_household", False) or "P1_physical_home" in child.labels):
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    m = child.labels.get("P1_physical_home", getattr(child, "idp_month", rng.randint(3, 18)))
    is_victim = "P1_physical_home" in child.labels
    rows = []
    for k in range(rng.randint(1, 3)):
        dm = min(m + rng.randint(0, 4), cfg["population"]["months"] - 1)
        rows.append(_dv_case_row(child, cfg, rng, ln, fn, sn, unzr, dm, k, is_victim))
    return rows


# ════════════ R11 ЦБІ (інвалідність) ════════════
def emit_cbi(child, cfg, rng):
    if not child.has_disability:
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    return [{
        "last_name": ln, "first_name": fn, "patronymic": sn, "birth_date": child.birth_date.isoformat(),
        "sex": "Ж" if child.gender == "FEMALE" else "Ч",
        "registered_residence": f"{child.oblast} обл., {child.settlement}",
        "rnokpp": child.rnokpp, "unzr": unzr,
        "birth_certificate": f"{rng.choice(['I-СГ','II-БК'])} № {_rid(rng,6)}",
        "child_with_disability_flag": "так",
        "disability_category": "дитина з інвалідністю",
        "disability_group": rng.choice(["А", "Б", "підгрупа"]),
        "cause_of_disability": rng.choice(["вроджена", "захворювання", "травма"]),
        "diagnosis_code_icd10": rng.choice(["G80", "Q90", "F70", "H90"]),
        "date_established": (child.birth_date + timedelta(days=rng.randint(200, 2500))).isoformat(),
        "next_assessment_date": None, "education_level": "інклюзивне/спеціальне",
        "irp_measures": "реабілітація, ТЗР", "servicing_authority": f"УСЗН, {child.settlement}",
        "registration_date_cbi": (child.birth_date + timedelta(days=rng.randint(220, 2600))).isoformat(),
    }]


# ════════════ R12 ЄІССС (соціальні допомоги) ════════════
def emit_eisss(child, cfg, rng):
    low_income = child.poverty in ("poor", "deep")
    # формальну адресну допомогу отримує меншість бідних (~3-5% усіх дітей)
    gets_aid = low_income and rng.random() < 0.08
    if not (gets_aid or child.family_type in ("single_parent", "many_children") and rng.random() < 0.25):
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    btype = []
    if child.poverty == "deep":
        btype.append("допомога малозабезпеченим сім'ям")
    if child.family_type == "single_parent":
        btype.append("допомога одиноким матерям")
    if child.family_type == "many_children":
        btype.append("допомога багатодітним")
    if child.has_disability:
        btype.append("допомога на дитину з інвалідністю")
    if not btype:
        btype = ["допомога при народженні"]
    return [{
        "child_last_name": ln, "child_first_name": fn, "child_patronymic": sn,
        "family_relationship": "дитина", "birth_certificate_series_number": f"{rng.choice(['I-СГ','II-БК'])} № {_rid(rng,6)}",
        "rnokpp_child": child.rnokpp, "unzr": unzr, "birth_date_child": child.birth_date.isoformat(),
        "sex": "Ж" if child.gender == "FEMALE" else "Ч",
        "registered_declared_residence": f"{child.oblast} обл., {child.settlement}",
        "child_with_disability_flag": "так" if child.has_disability else "ні",
        "single_mother_flag": "так" if child.family_type == "single_parent" else "ні",
        "large_family_flag": "так" if child.family_type == "many_children" else "ні",
        "income_data": "нижче прожиткового мінімуму" if child.poverty == "deep" else "—",
        "case_file_number": _rid(rng, 8), "benefit_type": "; ".join(btype),
        "application_registration_date": month_date(cfg, rng.randint(0, 6)).isoformat(),
        "payout_account_iban": f"UA{_rid(rng,10)}",
    }]


# ════════════ R13 ЄДРСР (судові рішення) ════════════
def emit_edrsr(child, cfg, rng):
    # рішення про позбавлення/обмеження батьківських прав (для сирітства/опіки)
    if not ("W6_orphanhood" in child.labels or child.family_type in ("no_parental_care", "guardianship")):
        return []
    if rng.random() < 0.4:  # не всі справи у відкритому реєстрі
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    m = child.labels.get("W6_orphanhood", rng.randint(2, 18))
    return [{
        "decision_registration_number": _rid(rng, 9),
        "case_number": f"{rng.randint(100,999)}/{_rid(rng,4)}/{cfg['population']['start_year']%100}",
        "court_name": f"{child.settlement} районний суд", "judge": f"суддя {_rid(rng,4)}",
        "decision_type": "рішення", "case_category": "позбавлення батьківських прав",
        "decision_date": month_date(cfg, m).isoformat(),
        "child_last_name": ln, "child_first_name": fn, "child_patronymic": sn,
        "child_birth_date": child.birth_date.isoformat(), "rnokpp": child.rnokpp, "unzr": unzr,
        "restricted_access_flag": "так",  # знеособлено за ст.7 Закону
    }]


EMITTERS = {
    "DRACS": emit_dracs, "EDDR": emit_eddr, "EHEALTH": emit_ehealth, "EDEBO": emit_edebo,
    "AIKOM": emit_aikom, "VPO": emit_vpo, "CHILDWAR": emit_childwar, "DITY": emit_dity,
    "ERDR": emit_erdr, "DV": emit_dv, "CBI": emit_cbi, "EISSS": emit_eisss, "EDRSR": emit_edrsr,
}
