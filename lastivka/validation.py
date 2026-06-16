"""
Модуль 8 — Validation. Метрики проти god-view (precision/recall):
  - matching: чи зібрано дитину з силосів у правильну сутність;
  - detection: чи правильно виявлено порушення;
  - privacy: чи PPRL відновлює ті самі лінки без plaintext.
Опційно логує в MLflow.
"""
from __future__ import annotations
import json
from collections import defaultdict, Counter

from . import storage


def eval_matching(entities) -> dict:
    truth = storage.read_record_truth()
    tmap = {(r.reg, r.rowid): r.true_id for r in truth.itertuples()}
    n_true = truth["true_id"].nunique()
    pure = impure = 0
    child_entities = defaultdict(set)
    for e in entities:
        tids = [tmap.get(m) for m in e["members"]]
        tids = [t for t in tids if t is not None]
        if not tids:
            continue
        maj = Counter(tids).most_common(1)[0]
        if maj[1] == len(tids):
            pure += 1
        else:
            impure += 1
        for t in set(tids):
            child_entities[t].add(e["entity_id"])
    one = sum(1 for es in child_entities.values() if len(es) == 1)
    return {
        "true_children": int(n_true), "entities": len(entities),
        "pure_clusters": pure, "impure_clusters": impure,
        "reconstructed_one_entity": one,
        "reconstruction_rate": round(one / n_true, 4) if n_true else 0,
    }


def eval_detection(detections) -> dict:
    gv = storage.read_godview()
    all_true = {r.unzr: (json.loads(r.labels) if r.labels else {}) for r in gv.itertuples()}
    per_v = defaultdict(lambda: [0, 0, 0])  # tp, fp, fn
    detected = defaultdict(set)
    for d in detections:
        u = d["unzr"]
        pred = {x["violation"] for x in d["detections"]}
        detected[u] |= pred
        truth = set(all_true.get(u, {}).keys()) if u else set()
        for v in pred:
            per_v[v][0 if v in truth else 1] += 1
    for u, truth in all_true.items():
        pred = detected.get(u, set())
        for v in truth:
            if v not in pred:
                per_v[v][2] += 1
    rows = {}
    TP = FP = FN = 0
    for v, (tp, fp, fn) in per_v.items():
        TP += tp; FP += fp; FN += fn
        rows[v] = {"tp": tp, "fp": fp, "fn": fn,
                   "precision": round(tp / (tp + fp), 3) if tp + fp else 0,
                   "recall": round(tp / (tp + fn), 3) if tp + fn else 0}
    P = TP / (TP + FP) if TP + FP else 0
    R = TP / (TP + FN) if TP + FN else 0
    return {"per_violation": rows,
            "overall": {"tp": TP, "fp": FP, "fn": FN,
                        "precision": round(P, 3), "recall": round(R, 3),
                        "f1": round(2 * P * R / (P + R), 3) if P + R else 0}}


def eval_privacy(entities, cfg, sample_n: int = 400) -> dict:
    """Будує A/B вибірки з реальних сутностей і перевіряє PPRL (Bloom-Dice)."""
    from . import privacy
    key = b"lastivka-demo-key"
    recs = []
    for e in entities[:sample_n]:
        # беремо ПІБ з різних реєстрів як два «погляди» на одну дитину
        rows = [r for rr in e["rows_by_reg"].values() for r in rr if r.get("first_name")]
        if len(rows) < 2 or not e["unzr"]:
            continue
        a, b = rows[0], rows[-1]
        recs.append(({"last": a.get("last_name"), "first": a.get("first_name"),
                      "second": a.get("second_name"), "birth_date": a.get("birth_date"),
                      "unzr": e["unzr"]},
                     {"last": b.get("last_name"), "first": b.get("first_name"),
                      "second": b.get("second_name"), "birth_date": b.get("birth_date"),
                      "unzr": e["unzr"]}))
    A = [x[0] for x in recs]
    B = [x[1] for x in recs]
    res = privacy.pprl_selfcheck(A, B, key, threshold=0.70)
    res["n_pairs"] = len(recs)
    return res


def log_mlflow(matching_m, detection_m, privacy_m, cfg):
    try:
        import mlflow
    except ImportError:
        return False
    mlflow.set_experiment("lastivka")
    with mlflow.start_run():
        mlflow.log_params({"n_children": cfg["population"]["n_children"],
                           "months": cfg["population"]["months"]})
        mlflow.log_metrics({
            "match_reconstruction_rate": matching_m["reconstruction_rate"],
            "detect_precision": detection_m["overall"]["precision"],
            "detect_recall": detection_m["overall"]["recall"],
            "detect_f1": detection_m["overall"]["f1"],
            "pprl_precision": privacy_m["precision"],
            "pprl_recall": privacy_m["recall"],
        })
    return True
