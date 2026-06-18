"""
Модуль 12 — Моніторинг (Режим 2): довгий супровід ВЖЕ-постраждалих дітей
(депортовані/повернені, «Діти війни», сироти/ПБП під опікою, без супроводу).

Відмінність від виявлення (Режим 1): когорта ЗАРАХОВАНА за статусом (НЕ новий ризик),
тригер — плановий перегляд/віха плану, вихід — прогрес плану реінтеграції + флаг погіршення.
ЗАПОБІЖНИК: статус «вже постраждав» — це ЗАРАХУВАННЯ в моніторинг, а не штраф до бала ризику.
"""
from __future__ import annotations

from .scoring import _oblast

COHORTS = {
    "deported": "Депортовані / примусово переміщені",
    "uasc": "Без супроводу (UASC)",
    "orphan_care": "Сироти / ПБП під опікою",
    "war_affected": "Постраждалі внаслідок воєнних дій",
}

MILESTONES = ["Оцінка потреб", "Форма влаштування", "Відновлення освіти",
              "Медичний супровід", "Психологічна реабілітація", "Документи / статус"]


def _cohort(ent: dict) -> str | None:
    R = ent["rows_by_reg"]
    cw = " ".join(str(r.get("status_category", "")) for r in R.get("CHILDWAR", []))
    dstatus = " ".join(str(r.get("child_status", "")) for r in R.get("DITY", []))
    if "депорт" in cw:
        return "deported"
    if "без супроводу" in dstatus:
        return "uasc"
    if any(k in dstatus for k in ("сирота", "піклуванн", "опік", "ПБП")):
        return "orphan_care"
    if R.get("CHILDWAR"):
        return "war_affected"
    return None


def _milestones(ent: dict) -> dict:
    R = ent["rows_by_reg"]
    edebo = R.get("EDEBO", [])
    decl_ok = any(r.get("resource_type") == "declaration" and r.get("status") != "terminated"
                  for r in R.get("EHEALTH", []))
    return {
        "Оцінка потреб": bool(R.get("DITY")),
        "Форма влаштування": bool(R.get("DITY")),
        "Відновлення освіти": bool(edebo) and not any(
            r.get("study_status") in ("transferred", "expelled") for r in edebo),
        "Медичний супровід": decl_ok,
        "Психологічна реабілітація": ent["entity_id"] % 2 == 0,   # демо-варіація
        "Документи / статус": bool(R.get("EDDR") or R.get("DRACS")),
    }


def enroll(entities: list[dict], detections: list[dict], cfg: dict | None = None) -> list[dict]:
    """Зараховані діти + прогрес плану + флаг погіршення (наявний активний ред-флаг)."""
    det_ids = {d["entity_id"] for d in detections}
    out = []
    for e in entities:
        c = _cohort(e)
        if not c:
            continue
        ms = _milestones(e)
        prog = round(sum(1 for v in ms.values() if v) / len(ms), 2)
        out.append({
            "entity_id": e["entity_id"], "pib": e.get("pib"), "oblast": _oblast(e),
            "cohort": c, "cohort_ua": COHORTS[c],
            "plan_progress": prog, "milestones": ms,
            "deterioration": e["entity_id"] in det_ids,  # активний ред-флаг → план не спрацьовує
        })
    # ранг: погіршення спершу, далі найменший прогрес плану
    out.sort(key=lambda x: (not x["deterioration"], x["plan_progress"]))
    return out


def summary(enrolled: list[dict]) -> dict:
    from collections import Counter
    n = len(enrolled)
    return {
        "total": n,
        "by_cohort": {COHORTS[k]: v for k, v in Counter(x["cohort"] for x in enrolled).items()},
        "deteriorating": sum(1 for x in enrolled if x["deterioration"]),
        "avg_progress": round(sum(x["plan_progress"] for x in enrolled) / max(1, n), 2),
    }
