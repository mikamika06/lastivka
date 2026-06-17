"""
Модуль 10 — Cross-border (Україна ↔ Естонія).
Спільного ідентифікатора НЕМАЄ (УНЗР ≠ isikukood), тож звʼязок UA↔EE — privacy-preserving
fuzzy-матч по транслітерованому ПІБ + дата народження (PPRL); кордон перетинає ЛИШЕ сигнал
«збіг є», не сирий PII. Далі: узгодження домашніх W3/W8 (континуальність через кордон) і
виявлення КРОС-КОРДОННИХ ризиків (щілина, UASC, розрив освіти/медицини).
"""
from __future__ import annotations
from collections import defaultdict
from datetime import date

from .transliteration import translit_official
from . import privacy

LINK_THRESHOLD = 0.80           # Dice на Bloom-фільтрах (0..1)
_XB_KEY = b"lastivka-crossborder-psi"
_X_SEVERITY_ACUITY = "acute"    # крос-кордонні ризики — щойно після прибуття


def _clk(entity: dict) -> int:
    """Bloom-filter відбиток дитини: транслітероване латиною ПІБ + дата народження.
    Кордон перетинає лише цей відбиток (PPRL), не plaintext."""
    pib = translit_official(str(entity.get("pib") or "")).lower().split()
    last = pib[0] if pib else ""
    first = pib[1] if len(pib) > 1 else ""
    return privacy.clk(last, first, "", entity.get("birth_date"), None, _XB_KEY)


def _school_age(birth_date, sy=2023, T=24) -> bool:
    try:
        b = date.fromisoformat(str(birth_date)[:10])
        return 6 <= (sy + (T - 1) // 12) - b.year <= 17
    except ValueError:
        return True


def link(entities: list[dict], threshold: float = LINK_THRESHOLD):
    """Privacy-preserving звʼязок EE↔UA по Bloom-filter PPRL (Dice). Блокування за датою народж.
    Жоден plaintext не перетинає кордон — лише зашифровані відбитки й оцінка збігу."""
    ua = [e for e in entities if e.get("country") == "UA"]
    ee = [e for e in entities if e.get("country") == "EE"]
    ua_by_dob = defaultdict(list)
    for e in ua:
        ua_by_dob[e.get("birth_date")].append((e, _clk(e)))

    links, matched_ee = [], set()
    for e in ee:
        ec = _clk(e)
        best, best_s = None, 0.0
        for u, uc in ua_by_dob.get(e.get("birth_date"), []):
            d = privacy.dice(ec, uc)
            if d > best_s:
                best, best_s = u, d
        if best is not None and best_s >= threshold:
            links.append({"ua": best, "ee": e, "score": round(best_s, 3)})
            matched_ee.add(e["entity_id"])
    return links, [e for e in ee if e["entity_id"] not in matched_ee]


def _x_risks(ua: dict, ee: dict) -> list[dict]:
    R_ua, R_ee = ua["rows_by_reg"], ee["rows_by_reg"]
    school_age = _school_age(ua.get("birth_date"))
    ee_school = "EHIS_EE" in R_ee
    ee_health = "TERVIS" in R_ee
    ee_registered = "RAHV" in R_ee
    ua_had_school = "EDEBO" in R_ua
    ua_had_chronic = "CBI" in R_ua or any(
        r.get("condition_code") == "chronic" for r in R_ua.get("EHEALTH", []))
    uasc = any("lastekaitse" in str(r.get("huvitis_tyyp", "")) for r in R_ee.get("SKAIS", [])) or \
        any(r.get("hooldusoigus") == "eestkostja määramata" for r in R_ee.get("RAHV", []))

    out = []

    def add(v, ev):
        out.append({"violation": v, "evidence": sorted(set(ev)), "onset_month": None,
                    "acuity": _X_SEVERITY_ACUITY})

    if school_age and ua_had_school and not ee_school:
        add("X4_edu_rupture", ["EDEBO", "RAHV"])
    if ee_registered and school_age and not ee_school and not ee_health:
        add("X1_gap", ["RAHV", "EDEBO"])
    if ua_had_chronic and not ee_health:
        add("X3_med_rupture", (["CBI"] if "CBI" in R_ua else ["EHEALTH"]) + ["RAHV"])
    if uasc:
        add("X2_uasc", ["RAHV", "SKAIS"])
    return out


def apply(entities: list[dict], detections: list[dict], cfg: dict | None = None):
    """Зливає звʼязані EE-сутності в UA-профіль, узгоджує W3/W8, додає X-ризики.
    Повертає (entities2, detections2, stats)."""
    links, ee_unmatched = link(entities)
    det_by_id = {d["entity_id"]: d for d in detections}
    merged_ee_ids = set()

    for lk in links:
        ua, ee = lk["ua"], lk["ee"]
        merged_ee_ids.add(ee["entity_id"])
        # обʼєднати профіль (для відображення крос-кордонної стрічки)
        ua["rows_by_reg"] = {**ua["rows_by_reg"], **ee["rows_by_reg"]}
        ua["registries"] = sorted(set(ua["registries"]) | set(ee["registries"]))
        ua["n_registries"] = len(ua["registries"])
        ua["country"] = "UA+EE"
        ua["isikukood"] = ee.get("unzr")
        ua["link_score"] = lk["score"]

        xr = _x_risks(ua, ee)
        # узгодження: для дитини, знайденої в Естонії, домашні W1/W3/W8 (UA-трактування «зник»)
        # заступаються крос-кордонними X-ризиками (континуальність визначає естонський бік)
        d = det_by_id.get(ua["entity_id"])
        if d:
            d["detections"] = [x for x in d["detections"]
                               if x["violation"] not in ("W1_displacement", "W3_out_of_education",
                                                         "W8_medical_access")]
            d["detections"].extend(xr)
        elif xr:
            det_by_id[ua["entity_id"]] = {"entity_id": ua["entity_id"], "unzr": ua["unzr"],
                                          "pib": ua["pib"], "birth_date": ua["birth_date"],
                                          "n_registries": ua["n_registries"], "detections": xr}

    entities2 = [e for e in entities if e["entity_id"] not in merged_ee_ids]
    detections2 = [d for d in det_by_id.values() if d.get("detections")]
    stats = {
        "ee_entities": sum(1 for e in entities if e.get("country") == "EE"),
        "linked": len(links),
        "ee_unmatched": len(ee_unmatched),
        "link_rate": round(len(links) / max(1, len(links) + len(ee_unmatched)), 3),
    }
    return entities2, detections2, stats
