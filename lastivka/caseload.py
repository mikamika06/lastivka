"""
Модуль 7 — Caseload. Розподіл черги тріажу по КОНКРЕТНИХ кейсворкерах ССД,
як у реальній практиці (дослідження: Закон №20/95-ВР, наказ №2669, ПКМУ №585):
  • ТЕРИТОРІАЛЬНА маршрутизація — кейс іде до ССД за місцем проживання дитини;
  • ЄМНІСТЬ за нормативом — фахівець фізично веде ~10 активних сімей (макс 5 складних);
  • СТРОКИ реагування (T0/T1/T2) = реальні законодавчі дедлайни;
  • ПЕРЕЛИВ понад ємність — ескалація на район/область + сигнал «потрібні штатні одиниці».
"""
from __future__ import annotations
from collections import defaultdict
import math

_TIER_ORDER = {"T0": 0, "T1": 1, "T2": 2}

# Рівень черги -> реальний законодавчий строк реагування
TIER_DEADLINE = {
    "T0": {"label": "1 доба", "detail": "оцінка рівня безпеки дитини (ПКМУ №585 п.9); насильство — повідомлення ≤3 год (ПКМУ №1513)"},
    "T1": {"label": "5–7 робочих днів", "detail": "оцінка потреб і взяття на облік (СЖО без гострої загрози)"},
    "T2": {"label": "до 14 днів / планово", "detail": "взяття на облік за інших обставин; спостереження"},
}


def build_roster(oblast_weights: dict, total_caseworkers: int, active: set) -> dict:
    """Штатний розпис: працівники по областях пропорційно дитячому населенню (мін. 1)."""
    roster = {}
    for o in active:
        roster[o] = max(1, round(total_caseworkers * oblast_weights.get(o, 0.02)))
    return roster


def compute(queue: list[dict], caseload_cfg: dict, oblast_weights: dict) -> dict:
    capacity = caseload_cfg.get("capacity_per_worker", 12)
    total = caseload_cfg.get("total_caseworkers", 30)

    by_obl = defaultdict(list)
    for c in queue:
        by_obl[c.get("oblast") or "—"].append(c)
    roster = build_roster(oblast_weights, total, set(by_obl.keys()))

    assignments, overflow, obl_stats = [], [], []
    for obl, cases in by_obl.items():
        cases.sort(key=lambda c: (_TIER_ORDER.get(c["tier"], 3), -c["score"]))
        n_workers = roster.get(obl, 1)
        cap_total = n_workers * capacity
        covered, over = cases[:cap_total], cases[cap_total:]
        for i, c in enumerate(covered):
            assignments.append({**c, "worker_id": f"{obl}-{i % n_workers + 1}"})
        for c in over:
            overflow.append({**c, "worker_id": None, "escalated": True})
        obl_stats.append({
            "oblast": obl, "workers": n_workers, "capacity": cap_total,
            "cases": len(cases), "covered": len(covered), "overflow": len(over),
            "t0": sum(1 for c in cases if c["tier"] == "T0"),
            "t1": sum(1 for c in cases if c["tier"] == "T1"),
            "t2": sum(1 for c in cases if c["tier"] == "T2"),
            "utilization": round(min(len(cases), cap_total) / cap_total, 2) if cap_total else 0,
            "urgent_uncovered": sum(1 for c in over if c["tier"] in ("T0", "T1")),
            "extra_workers_needed": max(0, math.ceil((len(cases) - cap_total) / capacity)) if over else 0,
        })
    obl_stats.sort(key=lambda s: (-s["urgent_uncovered"], -s["overflow"]))
    return {
        "roster": roster, "capacity_per_worker": capacity, "total_caseworkers": total,
        "oblast_stats": obl_stats, "assignments": assignments, "overflow": overflow,
        "deadlines": TIER_DEADLINE,
        "summary": {
            "total_cases": len(queue), "assigned": len(assignments), "overflow": len(overflow),
            "urgent_uncovered": sum(s["urgent_uncovered"] for s in obl_stats),
            "extra_workers_needed": sum(s["extra_workers_needed"] for s in obl_stats),
        },
    }


def worker_queue(assignments: list[dict], worker_id: str) -> list[dict]:
    rows = [a for a in assignments if a.get("worker_id") == worker_id]
    rows.sort(key=lambda c: (_TIER_ORDER.get(c["tier"], 3), -c["score"]))
    return rows
