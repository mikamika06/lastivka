"""
Модуль 3 — Matching. Збирає дитину з силосованих реєстрів в один профіль.
Стратегія (як було б у проді через PSI/PPRL по УНЗР):
  1) точний union по УНЗР (linked_child_unzr / victim_unzr теж рахуються);
  2) для записів БЕЗ УНЗР — fuzzy по нормалізованому ПІБ + дата народження,
     з блокуванням за датою (щоб не робити O(n^2)).
Матчинг читає ЛИШЕ реєстри (не god-view).
"""
from __future__ import annotations
from collections import Counter
import sqlite3
import os

from rapidfuzz import fuzz

from .emitters import REGISTRIES
from .storage import REG_DIR

FUZZY_THRESHOLD = 86


def _norm(s) -> str:
    return (str(s) if s is not None else "").strip().lower()


def _name_key(ln, fn, sn) -> str:
    return " ".join(p for p in (_norm(ln), _norm(fn), _norm(sn)) if p)


def load_all_records() -> list[dict]:
    recs = []
    for reg in REGISTRIES:
        idm = reg["id_map"]
        path = os.path.join(REG_DIR, reg["db"])
        con = sqlite3.connect(path)
        con.row_factory = sqlite3.Row
        try:
            cur = con.execute(f"SELECT rowid AS _rowid, * FROM reg_{reg['code'].lower()}")
        except sqlite3.OperationalError:
            con.close()
            continue
        for r in cur.fetchall():
            d = dict(r)
            unzr = d.get(idm["unzr"]) or d.get("linked_child_unzr")
            recs.append({
                "_reg": reg["code"], "_rowid": d["_rowid"],
                "unzr": unzr if unzr not in (None, "", "None") else None,
                "ln": d.get(idm["last"]), "fn": d.get(idm["first"]), "sn": d.get(idm["second"]),
                "dob": d.get(idm["dob"]), "row": d,
            })
        con.close()
    return recs


class _Cluster:
    __slots__ = ("id", "unzr", "members", "rows_by_reg", "names", "dobs")

    def __init__(self, cid):
        self.id = cid
        self.unzr = None
        self.members = []            # (reg, rowid)
        self.rows_by_reg = {}        # reg -> [row dict]
        self.names = []
        self.dobs = []

    def add(self, rec):
        self.members.append((rec["_reg"], rec["_rowid"]))
        self.rows_by_reg.setdefault(rec["_reg"], []).append(rec["row"])
        nk = _name_key(rec["ln"], rec["fn"], rec["sn"])
        if nk:
            self.names.append(nk)
        if rec["dob"]:
            self.dobs.append(rec["dob"])
        if rec["unzr"] and not self.unzr:
            self.unzr = rec["unzr"]

    @property
    def rep_name(self) -> str:
        return Counter(self.names).most_common(1)[0][0] if self.names else ""

    @property
    def rep_dob(self):
        return Counter(self.dobs).most_common(1)[0][0] if self.dobs else None


def _union_by_unzr(records: list[dict], clusters: list[_Cluster]) -> list[dict]:
    """Прохід 1 — точний union по УНЗР. Повертає записи без УНЗР."""
    by_unzr: dict[str, _Cluster] = {}
    no_unzr: list[dict] = []
    for rec in records:
        if not rec["unzr"]:
            no_unzr.append(rec)
            continue
        c = by_unzr.get(rec["unzr"])
        if c is None:
            c = _Cluster(len(clusters))
            clusters.append(c)
            by_unzr[rec["unzr"]] = c
        c.add(rec)
    return no_unzr


def _index_by_dob(clusters: list[_Cluster]) -> dict[str, list[_Cluster]]:
    """Індекс блокування за датою народження."""
    by_dob: dict[str, list[_Cluster]] = {}
    for c in clusters:
        if c.rep_dob:
            by_dob.setdefault(c.rep_dob, []).append(c)
    return by_dob


def _best_match(nk: str, cand: list[_Cluster]) -> tuple[_Cluster | None, int]:
    """Найкращий кандидат-кластер за fuzzy-схожістю ПІБ."""
    best, best_score = None, 0
    for c in cand:
        sc = fuzz.token_sort_ratio(nk, c.rep_name)
        if sc > best_score:
            best, best_score = c, sc
    return best, best_score


def _fuzzy_attach(no_unzr: list[dict], clusters: list[_Cluster],
                  by_dob: dict[str, list[_Cluster]]) -> int:
    """Прохід 2 — fuzzy для записів без УНЗР. Повертає к-сть приєднаних."""
    fuzzy_attached = 0
    for rec in no_unzr:
        nk = _name_key(rec["ln"], rec["fn"], rec["sn"])
        cand = by_dob.get(rec["dob"], []) if rec["dob"] else []
        best, best_score = _best_match(nk, cand)
        if best is not None and best_score >= FUZZY_THRESHOLD:
            best.add(rec)
            fuzzy_attached += 1
        else:
            c = _Cluster(len(clusters))
            clusters.append(c)
            c.add(rec)
            if rec["dob"]:
                by_dob.setdefault(rec["dob"], []).append(c)
    return fuzzy_attached


def _build_entity(c: _Cluster) -> dict:
    return {
        "entity_id": c.id,
        "unzr": c.unzr,
        "pib": c.rep_name.title(),
        "birth_date": c.rep_dob,
        "registries": sorted(c.rows_by_reg.keys()),
        "n_registries": len(c.rows_by_reg),
        "rows_by_reg": c.rows_by_reg,
        "members": c.members,
    }


def match(records: list[dict] | None = None) -> list[dict]:
    if records is None:
        records = load_all_records()
    clusters: list[_Cluster] = []

    no_unzr = _union_by_unzr(records, clusters)
    by_dob = _index_by_dob(clusters)
    fuzzy_attached = _fuzzy_attach(no_unzr, clusters, by_dob)

    entities = [_build_entity(c) for c in clusters]
    global LAST_STATS
    LAST_STATS = {"n_entities": len(entities), "fuzzy_attached": fuzzy_attached,
                  "no_unzr_records": len(no_unzr)}
    return entities


LAST_STATS: dict = {}
