"""
Модуль 11 — LRA (Local Risk Agent): федеративний edge-агент (docs/LRA_DESIGN.md).

Кожен реєстр рахує сигнали ЛОКАЛЬНО (поруч із силосом) і віддає назовні лише
signal envelope — не сирі дані. Зведення (перетин псевдонімів) — ВИКЛЮЧНО на
ССД/C1-агрегаторі через PSI. Гейт важливості: кейс піднімається лише при ≥2 кластерах.

ІНВАРІАНТ стін: WALLED-реєстри (ЕСОЗ/ЄРДР/TERVIS) НЕ мають шляху pull→emit —
сигнал можливий лише авторизованим push (лікарське повідомлення / дозвіл прокурора).
Це формалізація того, що detection._signals робить централізовано: тут — по вузлах.
"""
from __future__ import annotations

from .emitters import ACCESS_CLASS, CLUSTER, WALLED
from . import privacy, detection

DEMO_KEY = b"lastivka-lra-demo-key-2026"

# службові/benign ключі _signals, що не є ризик-індикаторами реєстру
_SKIP = {"T", "age_end", "household_risk_density", "household_churn", "sibling_prior_violation",
         "reatt_school", "reatt_doctor", "enrolled_ever", "police_calls"}


def pseudonym(unzr: str) -> str:
    """Псевдонім для крос-силосного перетину (не відновлюється до УНЗР)."""
    return next(iter(privacy.psi_tokens([unzr], DEMO_KEY)), None)


def lra_emit(registry: str, rows: list[dict], cfg: dict,
             birth_date: str | None = None, unzr: str | None = None,
             push: bool = False) -> list[dict]:
    """
    LRA одного реєстру: локальні сигнали → signal envelopes.
    WALLED: pull заборонено — повертає маркер відмови (лише push легальний).
    """
    ac = ACCESS_CLASS.get(registry, "GATED-L2")
    cl = CLUSTER.get(registry, "?")
    pseud = pseudonym(unzr) if unzr else None
    if ac == "WALLED" and not push:
        return [{"registry": registry, "cluster": cl, "access_class": ac,
                 "indicator": "_blocked", "value": None, "pseudonym": pseud,
                 "note": "WALLED: pull→emit заборонено (КПК ст.222 / медтаємниця); лише авторизований push"}]

    # переюзовуємо ту саму логіку, що й централізована детекція, але на ОДНОМУ силосі
    ent = {"rows_by_reg": {registry: rows}, "birth_date": birth_date}
    sig = detection._signals(ent, cfg)
    envs = []
    for k, v in sig.items():
        if k in _SKIP or k.endswith("_month") or v in (None, False, 0, "", [], set()):
            continue
        envs.append({"registry": registry, "cluster": cl, "access_class": ac,
                     "indicator": k, "value": (v if isinstance(v, (bool, str, int, float)) else True),
                     "pseudonym": pseud})
    return envs


def importance_gate(clusters) -> bool:
    """Кейс важливий лише при перетині ≥2 кластерів (PSI≥2)."""
    return len({c for c in clusters if c and c != "?"}) >= 2


def intersect(envelopes: list[dict]) -> dict:
    """
    C1-агрегатор: зводить envelopes за псевдонімом. Повертає, у скількох кластерах
    дитина присутня + чи проходить гейт важливості. Стіна: _blocked не дає кластера.
    """
    by_pseud: dict = {}
    for e in envelopes:
        p = e.get("pseudonym")
        if p is None:
            continue
        by_pseud.setdefault(p, []).append(e)
    out = {}
    for p, evs in by_pseud.items():
        clusters = {e["cluster"] for e in evs if e.get("indicator") != "_blocked"}
        out[p] = {"clusters": sorted(clusters), "n_clusters": len(clusters),
                  "important": importance_gate(clusters),
                  "blocked": [e["registry"] for e in evs if e.get("indicator") == "_blocked"],
                  "n_signals": sum(1 for e in evs if e.get("indicator") != "_blocked")}
    return out


def run_entity(ent: dict, cfg: dict, push_registries: set | None = None) -> dict:
    """Прогнати всі LRA-вузли дитини федеративно й звести на C1 (демонстрація проти централізації)."""
    push_registries = push_registries or set()
    envs = []
    for reg, rows in ent["rows_by_reg"].items():
        envs += lra_emit(reg, rows, cfg, birth_date=ent.get("birth_date"),
                         unzr=ent.get("unzr"), push=reg in push_registries)
    return {"envelopes": envs, "intersection": intersect(envs)}


def demo(entities: list[dict], cfg: dict) -> dict:
    """
    2-вузлове демо: ЄДЕБО-LRA + ССД-LRA → PSI-перетин (W3 без обміну сирими полями);
    поряд ЕСОЗ-LRA показує WALLED: pull відхилено, проходить лише змодельований push.
    """
    def _has_school_exit(e):
        return any(r.get("study_status") in ("transferred", "expelled")
                   for r in e["rows_by_reg"].get("EDEBO", []))
    target = next((e for e in entities
                   if _has_school_exit(e) and "DITY" in e["rows_by_reg"]
                   and "EHEALTH" in e["rows_by_reg"]), None)
    if target is None:   # запасний варіант — будь-яка з ЄДЕБО+ССД+ЕСОЗ
        target = next((e for e in entities
                       if "EDEBO" in e["rows_by_reg"] and "DITY" in e["rows_by_reg"]
                       and "EHEALTH" in e["rows_by_reg"]), None)
    if target is None:
        return {"error": "немає підходящої сутності для демо"}
    bd, unzr = target.get("birth_date"), target.get("unzr")
    edebo = lra_emit("EDEBO", target["rows_by_reg"]["EDEBO"], cfg, bd, unzr)
    dity = lra_emit("DITY", target["rows_by_reg"]["DITY"], cfg, bd, unzr)
    eh_pull = lra_emit("EHEALTH", target["rows_by_reg"].get("EHEALTH", []), cfg, bd, unzr)            # відхилено
    eh_push = lra_emit("EHEALTH", target["rows_by_reg"].get("EHEALTH", []), cfg, bd, unzr, push=True)  # лікарський push
    inter = intersect(edebo + dity + eh_pull)
    return {
        "entity_id": target["entity_id"],
        "edebo_signals": [e["indicator"] for e in edebo],
        "dity_signals": [e["indicator"] for e in dity],
        "ehealth_pull": eh_pull,                 # WALLED → _blocked
        "ehealth_push_ok": [e["indicator"] for e in eh_push if e["indicator"] != "_blocked"],
        "intersection": inter,
        "note": "Сирі поля силосів не обмінювались — лише envelopes; ЕСОЗ pull відхилено (WALLED).",
    }
