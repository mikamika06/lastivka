"""
Оркестратор генерації (Модуль 1+2).
population -> trajectories -> кожен реєстр-емітер пише у СВОЮ SQLite-базу (силоси) + god-view.
"""
from __future__ import annotations
import os
import random
import yaml

from .realmodel import build_population
from .emitters import REGISTRIES, EMITTERS
from . import storage


def _apply_record_noise(rows, cfg, rng):
    miss = cfg["noise"]["missing_record_rate"]
    dup = cfg["noise"]["duplicate_rate"]
    out = []
    for r in rows:
        if rng.random() < miss:
            continue  # реєстр не зловив подію
        out.append(r)
        if rng.random() < dup:
            out.append(dict(r))  # дубль
    return out


def run(config_path: str, n_override: int | None = None, seed_override: int | None = None) -> dict:
    cfg = yaml.safe_load(open(config_path, encoding="utf-8"))
    epi_path = os.path.join(os.path.dirname(config_path), "epidemiology.yaml")
    epi = yaml.safe_load(open(epi_path, encoding="utf-8"))
    if n_override:
        cfg["population"]["n_children"] = n_override
    if seed_override is not None:
        cfg["seed"] = seed_override
    rng = random.Random(cfg["seed"])

    children = build_population(cfg, epi, rng)

    stats = {}
    membership = []
    for reg in REGISTRIES:
        emit = EMITTERS[reg["code"]]
        rows = []
        for c in children:
            for row in emit(c, cfg, rng):
                row["_true_id"] = c.internal_id  # прихована істина (не пишеться в реєстр)
                rows.append(row)
        if reg["code"] not in ("DRACS", "EDDR"):
            rows = _apply_record_noise(rows, cfg, rng)
        _path, _table, n, truth_ids = storage.write_registry(reg["code"], reg["db"], rows)
        for i, tid in enumerate(truth_ids, start=1):  # sqlite rowid = 1-based порядок вставки
            membership.append((reg["code"], i, tid))
        stats[reg["code"]] = n

    storage.write_godview(children)
    storage.write_record_truth(membership)
    return {
        "n_children": len(children),
        "n_flagged": sum(1 for c in children if c.labels),
        "registry_rows": stats,
        "config": cfg,
    }
