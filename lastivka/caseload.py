"""
Модуль 7 — Caseload. Розподіл черги тріажу по КОНКРЕТНИХ кейсворкерах ССД з
урахуванням (1) територіальної юрисдикції (ССД — за місцем проживання дитини),
(2) ОБМЕЖЕНОЇ ЄМНОСТІ кожного працівника. Кожен наглядач бачить СВІЙ топ-N
найтерміновіших; надлишок понад ємність області — у перелив (потрібні ресурси).
"""
from __future__ import annotations
from collections import defaultdict

_TIER_ORDER = {"T0": 0, "T1": 1, "T2": 2}


def build_roster(oblast_weights: dict, total_caseworkers: int, active_oblasts: set) -> dict:
    """Розподіляє працівників по областях пропорційно дитячому населенню (мін. 1 де є кейси)."""
    roster = {}
    for o in active_oblasts:
        w = oblast_weights.get(o, 0.02)
        roster[o] = max(1, round(total_caseworkers * w))
    return roster


def assign(queue: list[dict], roster: dict, capacity: int) -> dict:
    """queue: рядки зі score-полями (oblast, tier, score, ...).
    Повертає: assignments (рядки з worker_id), overflow, per-oblast статистику."""
    by_obl = defaultdict(list)
    for c in queue:
        by_obl[c.get("oblast") or "—"].append(c)

    assignments, overflow, obl_stats = [], [], {}
    for obl, cases in by_obl.items():
        cases.sort(key=lambda c: (_TIER_ORDER.get(c["tier"], 3), -c["score"]))
        n_workers = roster.get(obl, 1)
        cap_total = n_workers * capacity
        covered, over = cases[:cap_total], cases[cap_total:]
        # round-robin за спаданням терміновості → кожен працівник отримує збалансований мікс
        for i, c in enumerate(covered):
            w = i % n_workers
            assignments.append({**c, "worker_id": f"{obl}-{w + 1}", "case_rank_in_worker": i // n_workers + 1})
        for c in over:
            overflow.append({**c, "worker_id": None})
        obl_stats[obl] = {
            "oblast": obl, "workers": n_workers, "capacity": cap_total,
            "cases": len(cases), "covered": len(covered), "overflow": len(over),
            "t0": sum(1 for c in cases if c["tier"] == "T0"),
            "t1": sum(1 for c in cases if c["tier"] == "T1"),
            "t2": sum(1 for c in cases if c["tier"] == "T2"),
            "utilization": round(min(len(cases), cap_total) / cap_total, 2) if cap_total else 0,
            "urgent_uncovered": sum(1 for c in over if c["tier"] in ("T0", "T1")),
        }
    return {"assignments": assignments, "overflow": overflow,
            "oblast_stats": sorted(obl_stats.values(), key=lambda s: -s["overflow"])}


def worker_queue(assignments: list[dict], worker_id: str) -> list[dict]:
    rows = [a for a in assignments if a["worker_id"] == worker_id]
    rows.sort(key=lambda c: (_TIER_ORDER.get(c["tier"], 3), -c["score"]))
    return rows
