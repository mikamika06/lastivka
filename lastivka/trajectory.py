"""
Модуль 1б — Trajectory: прихована життєва траєкторія дитини (state machine у часі)
+ ШОКИ (= мітки порушень). Крос-реєстровий підпис виникає з емісії (модуль emitters),
а тут ми лише задаємо ПРИЧИНУ — зміну прихованого стану.

Стан НЕ потрапляє в реєстри — це god-view. Детектор бачить лише емітовані логи.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import date
import random

from .entity import Child


@dataclass
class MonthState:
    residence: str = "stable"     # stable | displaced | abroad | TOT
    school: str = "enrolled"      # preschool | enrolled | at_risk | dropped | graduated
    health: str = "active"        # active | lapsed
    family: str = "intact"        # intact | stressed | crisis | orphan | separated
    protection: str = "none"      # none | observed | in_care | unaccompanied
    safety: str = "none"          # none | abuse_risk | abuse_active


@dataclass
class Shock:
    kind: str
    month: int


def _baseline(child: Child, cfg: dict, rng: random.Random) -> list[MonthState]:
    T = cfg["population"]["months"]
    sim_start = date(cfg["population"]["start_year"], 1, 1)
    states = []
    for t in range(T):
        age = child.age_at(sim_start, t)
        school = "preschool" if age < 6 else "enrolled"
        family = "intact"
        if child.family_base == "single_parent" and rng.random() < 0.25:
            family = "stressed"
        states.append(MonthState(school=school, family=family))
    return states


def _set_from(states, t0, **kw):
    for t in range(t0, len(states)):
        for k, v in kw.items():
            setattr(states[t], k, v)


# ---- застосування кожного шоку: мутує стан + повертає {violation_id: onset} ----

def _displacement(child, states, m, rng):
    labels = {}
    _set_from(states, m, residence="displaced")
    labels["W1_displacement"] = m
    if rng.random() < 0.70:  # не влаштувався в нову школу
        states[m].school = "at_risk"
        _set_from(states, m + 1, school="dropped")
        labels["W3_out_of_education"] = min(m + 1, len(states) - 1)
    if rng.random() < 0.60:  # обрив медичного прикріплення
        _set_from(states, m, health="lapsed")
        if child.has_chronic:
            labels["W8_medical_access"] = m
    return labels


def _out_of_education(child, states, m, rng):
    states[m].school = "at_risk"
    _set_from(states, m + 1, school="dropped")
    return {"W3_out_of_education": m}


def _psych_trauma(child, states, m, rng):
    _set_from(states, m, family="stressed", safety="abuse_risk")
    return {"W2_psych_trauma": m}


def _orphanhood(child, states, m, rng):
    _set_from(states, m, family="orphan", protection="in_care")
    return {"W6_orphanhood": m}


def _deportation(child, states, m, rng):
    _set_from(states, m, residence="abroad", family="separated", protection="unaccompanied")
    return {"W5_deportation": m}


def _trafficking(child, states, m, rng):
    _set_from(states, m, protection="unaccompanied", safety="abuse_active")
    return {"W7_trafficking": m}


def _neglect(child, states, m, rng):
    _set_from(states, m, health="lapsed", school="at_risk", protection="observed")
    return {"F3_neglect": m}


def _physical_abuse_home(child, states, m, rng):
    _set_from(states, m, safety="abuse_active", family="crisis")
    return {"P1_physical_home": m}


def _bullying(child, states, m, rng):
    _set_from(states, m, school="at_risk")
    return {"E1_bullying": m}


def _sexual_abuse(child, states, m, rng):
    _set_from(states, m, safety="abuse_active", family="crisis")
    return {"F6_sexual_abuse": m}


_SHOCK_FN = {
    "displacement": _displacement,
    "out_of_education": _out_of_education,
    "psych_trauma": _psych_trauma,
    "orphanhood": _orphanhood,
    "deportation": _deportation,
    "trafficking": _trafficking,
    "neglect": _neglect,
    "physical_abuse_home": _physical_abuse_home,
    "bullying": _bullying,
    "sexual_abuse": _sexual_abuse,
}


def _weighted_choice(weights: dict, rng: random.Random) -> str:
    items = list(weights.items())
    total = sum(w for _, w in items)
    r = rng.uniform(0, total)
    acc = 0
    for k, w in items:
        acc += w
        if r <= acc:
            return k
    return items[-1][0]


def build_trajectories(children: list[Child], cfg: dict, rng: random.Random) -> None:
    """Призначає шоки частині дітей і будує прихований стан для всіх."""
    T = cfg["population"]["months"]
    vr = cfg["violation_rate"]
    weights = cfg["shock_weights"]

    for child in children:
        states = _baseline(child, cfg, rng)
        child.shocks = []
        child.labels = {}
        if rng.random() < vr:
            kind = _weighted_choice(weights, rng)
            m = rng.randint(3, max(4, T - 4))
            child.shocks.append(Shock(kind=kind, month=m))
            labels = _SHOCK_FN[kind](child, states, m, rng)
            child.labels.update(labels)
        child.states = states
