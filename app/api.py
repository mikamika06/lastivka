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
NOT_FOUND = "Не знайдено"
NOT_FOUND_RESPONSE = {404: {"description": NOT_FOUND}}
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


@app.get("/entity/{entity_id}", responses=NOT_FOUND_RESPONSE)
def entity(entity_id: int):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, NOT_FOUND)
    return {"entity_id": e["entity_id"], "unzr": e["unzr"], "pib": e["pib"],
            "birth_date": e["birth_date"], "registries": e["registries"],
            "n_registries": e["n_registries"], "oblast": oblast_of(e),
            "records": {k: len(v) for k, v in e["rows_by_reg"].items()}}


def _ev_vpo(r):
    return [(r.get("displacement_date"), f"Переміщення → {r.get('actual_residence_place')}")]


def _ev_edebo(r):
    if r.get("study_status") in ("transferred", "expelled"):
        return [(r.get("status_effective_date"), f"Вихід зі школи (статус: {r.get('study_status')})")]
    return []


def _ev_ehealth(r):
    events = []
    if r.get("resource_type") == "declaration" and r.get("status") == "terminated":
        events.append((r.get("end_date"), "Декларацію із сімейним лікарем закрито"))
    if r.get("condition_category") in ("trauma", "psych") and r.get("date"):
        tag = "травма" if r.get("condition_category") == "trauma" else "психолог"
        rep = " (повторне)" if str(r.get("is_repeat")) in ("1", "True", "true") else ""
        events.append((r.get("date"), f"Звернення: {tag}{rep}"))
    return events


def _ev_dracs(r):
    if r.get("act_type") == "смерть":
        return [(r.get("registration_date") or r.get("reg_date"), "Акт про смерть одного з батьків")]
    return []


def _ev_childwar(r):
    return [(r.get("incident_date"), f"Статус «Діти війни»: {r.get('status_category')}")]


def _ev_dity(r):
    return [(r.get("primary_registration_date"), f"Облік ССД: {r.get('child_status')}")]


def _ev_edrsr(r):
    return [(r.get("decision_date") or r.get("adjudication_date"), "Судове рішення щодо батьківських прав")]


def _ev_erdr(r):
    return [(r.get("register_entry_datetime"), f"Провадження: {r.get('preliminary_legal_qualification')}")]


def _ev_dv(r):
    return [(r.get("incident_datetime"), f"Виклик поліції ({r.get('form_of_violence')})")]


def _ev_cbi(r):
    return [(r.get("date_established") or r.get("registration_date_cbi"), "Встановлено інвалідність / потреба супроводу")]


# Реєстр → функція, що повертає список (date, label) для одного рядка.
# Порядок збережено таким, як у вихідній реалізації timeline.
TIMELINE_BUILDERS = (
    ("VPO", _ev_vpo),
    ("EDEBO", _ev_edebo),
    ("EHEALTH", _ev_ehealth),
    ("DRACS", _ev_dracs),
    ("CHILDWAR", _ev_childwar),
    ("DITY", _ev_dity),
    ("EDRSR", _ev_edrsr),
    ("ERDR", _ev_erdr),
    ("DV", _ev_dv),
    ("CBI", _ev_cbi),
)


@app.get("/entity/{entity_id}/timeline", responses=NOT_FOUND_RESPONSE)
def timeline(entity_id: int):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, NOT_FOUND)
    rows_by_reg = e["rows_by_reg"]
    ev = []
    for reg, builder in TIMELINE_BUILDERS:
        for r in rows_by_reg.get(reg, []):
            for date, label in builder(r):
                if date and date != "None":
                    ev.append({"date": str(date)[:10], "registry": reg, "label": label,
                               "level1": REG_ACCESS.get(reg) == 1})
    ev.sort(key=lambda x: x["date"])
    return {"events": ev}


@app.get("/entity/{entity_id}/attendance", responses=NOT_FOUND_RESPONSE)
def attendance(entity_id: int):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, NOT_FOUND)
    aikom = sorted(e["rows_by_reg"].get("AIKOM", []), key=lambda x: x.get("attendance_period", ""))
    if not aikom:
        return {"points": [], "changePointIndex": None}
    points = [{"period": r.get("attendance_period"),
               "absences": int(float(r.get("missed_lessons_count") or 0)),
               "gpa": float(r.get("score_12") or 0)} for r in aikom]
    cp_idx, _, cp_dir = detection.change_point([p["absences"] for p in points])
    return {"points": points, "changePointIndex": cp_idx if cp_dir > 0 else None}
