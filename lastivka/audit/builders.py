"""
DSL побудови мінімальної entity. Кожен with_* фліпає РІВНО один сигнал у
detection._signals (звірено рядок-у-рядок з detection.py). Дати — у вікні
2023-01..2024-12 (start_year=2023, months=24). Acute=2024-*, chronic=2023-*.
"""
from __future__ import annotations


def base_entity(birth_date: str = "2012-06-15", unzr: str = "20120615-00001", **flat) -> dict:
    """Чиста дитина без жодного сигналу. Flat-ключі дзеркалять familygraph.rollup."""
    ent = {
        "entity_id": 1, "unzr": unzr, "pib": "Тест Дитина Тестівна",
        "birth_date": birth_date, "country": "UA",
        "registries": [], "n_registries": 0, "rows_by_reg": {},
        # familygraph flat-дефолти (detection їх читає через ent.get(...))
        "sibling_in_care": False, "sibling_prior_violation": set(),
        "parent_incarcerated": False, "parent_criminal": False,
        "parent_addiction": False, "parent_mental_health": False,
        "new_cohabitant_recent": False, "kinship_care": False,
        "household_churn": 0, "single_parent_unemployed": False,
        "household_risk_density": 0.0,
    }
    ent.update(flat)
    return ent


def add_row(ent: dict, reg: str, row: dict) -> dict:
    ent["rows_by_reg"].setdefault(reg, []).append(row)
    if reg not in ent["registries"]:
        ent["registries"].append(reg)
    ent["n_registries"] = len(ent["rows_by_reg"])
    return ent


def compose(base: dict, *muts) -> dict:
    ent = base
    for m in muts:
        ent = m(ent)
    return ent


# ── ВПО (переміщення) ──────────────────────────────────────────────
def with_idp(month: str = "2024-03-15", reatt_school: bool = True, reatt_doctor: bool = True):
    def f(ent):
        return add_row(ent, "VPO", {
            "displacement_date": month,
            "education_place": "школа №1" if reatt_school else "",
            "medical_needs": "забезпечено" if reatt_doctor else "не забезпечено"})
    return f


# ── ЄДЕБО (освіта) ─────────────────────────────────────────────────
def with_school_exit(month: str = "2024-02-15"):
    def f(ent):
        return add_row(ent, "EDEBO", {"study_status": "transferred", "status_effective_date": month})
    return f


def with_enrolled(inclusive: bool = False):
    def f(ent):
        return add_row(ent, "EDEBO", {"study_status": "enrolled",
                                      "special_category": "ООП" if inclusive else ""})
    return f


# ── АІКОМ (відвідуваність/оцінки) ──────────────────────────────────
def _aikom_series(ent, absences, gpas, start="2023-01"):
    sy, sm = map(int, start.split("-"))
    for i, (a, g) in enumerate(zip(absences, gpas)):
        m = sm + i
        y = sy + (m - 1) // 12
        mm = (m - 1) % 12 + 1
        add_row(ent, "AIKOM", {"attendance_period": f"{y}-{mm:02d}",
                               "missed_lessons_count": str(a), "score_12": str(g)})
    return ent


# Повний 24-міс. діапазон (присутній увесь рік, сплеск посередині) — щоб НЕ
# тригерити isuo_dropout (тиша до кінця). Пропуски/оцінки змінюються на середині.
def with_absence_spike():
    """absence_spike: change_point mag>=4, dir>0; присутній увесь рік (не dropout)."""
    def f(ent):
        return _aikom_series(ent, [0] * 12 + [18] * 12, [10] * 24)
    return f


def with_gpa_drop():
    """gpa_drop: change_point mag>=2, dir<0; присутній увесь рік."""
    def f(ent):
        return _aikom_series(ent, [0] * 24, [11] * 12 + [8] * 12)
    return f


def with_absence_and_gpa_drop():
    """E1-патерн: і пропуски зросли, і оцінки впали; присутній увесь рік."""
    def f(ent):
        return _aikom_series(ent, [0] * 12 + [18] * 12, [11] * 12 + [8] * 12)
    return f


def with_anti_bullying():
    def f(ent):
        return add_row(ent, "AIKOM", {"attendance_period": "2024-03",
                                      "anti_bullying_commission": "1", "missed_lessons_count": "0", "score_12": "10"})
    return f


def with_isuo_dropout(last: str = "2023-06"):
    """Тиша відвідуваності задовго до кінця (isuo_last_month < T-3). Без absence_spike."""
    def f(ent):
        return _aikom_series(ent, [1, 1, 1, 1, 1, 1], [10] * 6, start="2023-01")  # до 2023-06
    return f


# ── eHealth ────────────────────────────────────────────────────────
def with_chronic():
    def f(ent):
        return add_row(ent, "EHEALTH", {"resource_type": "condition", "condition_code": "chronic"})
    return f


def with_decl_terminated(end: str = "2024-04-15"):
    def f(ent):
        return add_row(ent, "EHEALTH", {"resource_type": "declaration", "status": "terminated", "end_date": end})
    return f


def with_decl_active():
    def f(ent):
        return add_row(ent, "EHEALTH", {"resource_type": "declaration", "status": "active"})
    return f


def with_missed_checkup():
    def f(ent):
        return add_row(ent, "EHEALTH", {"resource_type": "immunization", "status": "not_done"})
    return f


def with_trauma(repeat: bool = False, n: int = 1):
    def f(ent):
        for i in range(n):
            add_row(ent, "EHEALTH", {"resource_type": "encounter", "condition_category": "trauma",
                                     "condition_code": "T14", "is_repeat": "true" if repeat else "false"})
        return ent
    return f


def with_trauma_repeat():
    """trauma_repeat: 2 травми (або is_repeat)."""
    def f(ent):
        return with_trauma(n=2)(ent)
    return f


def with_psych():
    def f(ent):
        return add_row(ent, "EHEALTH", {"resource_type": "condition", "condition_category": "psych",
                                        "condition_code": "F43"})
    return f


# ── Діти війни ─────────────────────────────────────────────────────
def with_childwar(status: str):
    # status: "депортована" | "втратила батьків" | "переміщена"
    def f(ent):
        return add_row(ent, "CHILDWAR", {"status_category": status})
    return f


def with_deported():
    return with_childwar("депортована")


def with_war_grief():
    """Воєнне горе: переміщена + психічний сигнал, БЕЗ ознак насильства."""
    def f(ent):
        with_childwar("переміщена")(ent)
        with_psych()(ent)
        return ent
    return f


# ── ССД / Діти ─────────────────────────────────────────────────────
def with_ssd(status: str = "перебуває на обліку", low_income: bool = False, month: str = "2023-03-15"):
    def f(ent):
        return add_row(ent, "DITY", {"child_status": status,
                                     "difficult_life_circumstances": "так" if low_income else "ні",
                                     "primary_registration_date": month})
    return f


def with_ssd_hardship(month: str = "2023-03-15"):
    return with_ssd(status="у складних життєвих обставинах", low_income=True, month=month)


# ── ДРАЦС / суд / ЄРДР ─────────────────────────────────────────────
def with_parent_death():
    def f(ent):
        return add_row(ent, "DRACS", {"act_type": "смерть"})
    return f


def with_court_deprivation():
    def f(ent):
        return add_row(ent, "EDRSR", {"case_category": "позбавлення батьківських прав"})
    return f


def with_erdr(article: str, month: str = "2024-05-15"):
    def f(ent):
        return add_row(ent, "ERDR", {"preliminary_legal_qualification": f"ст.{article} ККУ",
                                     "register_entry_datetime": month})
    return f


def with_trafficking():
    return with_erdr("149")


def with_sexual_abuse():
    return with_erdr("152")


def with_dv_criminal():
    return with_erdr("126-1")


# ── ДН / гарячі лінії / житло / зайнятість / інвалідність ──────────
def with_dv(psych: bool = False, n: int = 1):
    def f(ent):
        for _ in range(n):
            add_row(ent, "DV", {"form_of_violence": "психологічне" if psych else "фізичне"})
        return ent
    return f


def with_hotline(psych: bool = True):
    def f(ent):
        return add_row(ent, "HOTLINE", {"violence_type": "психологічне" if psych else "фізичне"})
    return f


def with_disability():
    def f(ent):
        return add_row(ent, "CBI_DISABILITY", {"disability_category": "дитина з інвалідністю", "disability_group": "Б"})
    return f


def with_housing_alienation():
    def f(ent):
        return add_row(ent, "DRRP", {"child_residence_alienation": "так"})
    return f


def with_pfu_unemployed():
    def f(ent):
        return add_row(ent, "PFU", {"employment_status_indicator": "безробітний"})
    return f


# ── Сімейний граф (flat-ключі, що ставить familygraph.rollup) ──────
def with_sibling_in_care():
    def f(ent):
        ent["sibling_in_care"] = True
        return ent
    return f


def with_sibling_prior_violation(marks=("dv",)):
    def f(ent):
        ent["sibling_prior_violation"] = set(marks)
        return ent
    return f


def with_household_density(d: float):
    def f(ent):
        ent["household_risk_density"] = d
        return ent
    return f


def with_parent_push(addiction=False, criminal=False, mh=False, incarcerated=False):
    def f(ent):
        ent["parent_addiction"] = addiction
        ent["parent_criminal"] = criminal
        ent["parent_mental_health"] = mh
        ent["parent_incarcerated"] = incarcerated
        return ent
    return f


def with_kinship_care():
    def f(ent):
        ent["kinship_care"] = True
        return ent
    return f


# ── walled-сиблінг (для privacy-leak проб): сиблінг із медичним/слідчим ──
def with_sibling_walled(reg="EHEALTH"):
    """Інжектує walled-реєстр у sibling_prior_violation помилково (має бути НЕМОЖЛИВО)."""
    def f(ent):
        ent["sibling_prior_violation"] = set(ent.get("sibling_prior_violation") or set()) | {reg.lower()}
        return ent
    return f
