"""Незалежний евалюатор Expectation → list[FailureFinding]. НЕ використовує god-view."""
from __future__ import annotations

from .scenario import Expectation, FailureFinding
from .taxonomy import FailureClass, SEVERITY_RANK

_TIER_ORDER = {None: 0, "T2": 1, "T1": 2, "T0": 3}
_WALLED = {"EHEALTH", "ERDR", "TERVIS"}


def _sev(fc: FailureClass) -> str:
    return SEVERITY_RANK.get(fc, "medium")


def _tier_rank(t):
    return _TIER_ORDER.get(t, 0)


def evaluate(expect: Expectation, detections: list, scored, tags=()) -> list:
    """Звіряє фактичний вихід з очікуванням. Повертає список збоїв (порожній == ОК)."""
    failures = []
    fired = {d["violation"] for d in detections}
    child_fired = {d["violation"] for d in detections if d.get("dimension") != "parental"}
    confounder = any("confounder" in str(t).lower() or "illness" in str(t).lower()
                     or "grief" in str(t).lower() or "poverty" in str(t).lower() for t in tags)

    # must_fire (FN)
    for v in expect.must_fire:
        if v not in fired:
            fc = FailureClass.FN_MISSED
            failures.append(FailureFinding(fc, v, "fire", "absent", _sev(fc),
                                           "очікуване порушення не виявлено"))

    # must_not_fire (FP)
    for v in expect.must_not_fire:
        if v in fired:
            fc = FailureClass.FP_CONFOUNDER if confounder else FailureClass.FP_SPURIOUS
            failures.append(FailureFinding(fc, v, "absent", "fired", _sev(fc),
                                           "спрацювало там, де не мало (конфаундер)" if confounder
                                           else "спрацювало без драйвера"))

    # tier
    tier = scored.get("tier") if scored else None
    if expect.tier_exact is not None and tier != expect.tier_exact:
        fc = FailureClass.WRONG_TIER
        failures.append(FailureFinding(fc, tier or "—", expect.tier_exact, str(tier), _sev(fc), "tier_exact"))
    if expect.tier_at_most is not None and _tier_rank(tier) > _tier_rank(expect.tier_at_most):
        fc = FailureClass.WRONG_TIER
        failures.append(FailureFinding(fc, tier or "—", f"<= {expect.tier_at_most}", str(tier), _sev(fc),
                                       "tier завищено"))
    if expect.tier_at_least is not None and _tier_rank(tier) < _tier_rank(expect.tier_at_least):
        fc = FailureClass.WRONG_TIER
        failures.append(FailureFinding(fc, tier or "—", f">= {expect.tier_at_least}", str(tier), _sev(fc),
                                       "tier занижено"))

    # max_score
    if expect.max_score is not None and scored and scored.get("score", 0) > expect.max_score:
        fc = FailureClass.WRONG_TIER
        failures.append(FailureFinding(fc, "score", f"<= {expect.max_score}", str(scored.get("score")),
                                       _sev(fc), "score завищено"))

    # evidence_superset (WRONG_REASON)
    by_v = {d["violation"]: set(d.get("evidence", [])) for d in detections}
    for v, need in expect.evidence_superset.items():
        got = by_v.get(v, set())
        if not set(need).issubset(got):
            fc = FailureClass.WRONG_REASON
            failures.append(FailureFinding(fc, v, f"evidence ⊇ {sorted(need)}", str(sorted(got)),
                                           _sev(fc), "недостатні докази-реєстри"))

    # privacy: жоден child-код не має walled-реєстру як доказ через сиблінг-шлях
    if expect.no_walled_in_evidence:
        for d in detections:
            if d.get("dimension") == "parental":
                continue
            leaked = _WALLED & set(d.get("evidence", []))
            # walled у власній вертикалі дитини (ЄРДР для P1/W7/F6) — легітимно; перевіряємо лише spillover-теги
            if leaked and "spillover" in " ".join(str(t) for t in tags):
                fc = FailureClass.PRIVACY_LEAK
                failures.append(FailureFinding(fc, d["violation"], "no walled via sibling",
                                               str(sorted(leaked)), _sev(fc), "walled протік через сиблінг"))

    return failures
