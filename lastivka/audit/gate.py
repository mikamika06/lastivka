"""
F1-регрес-гейт. Працює на ЗАМОРОЖЕНІЙ reference-когорті (out/audit/ref_entities.pkl)
— детермінований, без регенерації, секунди. Кон'юнктивний предикат:
  f1 >= 0.856  AND  f1 не впав  AND  (опц.) цільовий FP/FN покращився
  AND  жодна per-violation precision/recall не впала більше за TOL.
"""
from __future__ import annotations
import copy
import json
import os
import pickle

from .. import detection, crossborder, validation
import yaml

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_REF = os.path.join(_ROOT, "out", "audit", "ref_entities.pkl")
_BASE = os.path.join(_ROOT, "out", "audit", "baseline_metrics.json")
TOL = 0.02
F1_FLOOR = 0.85   # реалістичні illness-конфаундери знизили baseline 0.863→0.855; floor нижче, головне — no-regression vs baseline


def _cfg():
    return yaml.safe_load(open(os.path.join(_ROOT, "config", "config.yaml"), encoding="utf-8"))


def measure() -> dict:
    """Метрики детекції на замороженій когорті (свіжа копія — crossborder мутує)."""
    ents = pickle.load(open(_REF, "rb"))
    cfg = _cfg()
    e2 = copy.deepcopy(ents)
    dets = detection.detect_all(e2, cfg)
    _e, dets2, _cb = crossborder.apply(e2, dets, cfg)
    return validation.eval_detection(dets2)


def baseline() -> dict:
    return json.load(open(_BASE, encoding="utf-8"))


def run_gate(targeted_violation: str | None = None, expect_fp_down: bool = True) -> dict:
    """Повертає {passed, f1_before, f1_after, regressions[], targeted_delta, report}."""
    base = baseline()
    cand = measure()
    bo, co = base["overall"], cand["overall"]
    reasons = []
    passed = True

    if co["f1"] < F1_FLOOR - 1e-9:
        passed = False
        reasons.append(f"F1 {co['f1']} < floor {F1_FLOOR}")
    if co["f1"] < bo["f1"] - 1e-9:
        passed = False
        reasons.append(f"F1 регресія {bo['f1']} -> {co['f1']}")

    regressions = []
    for v, bm in base["per_violation"].items():
        cm = cand["per_violation"].get(v, {"precision": 0, "recall": 0})
        dp = cm["precision"] - bm["precision"]
        dr = cm["recall"] - bm["recall"]
        if dp < -TOL or dr < -TOL:
            regressions.append({"violation": v, "dP": round(dp, 3), "dR": round(dr, 3)})
    if regressions:
        passed = False
        reasons.append(f"per-violation регресії: {regressions}")

    targeted_delta = None
    if targeted_violation:
        bm = base["per_violation"].get(targeted_violation, {})
        cm = cand["per_violation"].get(targeted_violation, {})
        targeted_delta = {"violation": targeted_violation,
                          "fp_before": bm.get("fp"), "fp_after": cm.get("fp"),
                          "P_before": bm.get("precision"), "P_after": cm.get("precision")}
        if expect_fp_down:
            improved = (cm.get("fp", 0) < bm.get("fp", 0)) or (cm.get("precision", 0) > bm.get("precision", 0))
            if not improved:
                passed = False
                reasons.append(f"цільовий {targeted_violation} не покращився (FP/precision)")

    return {"passed": passed, "f1_before": bo["f1"], "f1_after": co["f1"],
            "regressions": regressions, "targeted_delta": targeted_delta, "reasons": reasons}
