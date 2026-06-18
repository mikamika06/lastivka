"""Детермінований раннер сценаріїв: build → detect_entity → score_entity → evaluate."""
from __future__ import annotations
import os
import yaml

from .. import detection, scoring
from .scenario import Outcome
from . import oracle

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_CFG = None
_W = None


def _load():
    global _CFG, _W
    if _CFG is None:
        _CFG = yaml.safe_load(open(os.path.join(_ROOT, "config", "config.yaml"), encoding="utf-8"))
        _W = scoring.load_weights(os.path.join(_ROOT, "config", "scoring.yaml"))
    return _CFG, _W


def run_entity(ent: dict):
    """Чистий прогін однієї entity → (detections, scored). Детерміновано."""
    cfg, w = _load()
    dets = detection.detect_entity(ent, cfg)
    scored = scoring.score_entity(dets, ent, cfg, w) if dets else None
    return dets, scored


def run_scenario(scn) -> Outcome:
    cfg, w = _load()
    ent = scn.build()
    dets, scored = run_entity(ent)
    failures = oracle.evaluate(scn.expect, dets, scored, tags=scn.tags)
    return Outcome(scenario_id=scn.id, hotspot=scn.hotspot, detections=dets,
                   scored=scored, failures=failures, tags=scn.tags)


def run_suite(scenarios) -> list:
    return [run_scenario(s) for s in scenarios]


def suite_report(outcomes: list) -> dict:
    failed = [o for o in outcomes if not o.passed]
    by_class = {}
    for o in failed:
        for f in o.failures:
            by_class.setdefault(f.failure_class.value, []).append(f"{o.scenario_id}:{f.violation}")
    return {"total": len(outcomes), "passed": len(outcomes) - len(failed), "failed": len(failed),
            "by_class": by_class, "failures": [o.summary() for o in failed]}
