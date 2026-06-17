"""
Оркестратор пайплайну (Модулі 3–8): match -> detect -> score -> validate.
Зберігає чергу тріажу й метрики в out/pipeline.db для дашборда.
"""
from __future__ import annotations
import json
import os
import sqlite3
import yaml

import yaml as _yaml

from . import matching, detection, scoring, validation, caseload
from .storage import OUT


def run_pipeline(config_path="config/config.yaml", scoring_path="config/scoring.yaml",
                 log_to_mlflow=True) -> dict:
    cfg = yaml.safe_load(open(config_path, encoding="utf-8"))
    weights = scoring.load_weights(scoring_path)

    entities = matching.match()
    entities_by_id = {e["entity_id"]: e for e in entities}
    detections = detection.detect_all(entities, cfg)
    queue = scoring.score_all(detections, entities_by_id, cfg, weights)

    m_match = validation.eval_matching(entities)
    m_detect = validation.eval_detection(detections)
    m_priv = validation.eval_privacy(entities, cfg)

    _write_pipeline_db(queue, {"matching": m_match, "detection": m_detect, "privacy": m_priv},
                       matching.LAST_STATS)
    if log_to_mlflow:
        validation.log_mlflow(m_match, m_detect, m_priv, cfg)

    return {"queue": queue, "n_detected": len(detections),
            "metrics": {"matching": m_match, "detection": m_detect, "privacy": m_priv},
            "match_stats": matching.LAST_STATS}


def _write_pipeline_db(queue, metrics, match_stats):
    path = os.path.join(OUT, "pipeline.db")
    con = sqlite3.connect(path)
    con.execute("DROP TABLE IF EXISTS queue")
    con.execute("""CREATE TABLE queue (
        rank INTEGER, entity_id INTEGER, unzr TEXT, pib TEXT, birth_date TEXT, age INTEGER,
        tier TEXT, score REAL, immediate INTEGER, vulnerability REAL, vuln_factors TEXT,
        violations TEXT, registries TEXT, contributions TEXT)""")
    for i, r in enumerate(queue, 1):
        con.execute("INSERT INTO queue VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            i, r["entity_id"], r["unzr"], r["pib"], r["birth_date"], r["age"],
            r["tier"], r["score"], int(r["immediate"]), r["vulnerability"],
            json.dumps(r["vuln_factors"], ensure_ascii=False),
            json.dumps(r["violations"], ensure_ascii=False),
            json.dumps(r["registries"], ensure_ascii=False),
            json.dumps(r["contributions"], ensure_ascii=False)))
    con.execute("DROP TABLE IF EXISTS metrics")
    con.execute("CREATE TABLE metrics (key TEXT, value TEXT)")
    for k, v in metrics.items():  # matching / detection / privacy — окремими рядками
        con.execute("INSERT INTO metrics VALUES (?,?)", (k, json.dumps(v, ensure_ascii=False)))
    con.execute("INSERT INTO metrics VALUES (?,?)", ("match_stats", json.dumps(match_stats, ensure_ascii=False)))
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
