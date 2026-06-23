"""
Комбінаторний генератор проб — вичерпна «cell-by-cell» проба.

Для кожного активного порушення задаємо driver (R) і набір конфаундерів (C).
Кожна пара (R,C) проганяється як диференціал; додатково кожен driver/конфаундер
обгортається популяційними контекстами (вік, бідність, ВПО, інвалідність), щоб
покрити «дуже різних людей у дуже різних ситуаціях».
"""
from __future__ import annotations

from . import builders as B
from .builders import base_entity, compose
from .differential import DifferentialPair, run_differential

# Популяційні обгортки (контекст, що НЕ має сам по собі змінювати спрацювання драйвера)
POP_CONTEXTS = {
    "school_age": lambda: base_entity(birth_date="2012-06-15"),
    "toddler": lambda: base_entity(birth_date="2021-06-15"),
    "teen": lambda: base_entity(birth_date="2008-06-15"),
}

# ── Специфікація на кожне активне порушення: driver + конфаундери ────────────
# Кожен елемент confounders: (назва, кортеж-мутацій, очікування_fire?) — fire=False => має НЕ спрацювати
VIOLATION_SPECS = {
    "F3_neglect": {
        "driver": (B.with_missed_checkup(), B.with_absence_spike(), B.with_ssd_hardship()),
        "confounders": [
            ("chronic_illness", (B.with_chronic(), B.with_missed_checkup(), B.with_absence_spike(), B.with_ssd_hardship())),
            ("disability", (B.with_disability(), B.with_missed_checkup(), B.with_absence_spike(), B.with_ssd_hardship())),
        ]},
    "W8_medical_access": {
        "driver": (B.with_chronic(), B.with_idp(reatt_doctor=False), B.with_decl_terminated()),
        "confounders": [
            ("care_reestablished", (B.with_chronic(), B.with_idp(reatt_doctor=True), B.with_decl_terminated())),
        ]},
    "F4_child_labor": {
        "driver": (B.with_absence_spike(),),
        "confounders": [
            ("chronic_illness", (B.with_chronic(), B.with_absence_spike())),
            ("disability", (B.with_disability(), B.with_absence_spike())),
        ]},
    "E1_bullying": {
        "driver": (B.with_absence_and_gpa_drop(), B.with_anti_bullying()),
        "confounders": [
            ("academic_anxiety", (B.with_absence_and_gpa_drop(), B.with_psych())),
        ]},
    "P1_physical_home": {
        "driver": (B.with_trauma_repeat(), B.with_dv()),
        "confounders": [
            ("accidental_injury", (B.with_trauma_repeat(),)),  # sentinel: має лишатись зеленим
        ]},
    "W1_displacement": {
        "driver": (B.with_idp(), B.with_school_exit()),
        "confounders": [
            ("intact_services", (B.with_idp(reatt_school=True, reatt_doctor=True), B.with_enrolled())),
        ]},
    "W3_out_of_education": {
        "driver": (B.with_school_exit(),),
        "confounders": [
            ("enrolled_ok", (B.with_enrolled(),)),  # просто зарахований — не має давати W3
        ]},
    "E4_inclusion": {
        "driver": (B.with_disability(), B.with_enrolled(inclusive=False)),
        "confounders": [
            ("inclusive_supported", (B.with_disability(), B.with_enrolled(inclusive=True))),
        ]},
    "W6_orphanhood": {
        "driver": (B.with_parent_death(), B.with_ssd()),
        "confounders": [
            ("death_no_ssd", (B.with_parent_death(),)),  # смерть без обліку — не флагаємо (потрібен ССД)
        ]},
}


def build_matrix() -> list:
    """Розгортає повну матрицю DifferentialPair (порушення × конфаундер × популяція)."""
    pairs = []
    for viol, spec in VIOLATION_SPECS.items():
        for cname, cmuts in spec["confounders"]:
            for pname, pbase in POP_CONTEXTS.items():
                # лише шкільний вік для шкільних правил, щоб не плодити очевидні (вік-гейт) шуми
                if viol in ("W3_out_of_education", "F4_child_labor", "E1_bullying", "E4_inclusion") and pname == "toddler":
                    continue
                pairs.append(DifferentialPair(
                    id=f"{viol}__{cname}__{pname}", hotspot=viol, violation=viol,
                    base=pbase, risk_signal=spec["driver"], confounder=cmuts,
                    tags=("FP-confounder", cname)))
    return pairs


def run_matrix() -> dict:
    pairs = build_matrix()
    results = [run_differential(p) for p in pairs]
    fp = [r for r in results if any(f.failure_class.value == "FP-confounder" for f in r["failures"])]
    fn = [r for r in results if any(f.failure_class.value == "FN-missed" for f in r["failures"])]
    spur = [r for r in results if any(f.failure_class.value == "FP-spurious" for f in r["failures"])]
    # унікальні (violation, confounder) FP-кластери
    fp_clusters = sorted({(r["violation"], r["pair"].split("__")[1]) for r in fp})
    return {"total": len(results), "fp_confounder": len(fp), "fn": len(fn), "spurious": len(spur),
            "fp_clusters": fp_clusters,
            "fp_detail": [{"id": r["pair"], "violation": r["violation"], "table": r["table"]} for r in fp],
            "fn_detail": [{"id": r["pair"], "violation": r["violation"], "table": r["table"]} for r in fn],
            "spur_detail": [{"id": r["pair"], "violation": r["violation"], "table": r["table"]} for r in spur]}
