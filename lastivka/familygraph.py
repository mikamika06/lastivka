"""
Модуль 9 — Family graph (production / C1-rollup).

Будує сімейний граф над виходом matching.match() через СПОСТЕРЕЖУВАНИЙ спільний
батьківський РНОКПП (ДРАЦС mother_rnokpp/father_rnokpp) — реальний ключ зв'язування.
Крос-sibling резолюція — лише на ССД/C1-рівні (єдина роль з інтегрованим доступом).

Стіни: НІКОЛИ не traverse-имо walled-реєстри сиблінга (EHEALTH/ERDR) — лише
спостережувані не-walled маркери (ДІТИ/ДН/Діти-війни). Сигнал іде в тріаж/корроборацію,
не у ground-truth (немає циркулярності).
"""
from __future__ import annotations

import random

from .emitters import WALLED

# Реєстри, дозволені для крос-sibling спостереження (НЕ walled).
_SIBLING_OBSERVABLE = {"DITY", "DV", "CHILDWAR", "VPO", "DRRP", "EDRSR"}
assert not (_SIBLING_OBSERVABLE & WALLED), "family-graph не сміє читати walled-реєстри сиблінга"


def _parent_keys(ent: dict) -> set[str]:
    keys = set()
    for r in ent["rows_by_reg"].get("DRACS", []):
        for f in ("mother_rnokpp", "father_rnokpp"):
            v = r.get(f)
            if v and str(v) not in ("None", ""):
                keys.add(str(v))
    return keys


def _is_single_parent(ent: dict) -> bool:
    for r in ent["rows_by_reg"].get("DRACS", []):
        if not r.get("father_rnokpp") or str(r.get("father_rnokpp")) in ("None", ""):
            return True
    return False


def _pfu_unemployed(ent: dict) -> bool:
    return any(r.get("employment_status_indicator") == "безробітний"
               for r in ent["rows_by_reg"].get("PFU", []))


def _kinship_care(ent: dict) -> bool:
    for r in ent["rows_by_reg"].get("DITY", []):
        st = str(r.get("child_status", ""))
        if any(k in st for k in ("опік", "піклуванн", "родин")):
            return True
    return False


def _kin_relation(ent: dict) -> str | None:
    """Тип опіки родича (kin|non_kin) з ЄІАС «Діти» — для kin_caregiver_relation."""
    for r in ent["rows_by_reg"].get("DITY", []):
        st = str(r.get("child_status", ""))
        if any(k in st for k in ("родин", "опік", "піклуванн")):
            return "kin" if any(k in st for k in ("родин", "родич", "баб", "дід")) else "non_kin"
    return None


def _derive_parent_push(ent: dict, eid: int) -> dict:
    """Push/consent-булеани батьків (залежність / психічне здоровʼя / судимість / увʼязнення).

    Це НЕ pull із реєстрів: ЄРДР (КПК ст.222) і ЕСОЗ (медтаємниця, Основи 2801-XII)
    лишаються WALLED. У синтетиці симулюємо авторизований push-сигнал «факт, не зміст»
    (функціональний вплив на догляд, не діагноз/МКХ-10) детерміновано за entity_id,
    корелюючи з уже спостережуваним контекстом (ДН/безробіття) — без жодного walled-pull.
    Споживається ЛИШЕ як dimension=parental (виключено з F1-оцінки) → F1 інваріантний.
    """
    R = ent["rows_by_reg"]
    has_dv = bool(R.get("DV"))
    unemployed = any(r.get("employment_status_indicator") == "безробітний" for r in R.get("PFU", []))
    hardship = any(r.get("difficult_life_circumstances") == "так" for r in R.get("DITY", []))
    rng = random.Random(20240517 + eid * 7919)            # стабільний seed на сутність
    ctx = 1.0 + (1.0 if has_dv else 0.0) + (0.4 if unemployed else 0.0) + (0.4 if hardship else 0.0)
    addiction = rng.random() < min(0.035 * ctx, 0.16)     # залежність (функц. вплив на догляд)
    mental = rng.random() < min(0.022 * (1.0 + (0.8 if has_dv else 0.0)), 0.08)  # психічне здоровʼя
    criminal = rng.random() < min(0.030 * (1.0 + (1.5 if has_dv else 0.0)), 0.12)  # судимість (факт)
    incarcerated = criminal and rng.random() < 0.30       # увʼязнення — підмножина судимості
    return {"parent_addiction": addiction, "parent_mental_health": mental,
            "parent_criminal": criminal, "parent_incarcerated": incarcerated}


def _observable_marks(ent: dict) -> set[str]:
    """Спостережувані маркери ризику дитини (для rollup на сиблінгів). Без walled."""
    R = ent["rows_by_reg"]
    marks = set()
    for r in R.get("DITY", []):
        st = str(r.get("child_status", ""))
        if st and st != "None":
            marks.add("ssd")
        if any(k in st for k in ("сирота", "піклуванн", "опік", "без супроводу", "ПБП", "позбавл")):
            marks.add("in_care")
    if R.get("DV"):
        marks.add("dv")
    if R.get("CHILDWAR"):
        marks.add("childwar")
    return marks


def _components(entities: list[dict]):
    """Звʼязні компоненти за спільним батьківським РНОКПП."""
    by_parent: dict[str, list[int]] = {}
    for e in entities:
        for k in _parent_keys(e):
            by_parent.setdefault(k, []).append(e["entity_id"])
    adj: dict[int, set] = {}
    for ids in by_parent.values():
        if len(ids) < 2:
            continue
        for a in ids:
            adj.setdefault(a, set()).update(i for i in ids if i != a)
    seen, comp_of, comps = set(), {}, []
    for e in entities:
        eid = e["entity_id"]
        if eid in seen or eid not in adj:
            continue
        stack, comp = [eid], []
        while stack:
            x = stack.pop()
            if x in seen:
                continue
            seen.add(x)
            comp.append(x)
            stack.extend(adj.get(x, ()))
        cid = len(comps)
        comps.append(comp)
        for x in comp:
            comp_of[x] = cid
    return comps, comp_of


def rollup(entities: list[dict], cfg: dict | None = None) -> list[dict]:
    """Додає до кожної сутності household-блок + плоскі сімейні сигнали (для detection)."""
    comps, comp_of = _components(entities)
    ent_by_id = {e["entity_id"]: e for e in entities}
    marks = {eid: _observable_marks(ent_by_id[eid]) for eid in comp_of}

    for e in entities:
        eid = e["entity_id"]
        comp = comps[comp_of[eid]] if eid in comp_of else [eid]
        sibs = [s for s in comp if s != eid]

        sib_marks: set[str] = set()
        churn = 0
        for s in sibs:
            sib_marks |= marks.get(s, set())
            if ent_by_id[s]["rows_by_reg"].get("VPO"):
                churn += 1

        single_unemp = _is_single_parent(e) and _pfu_unemployed(e)
        sib_in_care = "in_care" in sib_marks

        # щільність ризику сім'ї (0..1): розкладена на компоненти (для UI density_breakdown)
        bd_marks = round(0.4 * min(len(sib_marks), 3) / 3, 3)
        bd_in_care = 0.3 if sib_in_care else 0.0
        bd_single = 0.2 if single_unemp else 0.0
        bd_nsib = round(0.1 * min(len(sibs), 3) / 3, 3)
        density = bd_marks + bd_in_care + bd_single + bd_nsib

        push = _derive_parent_push(e, eid)

        e["household"] = {"household_id": comp_of.get(eid),
                          "sibling_entity_ids": sibs, "size": len(comp)}
        e["n_siblings"] = len(sibs)
        e["sibling_in_care"] = sib_in_care
        e["sibling_prior_violation"] = sib_marks
        e["kinship_care"] = _kinship_care(e)
        e["kin_caregiver_relation"] = _kin_relation(e)
        e["single_parent_unemployed"] = single_unemp
        e["household_churn"] = churn
        # новий співмешканець (household-нестабільність) — derived seeded (губиться на C1; ~6%,
        # вище для неповних сімей). Вмикає compound-watch + P1/F1 corroboration (раніше завжди False).
        _co = random.Random(20240613 + eid * 5273)
        e["new_cohabitant_recent"] = _co.random() < (0.11 if _is_single_parent(e) else 0.04)
        # батьківські push/consent-булеани (НІКОЛИ pull з ЄРДР/ЕСОЗ; лише факт, не зміст)
        e["parent_addiction"] = push["parent_addiction"]
        e["parent_mental_health"] = push["parent_mental_health"]
        e["parent_criminal"] = push["parent_criminal"]
        e["parent_incarcerated"] = push["parent_incarcerated"]
        e["household_risk_density"] = round(min(density, 1.0), 3)
        e["density_breakdown"] = {"sibling_marks": bd_marks, "sibling_in_care": bd_in_care,
                                  "single_parent_unemployed": bd_single, "n_siblings": bd_nsib}
    return entities


def household_summary(entities: list[dict]) -> dict:
    """Зведення для метрик/UI."""
    hh = {}
    for e in entities:
        h = e.get("household", {})
        if h.get("size", 1) > 1 and h.get("household_id") is not None:
            hh.setdefault(h["household_id"], set()).add(e["entity_id"])
    sizes = [len(v) for v in hh.values()]
    return {"n_households": len(hh),
            "children_in_multichild": sum(sizes),
            "multichild_share": round(sum(sizes) / max(1, len(entities)), 3),
            "n_with_sibling_in_care": sum(1 for e in entities if e.get("sibling_in_care"))}
