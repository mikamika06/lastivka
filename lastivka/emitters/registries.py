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
     "subsystem": "85_OISSS_VPO_prod", "owner": "Мінсоцполітики", "db": "vpo.db", "access": 2,
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
     "subsystem": "CBI_prod", "owner": "Мінсоцполітики", "db": "cbi.db", "access": 2,
     "id_map": {"last": "last_name", "first": "first_name", "second": "patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "birth_date"}},
    {"code": "EISSS", "ua": "ЄІССС — соц. допомоги", "member": "37567866",
     "subsystem": "EISSS_prod", "owner": "Мінсоцполітики", "db": "eisss.db", "access": 2,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp_child", "dob": "birth_date_child"}},
    {"code": "EDRSR", "ua": "ЄДРСР — судові рішення", "member": "00018090",
     "subsystem": "EDRSR_prod", "owner": "ДСА", "db": "edrsr.db", "access": 3,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "child_birth_date"}},
    {"code": "SKAID", "ua": "ІКС «СКАЙД» — ювенальна превенція", "member": "00032684",
     "subsystem": "20_NP_SKAID_prod", "owner": "Нацполіція", "db": "skaid.db", "access": 2,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "child_birth_date"}},
    {"code": "PFU", "ua": "Реєстр застрахованих осіб (ПФУ)", "member": "00035261",
     "subsystem": "PFU_RZO_prod", "owner": "ПФУ", "db": "pfu.db", "access": 2,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "linked_child_unzr", "rnokpp": "linked_child_rnokpp", "dob": "child_birth_date"}},
    {"code": "DRRP", "ua": "ДРРП — речові права (житло)", "member": "00015622",
     "subsystem": "3_MJU_DRRP_prod", "owner": "Мінʼюст", "db": "drrp.db", "access": 2,
     "id_map": {"last": "subject_last_name", "first": "subject_first_name", "second": "subject_patronymic",
                "unzr": "unzr", "rnokpp": "rnokpp", "dob": "subject_birth_date"}},
    {"code": "HOTLINE", "ua": "Гарячі лінії 116 111 / 1545", "member": "00000000",
     "subsystem": "HOTLINE_prod", "owner": "Ла Страда / УКЦ", "db": "hotline.db", "access": 2,
     "id_map": {"last": "child_last_name", "first": "child_first_name", "second": "child_patronymic",
                "unzr": "child_unzr", "rnokpp": "child_rnokpp", "dob": "child_birth_date"}},
    # ── ЕСТОНІЯ (X-tee, оператор RIA) — окремі силоси, isikukood як ключ, БЕЗ УНЗР ──
    {"code": "RAHV", "ua": "Rahvastikuregister (народонаселення, EE)", "member": "EE/GOV/70000898",
     "subsystem": "RR_prod", "owner": "Siseministeerium (МВС Естонії)", "db": "ee_rahv.db", "access": 2,
     "country": "EE",
     "id_map": {"last": "perekonnanimi", "first": "eesnimi", "second": "_none",
                "unzr": "isikukood", "rnokpp": "_none", "dob": "synniaeg"}},
    {"code": "EHIS_EE", "ua": "EHIS (освіта, EE)", "member": "EE/GOV/70000740",
     "subsystem": "EHIS_prod", "owner": "Haridus- ja Teadusministeerium", "db": "ee_ehis.db", "access": 2,
     "country": "EE",
     "id_map": {"last": "perekonnanimi", "first": "eesnimi", "second": "_none",
                "unzr": "isikukood", "rnokpp": "_none", "dob": "synniaeg"}},
    {"code": "TERVIS", "ua": "Tervise infosüsteem (здоровʼя, EE)", "member": "EE/GOV/70009770",
     "subsystem": "TIS_prod", "owner": "TEHIK / Sotsiaalministeerium", "db": "ee_tervis.db", "access": 1,
     "country": "EE",
     "id_map": {"last": "perekonnanimi", "first": "eesnimi", "second": "_none",
                "unzr": "isikukood", "rnokpp": "_none", "dob": "synniaeg"}},
    {"code": "SKAIS", "ua": "SKAIS (соцзахист/опіка, EE)", "member": "EE/GOV/70001940",
     "subsystem": "SKAIS_prod", "owner": "Sotsiaalkindlustusamet (SKA)", "db": "ee_skais.db", "access": 2,
     "country": "EE",
     "id_map": {"last": "perekonnanimi", "first": "eesnimi", "second": "_none",
                "unzr": "isikukood", "rnokpp": "_none", "dob": "synniaeg"}},
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
        "mother_citizenship": "Україна", "mother_nationality": "українка",
        "mother_address": f"{child.oblast} обл., {child.settlement}",
        "mother_id_document": f"Паспорт громадянина України № {_rid(rng,9)}", "mother_rnokpp": child.mother_rnokpp,
        "father_full_name": (None if child.father_rnokpp is None else
                             f"{child.last_name} {rng.choice(['Андрій','Іван','Сергій'])} {rng.choice(['Іванович','Петрович'])}"),
        "father_birth_date": None if child.father_rnokpp is None else (child.birth_date - timedelta(days=rng.randint(8000,14000))).isoformat(),
        "father_citizenship": None if child.father_rnokpp is None else "Україна",
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
        "citizenship": "Україна", "citizenship_grounds": "за народженням",
        "issued_document": "ID-картка" if age0 >= 14 else "свідоцтво про народження",
        "issued_document_number": _rid(rng, 9), "rnokpp": child.rnokpp,
        "birth_act_details": f"акт № {rng.randint(1,9999)}", "special_status": None,
    }]


# ════════════ R3 eHealth / ЕСОЗ (точна схема: person/declaration/encounter/condition/immunization) ════════════
def emit_ehealth(child, cfg, rng):
    from ..transliteration import translit_official
    rows = []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    person_id = f"{_rid(rng,8)}-{_rid(rng,4)}-{_rid(rng,4)}"
    age0 = child.age_at(sim_start(cfg), 0)
    base = {"last_name": ln, "first_name": fn, "second_name": sn, "unzr": unzr, "tax_id": child.rnokpp,
            "birth_date": child.birth_date.isoformat()}
    # PERSON
    rows.append({**base, "resource_type": "person", "id": person_id,
                 "birth_country": "Україна", "birth_settlement": child.settlement,
                 "gender": "FEMALE" if child.gender == "FEMALE" else "MALE",
                 "no_tax_id": "true" if child.rnokpp is None else "false",
                 "document_type": "BIRTH_CERTIFICATE" if age0 < 14 else "PASSPORT",
                 "document_number": f"ПП{_rid(rng,8)}" if age0 < 14 else _rid(rng, 9),
                 "confidant_person_relation": "PRIMARY" if age0 < 14 else None,
                 "authentication_method": "THIRD_PERSON" if age0 < 14 else "OTP",
                 "status": "active"})
    # DECLARATION (декларація з лікарем ПМД)
    lapse = _first_month(child, lambda s: s.health == "lapsed")
    rows.append({**base, "resource_type": "declaration", "declaration_number": f"{_rid(rng,4)}-{_rid(rng,4)}",
                 "employee_id": _rid(rng, 6), "legal_entity_id": _rid(rng, 6),
                 "start_date": month_date(cfg, 0).isoformat(),
                 "end_date": month_date(cfg, lapse).isoformat() if lapse is not None else None,
                 "status": "terminated" if lapse is not None else "active"})
    # ENCOUNTER/CONDITION/OBSERVATION/IMMUNIZATION у часі
    checkup_off = child.internal_id % 6
    for t, s in enumerate(child.states):
        if t % 6 == checkup_off:  # планові огляди / вакцинація
            done = s.health == "active"
            rows.append({**base, "resource_type": "immunization", "date": month_date(cfg, t).isoformat(),
                         "vaccine_code": rng.choice(["DTP", "MMR", "Polio", "Hep_B"]),
                         "status": "completed" if done else "not_done"})
            if child.has_chronic:
                rows.append({**base, "resource_type": "condition", "date": month_date(cfg, t).isoformat(),
                             "condition_code": "chronic", "clinical_status": "active",
                             "verification_status": "confirmed"})
        if s.safety in ("abuse_risk", "abuse_active") or s.family == "crisis":
            if rng.random() < 0.5:
                rows.append({**base, "resource_type": "condition", "date": month_date(cfg, t).isoformat(),
                             "condition_code": "F43" if s.safety == "abuse_risk" else "F94",  # ПТСР/стрес
                             "condition_category": "psych", "clinical_status": "active"})
        if s.safety == "abuse_active" and rng.random() < 0.5:
            prior = any(r.get("condition_category") == "trauma" for r in rows)
            rows.append({**base, "resource_type": "encounter", "date": month_date(cfg, t).isoformat(),
                         "encounter_class": "emergency", "condition_category": "trauma",
                         "condition_code": "T14", "is_repeat": "true" if prior else "false",
                         "is_unexplained": "true", "location_context": "home"})
    return rows


# ════════════ R4 ЄДЕБО (освіта) ════════════
def emit_edebo(child, cfg, rng):
    ever = any(s.school in ("enrolled", "at_risk", "dropped") for s in child.states)
    if not ever:
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    drop = _first_month(child, lambda s: s.school == "dropped")
    displaced = any(s.residence in ("displaced", "abroad") for s in child.states)
    status = ("transferred" if displaced else "expelled") if drop is not None else "навчається"
    return [{
        "surname": ln, "given_name": fn, "patronymic": sn, "birth_date": child.birth_date.isoformat(),
        "sex": "Ж" if child.gender == "FEMALE" else "Ч", "citizenship": "Україна",
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
        rows.append({**base, "class_grade": str(rng.randint(1, 11)),
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
                     "nush_level": rng.choice(["початковий", "середній", "достатній", "високий"])})
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
        "full_name": _full(child), "citizenship": "Україна", "birth_date": child.birth_date.isoformat(),
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
def emit_childwar(child, cfg, rng):
    if not child.war_status:
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    status_map = {"deported": "депортована/примусово переміщена", "displaced": "переміщена",
                  "lost_parents": "втратила батьків"}
    m = (child.labels.get("W5_deportation") or child.labels.get("W6_orphanhood")
         or getattr(child, "idp_month", 3))
    harm = "депортація" if child.war_status == "deported" else ("психологічна травма" if child.war_status == "displaced" else "втрата піклування")
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
        "rnokpp": child.rnokpp, "unzr": child.unzr, "citizenship": "Україна",
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
def emit_dv(child, cfg, rng):
    physical = "P1_physical_home" in child.labels
    psych = "F1_psych_violence" in child.labels
    if not (physical or psych):  # запис у реєстр ДН — лише за зафіксованим насильством
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    m = child.labels.get("P1_physical_home") or child.labels.get("F1_psych_violence") \
        or getattr(child, "idp_month", rng.randint(3, 18))
    child_victim = physical or psych
    rows = []
    for k in range(rng.randint(1, 3)):
        dm = min(m + rng.randint(0, 4), cfg["population"]["months"] - 1)
        rows.append({
            "case_record_id": _rid(rng, 9), "reporting_authority": f"ГУНП у {child.oblast} обл.",
            "victim_full_name": _full(child) if child_victim else "дорослий член родини",
            "child_last_name": ln, "child_first_name": fn, "child_patronymic": sn,
            "child_date_of_birth": child.birth_date.isoformat(), "child_unzr": unzr, "child_rnokpp": child.rnokpp,
            "child_sex": "ж" if child.gender == "FEMALE" else "ч",
            "child_witnessed_violence": "так", "presence_of_children_flag": "так",
            "parents_are_abusers_flag": "так" if child_victim else "ні",
            "abuser_full_name": "член родини", "incident_datetime": month_date(cfg, dm).isoformat(),
            "incident_place": f"{child.oblast} обл., {child.settlement}",
            "form_of_violence": "фізичне" if physical else "психологічне",
            "primary_recurrent_flag": "повторний" if (physical and k > 0) else "первинний",
            "police_call": "так", "emergency_restraining_order": "так" if physical else "ні",
            "child_services_notification": "так",
            "record_timestamp": month_date(cfg, dm).isoformat(),
        })
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


# ════════════ R14 ІКС «СКАЙД» (ювенальна превенція) ════════════
def emit_skaid(child, cfg, rng):
    age0 = child.age_at(sim_start(cfg), 0)
    behavioral = ("F3_neglect" in child.labels or "P1_physical_home" in child.labels or child.par_addiction)
    if not (age0 >= 11 and behavioral and rng.random() < 0.35):
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    m = rng.randint(3, cfg["population"]["months"] - 3)
    return [{
        "preventive_case_file_number": _rid(rng, 8), "case_file_opening_date": month_date(cfg, m).isoformat(),
        "registration_category": rng.choice(["схильна до правопорушень", "перебуває у конфлікті із законом",
                                             "вчинила булінг", "потерпіла від насильства"]),
        "grounds_documents": "подання ССД / матеріали поліції",
        "child_last_name": ln, "child_first_name": fn, "child_patronymic": sn,
        "child_birth_date": child.birth_date.isoformat(), "sex": "ж" if child.gender == "FEMALE" else "ч",
        "citizenship": "Україна", "place_of_residence": f"{child.oblast} обл., {child.settlement}",
        "identity_document": "свідоцтво про народження" if age0 < 14 else "паспорт",
        "unzr": unzr, "rnokpp": child.rnokpp,
        "administrative_liability_record": "ні",
        "criminal_liability_record": "так" if "P1_physical_home" in child.labels and rng.random() < 0.2 else "ні",
        "individual_prevention_measures": "профілактичні бесіди, соц-психологічний супровід",
        "child_as_perpetrator_of_bullying": "так" if "E1_bullying" in child.labels and rng.random() < 0.3 else "ні",
        "child_as_victim_records": "так" if behavioral else "ні",
        "parents_data": f"мати: РНОКПП {child.mother_rnokpp}",
    }]


# ════════════ R15 ПФУ (зайнятість батьків) ════════════
def emit_pfu(child, cfg, rng):
    if not child.par_unemployment:  # реєструємо лише сигнал — безробіття опікуна
        return []
    return [{
        "unique_account_number": _rid(rng, 12), "rnokpp": child.mother_rnokpp,
        "full_name": f"{child.last_name} {rng.choice(['Марія','Олена','Ірина'])} {rng.choice(['Петрівна','Іванівна'])}",
        "birth_date": (child.birth_date - timedelta(days=rng.randint(7000, 12000))).isoformat(),
        "sex": "Ж", "citizenship": "Україна",
        "employment_status_indicator": "безробітний",
        "reporting_year": str(cfg["population"]["start_year"]),
        "insurer_employer_id": None, "employment_period": "немає чинних трудових відносин",
        "wage_subject_to_contributions": "0", "occupation": None,
        # демо-лінк до дитини (у реалі — через РНОКПП батька в ДРАЦС)
        "linked_child_unzr": child.unzr, "linked_child_rnokpp": child.rnokpp,
        "child_last_name": child.last_name, "child_first_name": child.first_name,
        "child_patronymic": child.second_name, "child_birth_date": child.birth_date.isoformat(),
    }]


# ════════════ R16 ДРРП (речові права / житло) ════════════
def emit_drrp(child, cfg, rng):
    alienation = "W9_identity" in child.labels
    if not (alienation or rng.random() < 0.05):
        return []
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    return [{
        "real_property_object_number": _rid(rng, 10), "land_cadastral_number": None,
        "object_type": "квартира", "object_address": f"{child.oblast} обл., {child.settlement}",
        "total_area": str(rng.randint(40, 90)), "living_area": str(rng.randint(25, 60)),
        "subject_last_name": ln, "subject_first_name": fn, "subject_patronymic": sn,
        "subject_birth_date": child.birth_date.isoformat(), "rnokpp": child.rnokpp, "unzr": unzr,
        "right_type": "спільна часткова власність", "ownership_share_size": "1/4",
        "registration_basis": "договір приватизації",
        "registration_datetime": month_date(cfg, 0).isoformat(),
        "encumbrance_type": ("відчуження без дозволу органу опіки" if alienation else None),
        "object_price": None,
        "child_residence_registration_flag": "так",
        "child_residence_alienation": "так" if alienation else "ні",
    }]


# ════════════ R17 Гарячі лінії 116 111 / 1545 ════════════
_HOTLINE_TOPIC = {
    "F1_psych_violence": ("психологічне насильство", "психологічне"),
    "P1_physical_home": ("фізичне насильство в сім'ї", "фізичне"),
    "F6_sexual_abuse": ("сексуальне насильство", "сексуальне"),
    "F3_neglect": ("занедбаність / нехтування", "нехтування"),
    "E1_bullying": ("булінг у школі", "психологічне"),
}


def emit_hotline(child, cfg, rng):
    rel = [v for v in child.labels if v in _HOTLINE_TOPIC]
    if not rel or rng.random() > 0.35:
        return []
    vid = rng.choice(rel)
    topic, vtype = _HOTLINE_TOPIC[vid]
    anon = rng.random() < 0.6  # дзвінки часто анонімні -> без ідентифікатора
    ln, fn, sn, unzr = _nm(child, cfg, rng)
    if anon:
        unzr = None
    m = child.labels[vid]
    caller = rng.choice(["дитина", "сусід", "родич", "вчитель"])
    return [{
        "appeal_id": _rid(rng, 9), "received_at": month_date(cfg, m).isoformat(),
        "channel_source": rng.choice(["116111", "1545"]), "caller_type": caller,
        "reporter_full_name": None if anon else "заявник",
        "contact_phone": None if anon else f"+380{_rid(rng, 9)}",
        "child_last_name": ln, "child_first_name": fn, "child_patronymic": sn,
        "child_birth_date": None if anon else child.birth_date.isoformat(),
        "child_sex": "ж" if child.gender == "FEMALE" else "ч",
        "child_rnokpp": None if anon else child.rnokpp, "child_unzr": unzr,
        "child_location": f"{child.oblast} обл., {child.settlement}",
        "appeal_category": "звернення щодо дитини", "topic": topic, "violence_type": vtype,
        "circumstances": "потребує перевірки", "safety_risk_flag": "так" if vid in ("P1_physical_home", "F6_sexual_abuse") else "можливо",
        "summary": f"повідомлення про {topic}", "operator_name": f"оператор {_rid(rng, 3)}",
        "action_taken": "передано до ССД та поліції", "status": "опрацьовується",
        "is_anonymous": "так" if anon else "ні",
    }]


# ════════════ ЕСТОНСЬКІ РЕЄСТРИ (X-tee) — для дітей під тимчасовим захистом ════════════
_EE_CITY = ["Tallinn", "Tartu", "Narva", "Pärnu", "Kohtla-Järve", "Viljandi"]


def _ee_name(child, cfg, rng):
    """Латинське імʼя на естонському боці — з розбіжністю транслітерації (крос-кордонний виклик)."""
    from ..transliteration import alt_spellings, translit_official
    eesnimi = alt_spellings(child.first_name, rng)                    # Yuliia / Julia / Julija ...
    perekonnanimi = corrupt_name(translit_official(child.last_name), rng, 0.4)
    return perekonnanimi, eesnimi


def _ee_sex(child):
    return "N" if child.gender == "FEMALE" else "M"


def emit_rahv(child, cfg, rng):
    if not (getattr(child, "abroad_ee", False) and child.ee_registered):
        return []
    pn, en = _ee_name(child, cfg, rng)
    m = child.ee_arrival_month
    return [{
        "isikukood": child.isikukood, "eesnimi": en, "perekonnanimi": pn, "sugu": _ee_sex(child),
        "synniaeg": child.birth_date.isoformat(), "synnikoht": "Ukraina",
        "kodakondsus": "UA", "elukoht": f"{rng.choice(_EE_CITY)}, Eesti",
        "elamisluba": "ajutine kaitse",  # тимчасовий захист
        "hooldusoigus": "eestkostja määramata" if child.ee_uasc else "vanem",
        "seos_vanemaga": "puudub" if child.ee_uasc else "ema/isa",
        "kande_kuupaev": month_date(cfg, m).isoformat(),
    }]


def emit_ehis_ee(child, cfg, rng):
    if not (getattr(child, "abroad_ee", False) and child.ee_in_school):
        return []
    pn, en = _ee_name(child, cfg, rng)
    m = child.ee_arrival_month
    return [{
        "isikukood": child.isikukood, "eesnimi": en, "perekonnanimi": pn,
        "synniaeg": child.birth_date.isoformat(),
        "oppeasutus": f"{rng.choice(_EE_CITY)} kool", "haridustase": "põhiharidus",
        "klass": str(rng.randint(1, 9)),
        "erivajadus": "jah" if child.has_disability else "ei",
        "oppe_staatus": "õpib", "immatrikuleerimise_kuupaev": month_date(cfg, m + 1).isoformat(),
    }]


def emit_tervis(child, cfg, rng):
    if not (getattr(child, "abroad_ee", False) and child.ee_in_health):
        return []
    pn, en = _ee_name(child, cfg, rng)
    rows = []
    base = {"isikukood": child.isikukood, "eesnimi": en, "perekonnanimi": pn,
            "synniaeg": child.birth_date.isoformat(), "perearst": f"dr {_rid(rng, 4)}"}
    m = child.ee_arrival_month
    rows.append({**base, "dokumendi_tyyp": "epikriis", "kuupaev": month_date(cfg, m + 1).isoformat(),
                 "diagnoos_RHK10": "Z76" if not child.has_chronic else rng.choice(["E10", "J45", "G40"]),
                 "staatus": "kinnitatud"})
    if not child.has_chronic or rng.random() < 0.6:
        rows.append({**base, "dokumendi_tyyp": "immuniseerimine", "kuupaev": month_date(cfg, m + 2).isoformat(),
                     "vaktsiin": rng.choice(["DTP", "MMR"]), "staatus": "tehtud"})
    return rows


def emit_skais(child, cfg, rng):
    if not (getattr(child, "abroad_ee", False) and (child.ee_gets_benefit or child.ee_uasc)):
        return []
    pn, en = _ee_name(child, cfg, rng)
    m = child.ee_arrival_month
    htype = []
    if child.ee_gets_benefit:
        htype.append("lapsetoetus")
    if child.ee_uasc:
        htype.append("lastekaitse juhtum")  # child-protection case (UASC)
    return [{
        "isikukood": child.isikukood, "eesnimi": en, "perekonnanimi": pn,
        "synniaeg": child.birth_date.isoformat(),
        "huvitis_tyyp": "; ".join(htype) or "lapsetoetus", "staatus": "aktiivne",
        "hooldus": "eestkoste menetlus" if child.ee_uasc else "—",
        "teenus": "lastekaitsetöötaja" if child.ee_uasc else "peretoetus",
        "kov": rng.choice(_EE_CITY),  # local government
        "maaramise_kuupaev": month_date(cfg, m).isoformat(),
    }]


EMITTERS = {
    "DRACS": emit_dracs, "EDDR": emit_eddr, "EHEALTH": emit_ehealth, "EDEBO": emit_edebo,
    "AIKOM": emit_aikom, "VPO": emit_vpo, "CHILDWAR": emit_childwar, "DITY": emit_dity,
    "ERDR": emit_erdr, "DV": emit_dv, "CBI": emit_cbi, "EISSS": emit_eisss, "EDRSR": emit_edrsr,
    "SKAID": emit_skaid, "PFU": emit_pfu, "DRRP": emit_drrp, "HOTLINE": emit_hotline,
    "RAHV": emit_rahv, "EHIS_EE": emit_ehis_ee, "TERVIS": emit_tervis, "SKAIS": emit_skais,
}
