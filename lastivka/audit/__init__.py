"""
Ластівка — харнес фолт-інжекції та диференційного тестування (cell-by-cell аудит).

Пряма-entity проба: detect_entity + score_entity — чисті функції, тож сценарій
будується вручну (rows_by_reg + конфаундери) і ганяється детерміновано, без
повної регенерації 5000 дітей і без fuzzy-нондетермінізму matching.

Оракул — НЕЗАЛЕЖНІ написані вручну очікування (не god-view, бо god-view сам
генерується assign_violations і може бути хибним).
"""
from .scenario import Scenario, Expectation, Outcome, FailureFinding  # noqa: F401
from .taxonomy import FailureClass  # noqa: F401
from .runner import run_scenario, run_suite  # noqa: F401
from .differential import DifferentialPair, run_differential  # noqa: F401
