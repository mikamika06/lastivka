"""
Модуль 1 (ядро) — REAL model. Реалістична популяція дітей України:
  демографія (реальні розподіли) -> латентні контекст-фактори (корельовані)
  -> УМОВНЕ призначення порушень (P = base × Π множників) -> траєкторія в часі.

Принцип: БІЛЬШІСТЬ ДІТЕЙ БЕЗ ПОРУШЕНЬ. Фон (бідність, ВПО, дистанційка) поширений,
але це не порушення. Ризики рідкісні й корельовані (коморбідність). Кожна дитина різна.
"""
from __future__ import annotations
from datetime import date
import random

from .entity import Child, birth_date_from_band, make_child, weighted_choice
from .trajectory import MonthState


def _set_from(states, t0, **kw):
    for t in range(max(0, t0), len(states)):
        for k, v in kw.items():
            setattr(states[t], k, v)


# ── контекст ──
def sample_context(child: Child, epi: dict, rng: random.Random) -> None:
    ctx = epi["context"]
    links = epi["context_links"]

    child.geo_tier = weighted_choice(ctx["geo_tier"], rng)
    war_zone = child.geo_tier in ("frontline", "deoccupied", "occupied")

    idp_p = ctx["idp_rate"] * (links["frontline_idp_mult"] if war_zone else 1.0)
    child.is_idp = rng.random() < min(idp_p, 0.85)

    child.poverty = weighted_choice(ctx["poverty"], rng)
    child.family_type = weighted_choice(ctx["family"], rng)

    une_p = ctx["parental"]["unemployment"] * (links["poverty_unemployment_mult"] if child.poverty != "ok" else 1.0)
    child.par_unemployment = rng.random() < min(une_p, 0.6)
    add_p = ctx["parental"]["addiction"] * (links["deep_poverty_addiction_mult"] if child.poverty == "deep" else 1.0)
    child.par_addiction = rng.random() < min(add_p, 0.3)
    child.par_disability = rng.random() < ctx["parental"]["disability"]

    dis_p = ctx["child_disability"] * (links["disability_poverty_mult"] if child.poverty != "ok" else 1.0)
    child.has_disability = rng.random() < dis_p
    child.has_chronic = rng.random() < ctx["child_chronic"]

    # латентний фактор домашнього насильства (контекст для P1/W2/F6)
    dv = 0.04 * (3.0 if child.par_addiction else 1.0) * (1.6 if child.poverty == "deep" else 1.0) * \
         (1.2 if child.family_type == "single_parent" else 1.0)
    child.dv_household = rng.random() < min(dv, 0.4)
    child.war_status = None


def _flags(child: Child) -> dict:
    war = child.geo_tier in ("frontline", "deoccupied", "occupied")
    return {
        "idp": child.is_idp, "deep": child.poverty == "deep",
        "poor": child.poverty in ("poor", "deep"),
        "child_disability": child.has_disability, "child_chronic": child.has_chronic,
        "frontline": child.geo_tier == "frontline", "deoccupied": child.geo_tier == "deoccupied",
        "occupied": child.geo_tier == "occupied", "rural": child.urban_rural == "rural",
        "war_exposure": war, "war_loss": child.family_type == "no_parental_care" and war,
        "no_parental_care": child.family_type == "no_parental_care",
        "single_parent": child.family_type == "single_parent",
        "many_children": child.family_type == "many_children",
        "addiction": child.par_addiction, "parental_disability": child.par_disability,
        "no_breadwinner": child.par_unemployment and child.family_type in ("single_parent", "no_parental_care"),
        "dv_household": getattr(child, "dv_household", False), "bullying": False,
    }


def _prob(base, mult, flags, cap):
    p = base
    for k, m in (mult or {}).items():
        if flags.get(k):
            p *= m
    return min(p, cap)


# ── призначення порушень ──
def assign_violations(child: Child, epi: dict, sim_start: date, T: int, rng: random.Random) -> None:
    V = epi["violations"]
    cap = V["cap"]
    flags = _flags(child)
    child.labels = {}

    def maybe(vid, school_age_only=False):
        if vid not in V:
            return
        if school_age_only and not (6 <= child.age_at(sim_start, T - 1) <= 17):
            return
        if vid == "W8_medical_access" and not (child.has_chronic and child.is_idp):
            return  # обрив медичної допомоги: хронік + переміщення (втрата прикріплення)
        p = _prob(V[vid]["base"], V[vid].get("mult"), flags, cap)
        if rng.random() < p:
            child.labels[vid] = rng.randint(3, max(4, T - 4))

    # E1 спершу (W2 від нього залежить)
    maybe("E1_bullying", school_age_only=True)
    flags["bullying"] = "E1_bullying" in child.labels

    for vid in ("W3_out_of_education", "W8_medical_access", "W2_psych_trauma",
                "W6_orphanhood", "W5_deportation", "W7_trafficking",
                "F3_neglect", "P1_physical_home", "F6_sexual_abuse", "F4_child_labor"):
        maybe(vid, school_age_only=(vid in ("W3_out_of_education", "F4_child_labor")))

    # E4 інклюзія — лише для дітей з інвалідністю
    if child.has_disability and 6 <= child.age_at(sim_start, T - 1) <= 17:
        p = _prob(V["E4_inclusion"]["base"], V["E4_inclusion"].get("mult"), flags, cap)
        if rng.random() < p:
            child.labels["E4_inclusion"] = rng.randint(3, max(4, T - 4))

    # W1: переміщення з порушенням сервісу (ВПО + обрив освіти/медицини)
    if child.is_idp and (child.labels.keys() & {"W3_out_of_education", "W8_medical_access"}):
        child.labels["W1_displacement"] = min(child.labels.get("W3_out_of_education", T),
                                              child.labels.get("W8_medical_access", T))

    # статус «Діти війни»
    if "W5_deportation" in child.labels:
        child.war_status = "deported"
    elif "W6_orphanhood" in child.labels and flags["war_exposure"]:
        child.war_status = "lost_parents"
    elif child.is_idp and flags["war_exposure"]:
        child.war_status = "displaced"


# ── траєкторія (стан у часі для емітерів) ──
def build_states(child: Child, sim_start: date, T: int, rng: random.Random) -> None:
    states = []
    for t in range(T):
        age = child.age_at(sim_start, t)
        school = "preschool" if age < 6 else ("graduated" if age > 17 else "enrolled")
        fam = "stressed" if (child.family_type == "single_parent" and rng.random() < 0.2) else "intact"
        states.append(MonthState(school=school, family=fam))
    child.states = states

    # переміщення (ВПО) — навіть без порушення populates VPO
    if child.is_idp:
        child.idp_month = rng.randint(2, max(3, T - 6))
        _set_from(states, child.idp_month, residence="displaced")

    L = child.labels
    if "W3_out_of_education" in L:
        m = L["W3_out_of_education"]; states[m].school = "at_risk"; _set_from(states, m + 1, school="dropped")
    if "F4_child_labor" in L:
        m = L["F4_child_labor"]; _set_from(states, m, school="at_risk")
    if "W8_medical_access" in L:
        _set_from(states, L["W8_medical_access"], health="lapsed")
    if "F3_neglect" in L:
        m = L["F3_neglect"]; _set_from(states, m, health="lapsed", school="at_risk", protection="observed")
    if "W2_psych_trauma" in L:
        _set_from(states, L["W2_psych_trauma"], family="stressed", safety="abuse_risk")
    if "E1_bullying" in L:
        _set_from(states, L["E1_bullying"], school="at_risk")
    if "W6_orphanhood" in L:
        _set_from(states, L["W6_orphanhood"], family="orphan", protection="in_care")
    if "W5_deportation" in L:
        _set_from(states, L["W5_deportation"], residence="abroad", family="separated", protection="unaccompanied")
    if "W7_trafficking" in L:
        _set_from(states, L["W7_trafficking"], protection="unaccompanied", safety="abuse_active")
    if "P1_physical_home" in L:
        _set_from(states, L["P1_physical_home"], safety="abuse_active", family="crisis")
    if "F6_sexual_abuse" in L:
        _set_from(states, L["F6_sexual_abuse"], safety="abuse_active", family="crisis")


def build_population(cfg: dict, epi: dict, rng: random.Random) -> list[Child]:
    pop = cfg["population"]
    sim_start = date(pop["start_year"], 1, 1)
    T = pop["months"]
    n = pop["n_children"]
    demo = epi["demographics"]
    no_rnokpp = cfg["noise"]["no_rnokpp_rate"]

    children = []
    for i in range(n):
        gender = weighted_choice(demo["sex"], rng)
        band = weighted_choice(demo["age_bands"], rng)
        bd = birth_date_from_band(band, sim_start, rng)
        oblast = weighted_choice(demo["oblast_weights"], rng)
        ur = weighted_choice(demo["urban_rural"], rng)
        child = make_child(i, gender, bd, oblast, ur, no_rnokpp, rng)
        sample_context(child, epi, rng)
        assign_violations(child, epi, sim_start, T, rng)
        build_states(child, sim_start, T, rng)
        children.append(child)
    return children
