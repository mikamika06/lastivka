"""
Оркестратор пайплайну (Модулі 3–8): match -> detect -> score -> validate.
Зберігає чергу тріажу й метрики в out/pipeline.db для дашборда.
"""
from __future__ import annotations
import json
import os
import random
import sqlite3
import yaml


from . import matching, detection, scoring, validation, caseload, crossborder, familygraph, intake
from .storage import OUT


def run_pipeline(config_path="config/config.yaml", scoring_path="config/scoring.yaml",
                 log_to_mlflow=True, federated=False) -> dict:
    cfg = yaml.safe_load(open(config_path, encoding="utf-8"))
    epi_path = os.path.join(os.path.dirname(config_path), "epidemiology.yaml")
    epi = yaml.safe_load(open(epi_path, encoding="utf-8"))
    weights = scoring.load_weights(scoring_path)

    entities = matching.match()
    entities = familygraph.rollup(entities, cfg)   # C1-rollup: household/сиблінги (до детекції)
    if federated:
        # ПРОД-режим: детекція через федеративні LRA-вузли (compute-to-data, стіни push-only)
        from . import federated as _fed
        detections = _fed.federated_detect_all(entities, cfg, push_walled=True)
    else:
        detections = detection.detect_all(entities, cfg)
    # крос-кордон UA↔EE: лінк PPRL, узгодження W3/W8, X-ризики
    entities, detections, cb_stats = crossborder.apply(entities, detections, cfg)
    entities_by_id = {e["entity_id"]: e for e in entities}

    # ── ІНТЕЙК-перші двері: повідомлення відкривають кейс; крос-реєстр = тріаж/корроборація ──
    reports = intake.synth_reports(entities, detections, cfg, random.Random(cfg.get("seed", 0) + 555))
    det_by_id = {d["entity_id"]: d["detections"] for d in detections}
    intake_tri = intake.triage(reports, det_by_id, cfg)
    for eid, info in intake_tri["by_entity"].items():
        if eid in entities_by_id:
            entities_by_id[eid].update(info)   # intake_source + intake_corroborated → у скоринг

    queue = scoring.score_all(detections, entities_by_id, cfg, weights)

    # розподіл по кейсворкерах (територія + ємність за нормативом)
    cl = caseload.compute(queue, cfg.get("caseload", {}),
                          epi["demographics"]["oblast_weights"])

    m_match = validation.eval_matching(entities)
    m_detect = validation.eval_detection(detections)
    m_priv = validation.eval_privacy(entities, cfg)

    _write_pipeline_db(queue, cl,
                       {"matching": m_match, "detection": m_detect, "privacy": m_priv,
                        "crossborder": cb_stats,
                        "intake": {"cases": intake_tri["cases"], "n_reports": len(reports),
                                   "household": familygraph.household_summary(entities)}},
                       matching.LAST_STATS)
    if log_to_mlflow:
        validation.log_mlflow(m_match, m_detect, m_priv, cfg)

    return {"queue": queue, "n_detected": len(detections), "caseload": cl, "crossborder": cb_stats,
            "metrics": {"matching": m_match, "detection": m_detect, "privacy": m_priv,
                        "crossborder": cb_stats},
            "match_stats": matching.LAST_STATS}


def _write_pipeline_db(queue, cl, metrics, match_stats):
    path = os.path.join(OUT, "pipeline.db")
    con = sqlite3.connect(path)
    # індекс worker_id за entity_id (з розподілу)
    worker_of = {a["entity_id"]: a["worker_id"] for a in cl["assignments"]}
    con.execute("DROP TABLE IF EXISTS queue")
    con.execute("""CREATE TABLE queue (
        rank INTEGER, entity_id INTEGER, unzr TEXT, isikukood TEXT, pib TEXT, birth_date TEXT, age INTEGER,
        country TEXT, oblast TEXT, worker_id TEXT, tier TEXT, score REAL, immediate INTEGER,
        vulnerability REAL, vuln_factors TEXT, violations TEXT, registries TEXT, contributions TEXT,
        household_risk REAL, corroborated INTEGER, intake_source TEXT)""")
    for i, r in enumerate(queue, 1):
        con.execute("INSERT INTO queue VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            i, r["entity_id"], r["unzr"], r.get("isikukood"), r["pib"], r["birth_date"], r["age"],
            r.get("country", "UA"), r.get("oblast"), worker_of.get(r["entity_id"]),
            r["tier"], r["score"], int(r["immediate"]), r["vulnerability"],
            json.dumps(r["vuln_factors"], ensure_ascii=False),
            json.dumps(r["violations"], ensure_ascii=False),
            json.dumps(r["registries"], ensure_ascii=False),
            json.dumps(r["contributions"], ensure_ascii=False),
            r.get("household_risk_density", 0.0),
            (None if r.get("corroborated") is None else int(bool(r.get("corroborated")))),
            r.get("intake_source")))
    con.execute("DROP TABLE IF EXISTS metrics")
    con.execute("CREATE TABLE metrics (key TEXT, value TEXT)")
    for k, v in metrics.items():
        con.execute("INSERT INTO metrics VALUES (?,?)", (k, json.dumps(v, ensure_ascii=False)))
    con.execute("INSERT INTO metrics VALUES (?,?)", ("match_stats", json.dumps(match_stats, ensure_ascii=False)))
    # caseload: статистика по областях + зведення + дедлайни
    con.execute("INSERT INTO metrics VALUES (?,?)", ("caseload", json.dumps({
        "oblast_stats": cl["oblast_stats"], "summary": cl["summary"],
        "deadlines": cl["deadlines"], "roster": cl["roster"],
        "capacity_per_worker": cl["capacity_per_worker"],
        "total_caseworkers": cl["total_caseworkers"],
    }, ensure_ascii=False)))
    con.commit()
    con.close()


def read_queue():
    import pandas as pd
    con = sqlite3.connect(os.path.join(OUT, "pipeline.db"))
    df = pd.read_sql_query("SELECT * FROM queue ORDER BY rank", con)
    con.close()
    return df


def read_metrics():
    con = sqlite3.connect(os.path.join(OUT, "pipeline.db"))
    rows = dict(con.execute("SELECT key, value FROM metrics").fetchall())
    con.close()
    return {k: json.loads(v) for k, v in rows.items()}
