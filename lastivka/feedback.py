"""
Модуль 9 — Feedback. Захоплення рішень кейсворкера по кожному флагу.
Це ДЖЕРЕЛО МАЙБУТНІХ МІТОК: без нього неможливо навчити модель пізніше.
На синтетиці модель не вчимо (циклічно) — але шов закладаємо вже зараз.
Зберігається окремо (out/feedback.db), НЕ перезаписується пайплайном.
"""
from __future__ import annotations
import os
import sqlite3
from datetime import datetime, timezone

from .storage import OUT

FB_PATH = os.path.join(OUT, "feedback.db")
DECISIONS = ("confirmed", "rejected", "escalated")          # рішення за флагом
OUTCOMES = ("substantiated", "unsubstantiated", "unknown")  # підтверджений результат (пізніше)


def _con():
    os.makedirs(OUT, exist_ok=True)
    con = sqlite3.connect(FB_PATH)
    con.execute("""CREATE TABLE IF NOT EXISTS feedback (
        entity_id INTEGER, unzr TEXT, pib TEXT, tier TEXT, score REAL,
        violations TEXT, decision TEXT, outcome TEXT, caseworker TEXT, note TEXT, ts TEXT)""")
    return con


def log_feedback(entity_id, decision, unzr=None, pib=None, tier=None, score=None,
                 violations=None, outcome="unknown", caseworker=None, note=None, ts=None):
    if decision not in DECISIONS:
        raise ValueError(f"decision має бути одним із {DECISIONS}")
    ts = ts or datetime.now(timezone.utc).isoformat()
    con = _con()
    con.execute("INSERT INTO feedback VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (entity_id, unzr, pib, tier, score,
                 ",".join(violations) if violations else None,
                 decision, outcome, caseworker, note, ts))
    con.commit()
    con.close()
    return True


def read_feedback():
    import pandas as pd
    if not os.path.exists(FB_PATH):
        return pd.DataFrame()
    con = _con()
    df = pd.read_sql_query("SELECT * FROM feedback", con)
    con.close()
    return df


def stats() -> dict:
    df = read_feedback()
    if df.empty:
        return {"total": 0, "labeled": 0, "ready_to_train": False,
                "note": "Ще немає зворотного звʼязку — джерело майбутніх міток порожнє."}
    labeled = int((df["outcome"] != "unknown").sum())
    return {
        "total": int(len(df)),
        "by_decision": df["decision"].value_counts().to_dict(),
        "by_outcome": df["outcome"].value_counts().to_dict(),
        "labeled": labeled,
        # для калібрування інтерпретованої моделі потрібно ~сотні підтверджених міток
        "ready_to_train": labeled >= 200,
        "note": ("Достатньо міток для калібрування інтерпретованої моделі."
                 if labeled >= 200 else
                 f"Накопичується: {labeled} підтверджених міток (потрібно ~200 для навчання)."),
    }
