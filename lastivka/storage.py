"""
Сховище. Кожен реєстр = ОКРЕМА SQLite-база у out/registries/<db> — це і є силоси
(кожна установа тримає свою БД; вони юридично/технічно не злиті). God-view і
результати пайплайну — в окремій out/godview.db / out/pipeline.db.
"""
from __future__ import annotations
import os
import json
import sqlite3

OUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "out")
REG_DIR = os.path.join(OUT, "registries")


def _ensure_dirs():
    os.makedirs(REG_DIR, exist_ok=True)


def _table_for(code: str) -> str:
    return f"reg_{code.lower()}"


def write_registry(code: str, db_file: str, rows: list[dict]):
    """Створює окрему БД реєстру та пише рядки (схема з union ключів).
    Ключі з префіксом '_' (прихована істина) НЕ пишуться в БД реєстру,
    а повертаються окремо для god-view оцінки. Повертає (path, table, n, truth_ids)."""
    _ensure_dirs()
    path = os.path.join(REG_DIR, db_file)
    table = _table_for(code)
    truth_ids = [r.get("_true_id") for r in rows]
    cols = []
    seen = set()
    for r in rows:
        for k in r:
            if k.startswith("_") or k in seen:
                continue
            seen.add(k)
            cols.append(k)
    if not cols:
        cols = ["unzr"]
    q = '"'
    col_defs = ", ".join(f"{q}{c}{q} TEXT" for c in cols)
    col_list = ", ".join(f"{q}{c}{q}" for c in cols)
    placeholders = ", ".join("?" for _ in cols)
    con = sqlite3.connect(path)
    con.execute(f"DROP TABLE IF EXISTS {table}")
    con.execute(f"CREATE TABLE {table} ({col_defs})")
    con.executemany(
        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})",
        [tuple(_ser(r.get(c)) for c in cols) for r in rows],
    )
    con.commit()
    con.close()
    return path, table, len(rows), truth_ids


def write_record_truth(membership: list[tuple]):
    """Прихована істина: (reg, rowid, true_id) — лише в god-view, не в реєстрах."""
    _ensure_dirs()
    path = os.path.join(OUT, "godview.db")
    con = sqlite3.connect(path)
    con.execute("DROP TABLE IF EXISTS record_truth")
    con.execute("CREATE TABLE record_truth (reg TEXT, rowid INTEGER, true_id INTEGER)")
    con.executemany("INSERT INTO record_truth VALUES (?,?,?)", membership)
    con.commit()
    con.close()


def read_record_truth():
    import pandas as pd
    con = sqlite3.connect(os.path.join(OUT, "godview.db"))
    df = pd.read_sql_query("SELECT * FROM record_truth", con)
    con.close()
    return df


def _ser(v):
    if isinstance(v, bool):
        return "1" if v else "0"
    if v is None:
        return None
    return str(v)


def read_registry(db_file: str, code: str):
    import pandas as pd
    path = os.path.join(REG_DIR, db_file)
    con = sqlite3.connect(path)
    df = pd.read_sql_query(f"SELECT * FROM {_table_for(code)}", con)
    con.close()
    return df


def write_godview(children, cfg):
    """God-view ground truth (окрема БД, недоступна детектору)."""
    _ensure_dirs()
    path = os.path.join(OUT, "godview.db")
    con = sqlite3.connect(path)
    con.execute("DROP TABLE IF EXISTS children")
    con.execute("""CREATE TABLE children (
        internal_id INTEGER, unzr TEXT, rnokpp TEXT, pib TEXT, birth_date TEXT,
        gender TEXT, oblast TEXT, has_disability INTEGER, has_chronic INTEGER,
        parental_risk INTEGER, labels TEXT, shocks TEXT)""")
    con.executemany(
        "INSERT INTO children VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [(c.internal_id, c.unzr, c.rnokpp, c.pib, c.birth_date.isoformat(), c.gender,
          c.oblast, int(c.has_disability), int(c.has_chronic), int(c.parental_risk),
          json.dumps(c.labels, ensure_ascii=False),
          json.dumps([{"kind": s.kind, "month": s.month} for s in c.shocks], ensure_ascii=False))
         for c in children])
    con.commit()
    con.close()
    return path


def read_godview():
    import pandas as pd
    path = os.path.join(OUT, "godview.db")
    con = sqlite3.connect(path)
    df = pd.read_sql_query("SELECT * FROM children", con)
    con.close()
    return df
