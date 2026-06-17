#!/usr/bin/env python3
"""
ДЕМО: симулює рішення кейсворкерів за флагами (з синтетичного ground truth),
щоб ПРОДЕМОНСТРУВАТИ, що калібрувальний конвеєр працює. На реальних даних
мітки надходитимуть від справжніх рішень ССД, а не звідси.
"""
import json
import os
import sqlite3
import sys
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lastivka import pipeline, storage, feedback  # noqa: E402


def main():
    # reset
    if os.path.exists(feedback.FB_PATH):
        con = sqlite3.connect(feedback.FB_PATH)
        con.execute("DROP TABLE IF EXISTS feedback")
        con.commit(); con.close()

    q = pipeline.read_queue()
    gv = storage.read_godview()
    truth = {r.unzr: bool(json.loads(r.labels) if r.labels else {}) for r in gv.itertuples()}
    rng = random.Random(7)

    n = 0
    for _, r in q.iterrows():
        real = truth.get(r["unzr"], False)  # чи є реальне порушення (з god-view)
        if real:                            # справжній кейс → кейсворкер переважно підтверджує
            dec = "confirmed" if rng.random() < 0.90 else "rejected"
            out = "substantiated" if (dec == "confirmed" and rng.random() < 0.92) else "unsubstantiated"
        else:                               # хибний флаг → переважно відхиляє
            dec = "rejected" if rng.random() < 0.85 else "confirmed"
            out = "unsubstantiated" if rng.random() < 0.90 else "substantiated"
        feedback.log_feedback(int(r["entity_id"]), dec, unzr=r["unzr"], pib=r["pib"],
                              tier=r["tier"], score=float(r["score"]),
                              violations=json.loads(r["violations"]), outcome=out,
                              caseworker=r["worker_id"], note="DEMO")
        n += 1
    print(f"✓ Згенеровано {n} демо-рішень кейсворкерів у out/feedback.db")
    print("  (ДЕМО з ground truth — на реальних даних мітки надходять від справжніх рішень ССД)")
    print("  стан:", feedback.stats()["note"])


if __name__ == "__main__":
    main()
