"""
Ластівка — REST API (FastAPI). Віддає чергу тріажу (з поясненням), профіль
сутності, таймлайн подій, відвідуваність та метрики — усе, що потрібно фронтенду.

Запуск:  uvicorn app.api:app --reload --port 8000
"""
import json
import os
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lastivka import pipeline, matching, detection  # noqa: E402
from lastivka.emitters import REGISTRIES  # noqa: E402

app = FastAPI(title="Ластівка API", version="0.2.0",
              description="Privacy-preserving захист прав дитини — крос-реєстрове виявлення")

# CORS — щоб фронтенд (Next.js, :3000) міг звертатися до API (:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REG_ACCESS = {r["code"]: r["access"] for r in REGISTRIES}
_entities = None


def entities():
    global _entities
    if _entities is None:
        _entities = {e["entity_id"]: e for e in matching.match()}
    return _entities


def oblast_of(ent) -> str:
    for r in ent.get("rows_by_reg", {}).get("EDDR", []):
        addr = r.get("registered_residence") or ""
        if "обл" in addr:
            return addr.split(" обл")[0].split(",")[-1].strip()
    return "—"


@app.get("/metrics")
def metrics():
    return pipeline.read_metrics()


@app.get("/queue")
def queue(tier: str | None = None, immediate: bool = False, limit: int = 500):
    df = pipeline.read_queue()
    if tier:
        df = df[df.tier == tier]
    if immediate:
        df = df[df.immediate == 1]
    out = []
    for _, r in df.head(limit).iterrows():
        out.append({
            "rank": int(r["rank"]), "entity_id": int(r["entity_id"]),
            "unzr": r["unzr"] if r["unzr"] not in (None, "", "None") else None,
            "pib": r["pib"], "birth_date": r["birth_date"], "age": r["age"],
            "tier": r["tier"], "score": r["score"], "immediate": bool(r["immediate"]),
            "vulnerability": r["vulnerability"],
            "vuln_factors": json.loads(r["vuln_factors"]),
            "violations": json.loads(r["violations"]),
            "registries": json.loads(r["registries"]),
            "contributions": json.loads(r["contributions"]),
        })
    return {"count": len(out), "items": out}


@app.get("/entity/{entity_id}")
def entity(entity_id: int):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, "Не знайдено")
    return {"entity_id": e["entity_id"], "unzr": e["unzr"], "pib": e["pib"],
            "birth_date": e["birth_date"], "registries": e["registries"],
            "n_registries": e["n_registries"], "oblast": oblast_of(e),
            "records": {k: len(v) for k, v in e["rows_by_reg"].items()}}


@app.get("/entity/{entity_id}/timeline")
def timeline(entity_id: int):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, "Не знайдено")
    R = e["rows_by_reg"]
    ev = []

    def add(date, reg, label):
        if date and date != "None":
            ev.append({"date": str(date)[:10], "registry": reg, "label": label,
                       "level1": REG_ACCESS.get(reg) == 1})

    for r in R.get("VPO", []):
        add(r.get("displacement_date"), "VPO", f"Переміщення → {r.get('actual_residence_place')}")
    for r in R.get("EDEBO", []):
        if r.get("study_status") in ("transferred", "expelled"):
            add(r.get("status_effective_date"), "EDEBO", f"Вихід зі школи (статус: {r.get('study_status')})")
    for r in R.get("EHEALTH", []):
        if r.get("resource_type") == "declaration" and r.get("status") == "terminated":
            add(r.get("end_date"), "EHEALTH", "Декларацію із сімейним лікарем закрито")
        if r.get("condition_category") in ("trauma", "psych") and r.get("date"):
            tag = "травма" if r.get("condition_category") == "trauma" else "психолог"
            rep = " (повторне)" if str(r.get("is_repeat")) in ("1", "True", "true") else ""
            add(r.get("date"), "EHEALTH", f"Звернення: {tag}{rep}")
    for r in R.get("DRACS", []):
        if r.get("act_type") == "смерть":
            add(r.get("registration_date") or r.get("reg_date"), "DRACS", "Акт про смерть одного з батьків")
    for r in R.get("CHILDWAR", []):
        add(r.get("incident_date"), "CHILDWAR", f"Статус «Діти війни»: {r.get('status_category')}")
    for r in R.get("DITY", []):
        add(r.get("primary_registration_date"), "DITY", f"Облік ССД: {r.get('child_status')}")
    for r in R.get("EDRSR", []):
        add(r.get("decision_date") or r.get("adjudication_date"), "EDRSR", "Судове рішення щодо батьківських прав")
    for r in R.get("ERDR", []):
        add(r.get("register_entry_datetime"), "ERDR",
            f"Провадження: {r.get('preliminary_legal_qualification')}")
    for r in R.get("DV", []):
        add(r.get("incident_datetime"), "DV", f"Виклик поліції ({r.get('form_of_violence')})")
    for r in R.get("CBI", []):
        add(r.get("registration_date") or r.get("decision_date"), "CBI", "Встановлено інвалідність / потреба супроводу")

    ev.sort(key=lambda x: x["date"])
    return {"events": ev}


@app.get("/entity/{entity_id}/attendance")
def attendance(entity_id: int):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, "Не знайдено")
    aikom = sorted(e["rows_by_reg"].get("AIKOM", []), key=lambda x: x.get("attendance_period", ""))
    if not aikom:
        return {"points": [], "changePointIndex": None}
    points = [{"period": r.get("attendance_period"),
               "absences": int(float(r.get("missed_lessons_count") or 0)),
               "gpa": float(r.get("score_12") or 0)} for r in aikom]
    cp_idx, _, cp_dir = detection.change_point([p["absences"] for p in points])
    return {"points": points, "changePointIndex": cp_idx if cp_dir > 0 else None}
