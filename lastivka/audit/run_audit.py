"""CLI харнесу: self-test (builder фліпає свій сигнал) + прогін diff-пар і сценаріїв."""
from __future__ import annotations
import argparse
import os
import yaml

from .. import detection
from . import builders as B
from .builders import base_entity, compose
from .differential import run_differentials
from .runner import run_suite, suite_report

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _cfg():
    return yaml.safe_load(open(os.path.join(_ROOT, "config", "config.yaml"), encoding="utf-8"))


# builder -> (signal_key, predicate(value)->bool)
_SELFTEST = [
    ("with_idp", B.with_idp(), "has_idp", lambda v: v is True),
    ("with_school_exit", B.with_school_exit(), "school_exit", lambda v: v is True),
    ("with_enrolled", B.with_enrolled(), "enrolled_ever", lambda v: v is True),
    ("with_enrolled(inclusive)", B.with_enrolled(inclusive=True), "edebo_inclusive", lambda v: v is True),
    ("with_absence_spike", B.with_absence_spike(), "absence_spike", lambda v: v is True),
    ("with_gpa_drop", B.with_gpa_drop(), "gpa_drop", lambda v: v is True),
    ("with_anti_bullying", B.with_anti_bullying(), "anti_bullying", lambda v: v is True),
    ("with_chronic", B.with_chronic(), "has_chronic", lambda v: v is True),
    ("with_decl_terminated", B.with_decl_terminated(), "decl_terminated", lambda v: v is True),
    ("with_missed_checkup", B.with_missed_checkup(), "missed_checkup", lambda v: v is True),
    ("with_trauma_repeat", B.with_trauma_repeat(), "trauma_repeat", lambda v: v is True),
    ("with_psych", B.with_psych(), "psych_present", lambda v: v is True),
    ("with_deported", B.with_deported(), "childwar_status", lambda v: v == "deported"),
    ("with_ssd", B.with_ssd(), "ssd_present", lambda v: v is True),
    ("with_ssd_hardship", B.with_ssd_hardship(), "ssd_low_income", lambda v: v is True),
    ("with_parent_death", B.with_parent_death(), "parent_death", lambda v: v is True),
    ("with_court_deprivation", B.with_court_deprivation(), "court_deprivation", lambda v: v is True),
    ("with_trafficking", B.with_trafficking(), "erdr_article", lambda v: v == "149"),
    ("with_sexual_abuse", B.with_sexual_abuse(), "erdr_article", lambda v: v == "152"),
    ("with_dv_criminal", B.with_dv_criminal(), "erdr_article", lambda v: v == "126-1"),
    ("with_dv", B.with_dv(), "police_calls", lambda v: v > 0),
    ("with_dv(psych)", B.with_dv(psych=True), "dv_psych", lambda v: v is True),
    ("with_hotline", B.with_hotline(), "hotline_psych", lambda v: v is True),
    ("with_disability", B.with_disability(), "has_disability", lambda v: v is True),
    ("with_housing_alienation", B.with_housing_alienation(), "housing_alienation", lambda v: v is True),
    ("with_pfu_unemployed", B.with_pfu_unemployed(), "pfu_unemployed", lambda v: v is True),
    ("with_isuo_dropout", B.with_isuo_dropout(), "isuo_last_month", lambda v: v is not None and v < 21),
]


def self_test() -> int:
    cfg = _cfg()
    bad = 0
    for name, mut, key, pred in _SELFTEST:
        ent = compose(base_entity(), mut)
        s = detection._signals(ent, cfg)
        ok = pred(s.get(key))
        if not ok:
            bad += 1
            print(f"  FAIL  {name:28} -> s[{key!r}] = {s.get(key)!r}")
        else:
            print(f"  ok    {name:28} -> s[{key!r}] = {s.get(key)!r}")
    print(f"\nself-test: {len(_SELFTEST) - bad}/{len(_SELFTEST)} builders correct")
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        raise SystemExit(1 if self_test() else 0)
    # за замовчуванням — диференціали + сценарії з бібліотеки
    from .scenarios import ALL_DIFFERENTIALS, ALL_SCENARIOS
    dr = run_differentials(ALL_DIFFERENTIALS)
    print("differentials:", dr["passed"], "/", dr["total"], "passed")
    for r in dr["results"]:
        if not r["passed"]:
            print("  DIFF FAIL", r["pair"], r["violation"], r["table"])
    sr = suite_report(run_suite(ALL_SCENARIOS))
    print("scenarios:", sr["passed"], "/", sr["total"], "passed; by_class:", sr["by_class"])


if __name__ == "__main__":
    main()
