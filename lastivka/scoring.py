"""
Модуль 5 — Triage scoring. Перетворює виявлені порушення на urgency-score
і рівень черги (T0/T1/T2) з ПОЯСНЕННЯМ (які сигнали спрацювали) — бо це рішення
про дитину, чорна скриня неприпустима. Decision support, не decision making.
"""
from __future__ import annotations
from datetime import date
import yaml


def load_weights(path: str) -> dict:
    return yaml.safe_load(open(path, encoding="utf-8"))


def _evidence_mult(n: int, w: dict) -> float:
    key = "4+" if n >= 4 else str(max(1, n))
    return w["evidence"].get(key, 1.0)


def _age(birth_date, cfg) -> int | None:
    if not birth_date or birth_date == "None":
        return None
    try:
        b = date.fromisoformat(str(birth_date)[:10])
        end_year = cfg["population"]["start_year"] + (cfg["population"]["months"] - 1) // 12
        return end_year - b.year
    except ValueError:
        return None


def _vulnerability(det, entity, cfg, w) -> tuple[float, list[str]]:
    vw = w["vulnerability"]
    factors, mult = [], 1.0
    age = _age(entity.get("birth_date"), cfg)
    if age is not None and age < 6:
        mult *= vw["age_under_6"]; factors.append("вік<6")
    elif age is not None and age <= 10:
        mult *= vw["age_6_10"]; factors.append("вік 6–10")
    regs = set(entity.get("registries", []))
    vids = {d["violation"] for d in det}
    if "DITY" in regs:
        mult *= vw["already_in_ssd"]; factors.append("уже в «Дітях»")
    if vids & {"W5_deportation", "W7_trafficking"}:
        mult *= vw["no_guardian"]; factors.append("без опікуна")
    if "VPO" in regs or "W1_displacement" in vids:
        mult *= vw["displaced"]; factors.append("ВПО")
    # фактор батьківського ризику: ЄРДР-дитини АБО батьківський push-булеан (НЕ pull з walled)
    parent_push = any(entity.get(k) for k in
                      ("parent_criminal", "parent_incarcerated", "parent_addiction", "parent_mental_health"))
    if "ERDR" in regs or parent_push:
        mult *= vw["parental_risk_factor"]
        factors.append("фактор батьківського ризику" if parent_push and "ERDR" not in regs else "фактор ризику (ЄРДР)")
    density = float(entity.get("household_risk_density", 0.0) or 0.0)
    if density > 0 and "household_density" in vw:
        mult *= 1 + (vw["household_density"] - 1) * min(density, 1.0)
        factors.append("щільність ризику сім'ї")
    # родич-опікун — ПРОТЕКТИВНИЙ: знижує підсумкову вразливість (буфер, не порушення)
    if entity.get("kinship_care") and "kinship_protective" in vw:
        mult *= vw["kinship_protective"]
        factors.append("родич-опікун (захисний)")
    return min(mult, vw["cap"]), factors


def _oblast(entity: dict) -> str:
    for code, fld in (("EDDR", "registered_residence"), ("DRACS", "birth_place"),
                      ("DITY", "place_of_residence")):
        for r in entity.get("rows_by_reg", {}).get(code, []):
            addr = str(r.get(fld) or "")
            if " обл" in addr:
                return addr.split(" обл")[0].split(",")[-1].strip()
    return "—"


def score_entity(det: list[dict], entity: dict, cfg: dict, w: dict) -> dict:
    sev_w = w["severity"]
    contribs = []
    for d in det:
        sev = sev_w.get(d["violation"], 0.4)
        ev = _evidence_mult(len(d["evidence"]), w)
        acu = w["acuity"].get(d["acuity"], 1.0)
        c = {"violation": d["violation"], "value": round(sev * ev * acu, 3),
             "severity": sev, "evidence": d["evidence"], "acuity": d["acuity"],
             "dimension": d.get("dimension", "child")}
        if d.get("escalated"):
            c["escalated"] = True
        if d.get("household_corroboration"):
            c["household_corroboration"] = d["household_corroboration"]
        contribs.append(c)
    contribs.sort(key=lambda c: c["value"], reverse=True)

    agg = w["aggregation"]
    sw = agg["secondary_weight"]
    raw = contribs[0]["value"] + sw * sum(c["value"] for c in contribs[1:]) if contribs else 0.0
    # інтейк-корроборація: підтверджене крос-реєстрово ↑, одиничне непідтверджене ↓ («помста-сусід»)
    corroborated = entity.get("intake_corroborated")
    if corroborated is True:
        raw *= agg.get("intake_corroboration_mult", 1.0)
    elif corroborated is False:
        raw *= agg.get("intake_uncorroborated_mult", 1.0)
    vuln, vfactors = _vulnerability(det, entity, cfg, w)
    score = round(raw * vuln, 3)

    immediate = any(d["violation"] in w["immediate_override"] for d in det)
    t = w["tiers"]
    if immediate or score >= t["T0"]:
        tier = "T0"
    elif score >= t["T1"]:
        tier = "T1"
    elif score >= t["T2"]:
        tier = "T2"
    else:
        tier = None

    return {
        "entity_id": entity["entity_id"], "unzr": entity.get("unzr"),
        "pib": entity.get("pib"), "birth_date": entity.get("birth_date"),
        "country": entity.get("country", "UA"), "isikukood": entity.get("isikukood"),
        "oblast": _oblast(entity), "age": _age(entity.get("birth_date"), cfg),
        "score": score, "tier": tier, "immediate": immediate,
        "vulnerability": round(vuln, 2), "vuln_factors": vfactors,
        "contributions": contribs,
        # лише дитячі порушення в чипах; батьківська вісь (dimension=parental) — у сімейному графі
        "violations": [c["violation"] for c in contribs if c.get("dimension") != "parental"],
        "registries": entity.get("registries", []),
        "household_risk_density": round(float(entity.get("household_risk_density", 0.0) or 0.0), 3),
        "corroborated": corroborated,
        "intake_source": entity.get("intake_source"),
    }


# ── pluggable scorer: формула зараз; калібрована інтерпретована модель — коли будуть реальні мітки ──
def features(row: dict) -> list[float]:
    """Фічі для майбутньої каліброваної моделі (інтерпретовані)."""
    contribs = row.get("contributions", [])
    vals = [c["value"] for c in contribs] or [0.0]
    return [max(vals), sum(vals), float(len(contribs)),
            float(row.get("vulnerability", 1.0)), 1.0 if row.get("immediate") else 0.0]


def load_calibration(path="out/calibration.joblib"):
    """Завантажує калібровану модель, якщо натренована (інакше None -> працює формула)."""
    import os
    if not os.path.exists(path):
        return None
    try:
        import joblib
        return joblib.load(path)
    except Exception:
        return None


def score_all(detections: list[dict], entities_by_id: dict, cfg: dict, w: dict,
              calibration=None) -> list[dict]:
    if calibration is None:
        calibration = load_calibration()
    queue = []
    for d in detections:
        ent = entities_by_id.get(d["entity_id"], {"entity_id": d["entity_id"],
                                                  "unzr": d["unzr"], "pib": d["pib"],
                                                  "birth_date": d["birth_date"],
                                                  "registries": []})
        row = score_entity(d["detections"], ent, cfg, w)
        if not row["tier"]:
            continue
        # шов: калібрована ймовірність їде поруч (формула досі визначає tier/rank)
        if calibration is not None:
            try:
                row["model_score"] = round(float(calibration.predict_proba([features(row)])[0][1]), 3)
            except Exception:
                row["model_score"] = None
        queue.append(row)
    order = {"T0": 0, "T1": 1, "T2": 2}
    queue.sort(key=lambda r: (order[r["tier"]], not r["immediate"],
                              -(1 if r.get("corroborated") else 0),
                              -r.get("household_risk_density", 0.0), -r["score"]))
    return queue
