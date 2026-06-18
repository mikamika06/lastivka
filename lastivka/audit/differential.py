"""
Confounder-isolation differential — ядро «справжній ризик vs просто захворіла».

Для правила з драйвером R і конфаундером C будуємо 4 entity й перевіряємо
таблицю істинності:
  neither          -> правило НЕ спрацьовує
  confounder_only  -> правило НЕ спрацьовує   (інакше FP-confounder: хворобу прийняли за ризик)
  risk_only        -> правило СПРАЦЬОВУЄ       (інакше FN: драйвер пропущено)
  both             -> правило спрацьовує
"""
from __future__ import annotations
from dataclasses import dataclass, field

from .builders import compose
from .runner import run_entity
from .scenario import FailureFinding
from .taxonomy import FailureClass


@dataclass
class DifferentialPair:
    id: str
    hotspot: str
    base: callable                  # () -> свіжа entity
    risk_signal: tuple              # R: мутації справжнього драйвера
    confounder: tuple               # C: мутації benign-двійника (хвороба/горе/бідність)
    violation: str                  # код під тестом
    rationale: str = ""
    tags: tuple = field(default_factory=tuple)


def run_differential(pair: DifferentialPair) -> dict:
    variants = {
        "neither": compose(pair.base()),
        "confounder_only": compose(pair.base(), *pair.confounder),
        "risk_only": compose(pair.base(), *pair.risk_signal),
        "both": compose(pair.base(), *pair.risk_signal, *pair.confounder),
    }
    table, scored_tier = {}, {}
    for name, ent in variants.items():
        dets, scored = run_entity(ent)
        table[name] = pair.violation in {d["violation"] for d in dets}
        scored_tier[name] = scored.get("tier") if scored else None

    failures = []
    if table["neither"]:
        failures.append(FailureFinding(FailureClass.FP_SPURIOUS, pair.violation, "absent", "fired",
                                       "high", "спрацювало на порожній базі"))
    if table["confounder_only"]:
        failures.append(FailureFinding(FailureClass.FP_CONFOUNDER, pair.violation, "absent", "fired",
                                       "high", f"{pair.id}: конфаундер БЕЗ драйвера спрацював (хворобу прийняли за ризик)"))
    if not table["risk_only"]:
        failures.append(FailureFinding(FailureClass.FN_MISSED, pair.violation, "fire", "absent",
                                       "critical", f"{pair.id}: драйвер БЕЗ конфаундера не спрацював"))
    return {"pair": pair.id, "hotspot": pair.hotspot, "violation": pair.violation,
            "table": table, "tiers": scored_tier, "failures": failures,
            "passed": not failures, "rationale": pair.rationale}


def run_differentials(pairs: list) -> dict:
    results = [run_differential(p) for p in pairs]
    failed = [r for r in results if not r["passed"]]
    return {"total": len(results), "passed": len(results) - len(failed),
            "failed": len(failed), "results": results}
