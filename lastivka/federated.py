"""
Модуль 12 — ФЕДЕРАТИВНА детекція (compute-to-data, прод-режим).

Кожен реєстр = окремий LRA-вузол: читає сирі рядки ЛИШЕ локально, рахує СВОЇ сигнали
і віддає назовні `signal envelope` (diff від базової лінії), не сирі дані. C1-агрегатор
зводить envelope'и за псевдонімом і застосовує ТІ САМІ правила (`detection._apply_rules`),
що й централь — тож порушення ІДЕНТИЧНІ, але дані силосів не перетинають межу.

WALLED (ЕСОЗ/ЄРДР/TERVIS): pull заборонено в коді. Сигнал лише авторизованим PUSH
(лікарське повідомлення / дозвіл прокурора). `push_walled=True` моделює активний push-канал.

Так «наше» працює як у проді: N LRA-вузлів (по одному на реєстр дитини) + 1 агрегатор.
"""
from __future__ import annotations

from . import detection, privacy
from .emitters import WALLED

PSI_KEY = b"lastivka-federated-psi-key-2026"


def pseudonym(unzr) -> str | None:
    """Псевдонім для крос-силосного перетину (HMAC; не відновлюється до УНЗР)."""
    return next(iter(privacy.psi_tokens([unzr], PSI_KEY)), None) if unzr else None


def lra_node(registry: str, rows: list, cfg: dict, birth_date, baseline: dict,
             push: bool = False) -> dict:
    """Один LRA-вузол: локальні сигнали реєстру → envelope (diff від baseline).
    Сирі рядки лишаються тут; назовні — лише похідні сигнали."""
    is_walled = registry in WALLED
    if is_walled and not push:
        return {"registry": registry, "blocked": True, "signals": {},
                "note": "WALLED: pull→emit заборонено (КПК ст.222 / медтаємниця); лише авторизований push"}
    # обчислення ПОРУЧ із даними: тільки рядки цього силосу
    s_reg = detection._signals({"rows_by_reg": {registry: rows}, "birth_date": birth_date}, cfg)
    diff = {k: v for k, v in s_reg.items() if s_reg.get(k) != baseline.get(k)}
    return {"registry": registry, "blocked": False, "signals": diff}


def assemble(ent: dict, cfg: dict, push_walled: bool = True):
    """C1-агрегатор: запускає LRA по кожному силосу, зводить envelope'и у повний `s`.
    Повертає (s, envelopes, n_nodes). Сімейні/вікові сигнали — від C1 (familygraph)."""
    bd = ent.get("birth_date")
    # СТАРТ агрегатора: реальні family/age (від C1) + дефолти реєстрів
    s = detection._signals({**ent, "rows_by_reg": {}}, cfg)
    # БАЗА вузла: чисті дефолти реєстрів БЕЗ family-контексту — щоб вузол НЕ емітив сімейні ключі
    pure_baseline = detection._signals({"rows_by_reg": {}, "birth_date": bd}, cfg)
    envelopes = []
    for reg, rows in ent.get("rows_by_reg", {}).items():
        env = lra_node(reg, rows, cfg, bd, pure_baseline, push=(reg in WALLED and push_walled))
        envelopes.append(env)
        if not env["blocked"]:
            s.update(env["signals"])   # агрегатор накладає лише реєстрові похідні сигнали
    n_nodes = sum(1 for e in envelopes if not e["blocked"])
    return s, envelopes, n_nodes


def federated_detect_entity(ent: dict, cfg: dict, push_walled: bool = True) -> list[dict]:
    """Федеративний еквівалент detection.detect_entity: LRA-вузли → зведення → ті самі правила."""
    s, _envs, _n = assemble(ent, cfg, push_walled)
    return detection._apply_rules(s)


def federated_detect_all(entities: list, cfg: dict, push_walled: bool = True) -> list[dict]:
    """Прод-режим пайплайну: детекція через федеративні LRA-вузли замість централі."""
    out = []
    for ent in entities:
        det = federated_detect_entity(ent, cfg, push_walled)
        if det:
            out.append({"entity_id": ent["entity_id"], "unzr": ent.get("unzr"),
                        "pib": ent.get("pib"), "birth_date": ent.get("birth_date"),
                        "n_registries": ent.get("n_registries", 0), "detections": det})
    return out


def node_stats(entities: list, cfg: dict, push_walled: bool = True) -> dict:
    """Скільки LRA-вузлів реально працює (по одному на реєстр на дитину) + walled-блоки."""
    total_nodes = walled_blocked = walled_pushed = 0
    children = 0
    for ent in entities:
        _s, envs, n = assemble(ent, cfg, push_walled)
        children += 1
        total_nodes += n
        walled_blocked += sum(1 for e in envs if e["blocked"])
        walled_pushed += sum(1 for e in envs if not e["blocked"] and e["registry"] in WALLED)
    return {"children": children, "active_lra_nodes": total_nodes,
            "avg_nodes_per_child": round(total_nodes / max(1, children), 2),
            "walled_push_signals": walled_pushed, "walled_blocked": walled_blocked,
            "aggregators": 1, "mode": "push_walled" if push_walled else "pull_only"}
