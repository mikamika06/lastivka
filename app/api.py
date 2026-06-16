"""
Ластівка — REST API (FastAPI). Віддає чергу тріажу, профіль сутності, метрики.
Запуск:  uvicorn app.api:app --reload --port 8000
"""
import json
import os
import sys

from fastapi import FastAPI, HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lastivka import pipeline, matching  # noqa: E402

app = FastAPI(title="Ластівка API", version="0.1.0",
              description="Privacy-preserving захист прав дитини — крос-реєстрове виявлення")

_entities = None


def entities():
    global _entities
    if _entities is None:
        _entities = {e["entity_id"]: e for e in matching.match()}
    return _entities


@app.get("/metrics")
def metrics():
    return pipeline.read_metrics()


@app.get("/queue")
def queue(tier: str | None = None, immediate: bool = False, limit: int = 50):
    df = pipeline.read_queue()
    if tier:
        df = df[df.tier == tier]
    if immediate:
        df = df[df.immediate == 1]
    out = []
    for _, r in df.head(limit).iterrows():
        out.append({"rank": int(r["rank"]), "entity_id": int(r["entity_id"]),
                    "pib": r["pib"], "age": r["age"], "tier": r["tier"],
                    "score": r["score"], "immediate": bool(r["immediate"]),
                    "violations": json.loads(r["violations"]),
                    "vuln_factors": json.loads(r["vuln_factors"])})
    return {"count": len(out), "items": out}


@app.get("/entity/{entity_id}")
def entity(entity_id: int):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, "Не знайдено")
    return {"entity_id": e["entity_id"], "unzr": e["unzr"], "pib": e["pib"],
            "birth_date": e["birth_date"], "registries": e["registries"],
            "n_registries": e["n_registries"],
            "records": {k: len(v) for k, v in e["rows_by_reg"].items()}}
