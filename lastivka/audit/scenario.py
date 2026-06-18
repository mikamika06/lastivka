"""Дата-структури сценарію: Scenario / Mutation / Expectation / Outcome."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Callable, Optional

from .taxonomy import FailureClass


@dataclass(frozen=True)
class Expectation:
    """Незалежний оракул (НЕ god-view). Встав лише те, що стверджуєш."""
    must_fire: frozenset = frozenset()            # ці порушення МУСЯТЬ бути присутні
    must_not_fire: frozenset = frozenset()        # ці МУСЯТЬ бути відсутні (FP-guard)
    tier_at_most: Optional[str] = None            # "T2"/"T1"/"T0"/None(=без флагу)
    tier_at_least: Optional[str] = None
    tier_exact: Optional[str] = None
    evidence_superset: dict = field(default_factory=dict)   # vid -> набір реєстрів, що МУСЯТЬ бути в evidence
    max_score: Optional[float] = None
    no_walled_in_evidence: bool = False           # жоден child-код не сміє мати EHEALTH/ERDR/TERVIS як sibling-сигнал
    rationale: str = ""                           # ЧОМУ людина так вважає (права дитини, не god-view)


@dataclass
class Scenario:
    id: str
    hotspot: str                                  # правило/модуль під тестом, напр. "F3_neglect"
    build: Callable[[], dict]                     # () -> entity dict (rows_by_reg + flat keys)
    expect: Expectation
    tags: tuple = ()                              # ("FP-confounder","illness")
    note: str = ""


@dataclass
class FailureFinding:
    failure_class: FailureClass
    violation: str
    expected: str
    actual: str
    severity: str
    detail: str = ""


@dataclass
class Outcome:
    scenario_id: str
    hotspot: str
    detections: list                              # сирий вихід detect_entity
    scored: Optional[dict]                        # сирий вихід score_entity (None якщо без tier)
    failures: list                                # list[FailureFinding]; порожній == пройдено
    tags: tuple = ()

    @property
    def passed(self) -> bool:
        return not self.failures

    def summary(self) -> str:
        if self.passed:
            return f"PASS  {self.scenario_id}"
        fc = ", ".join(f"{f.failure_class.value}:{f.violation}" for f in self.failures)
        return f"FAIL  {self.scenario_id}  -> {fc}"
