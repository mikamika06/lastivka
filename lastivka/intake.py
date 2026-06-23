"""
Модуль 10 — Інтейк (передні двері). За реальною практикою ССД основний потік кейсів
заходить через ПОВІДОМЛЕННЯ (гаряча лінія / сусіди / школа), а не проактивний крос-реєстр.

Повідомлення ВІДКРИВАЄ попередній кейс; крос-реєстрова детекція/скоринг працюють як
ТРІАЖ + КОРРОБОРАЦІЯ + ПРІОРИТЕЗАЦІЯ над ним (дедуп, ранжування за дедлайном 585,
відсів «помста-сусід»). ІНВАРІАНТ: повідомлення НЕ тягне eHealth/ЄРДР — лише відкриває
кейс і запускає тріаж (корроборація через PSI-членство, не зміст).
"""
from __future__ import annotations
import hashlib
import random

_KEY = b"lastivka-intake-2026"


def _h(*parts, n: int = 8) -> int:
    """Детермінований хеш (blake2b), стабільний між процесами (на відміну від builtin hash())."""
    raw = "|".join(str(p) for p in parts).encode()
    return int.from_bytes(hashlib.blake2b(raw, key=_KEY, digest_size=8).digest(), "big") % (10 ** n)

CHANNELS = {
    "116111": "Нацдитяча лінія (ГО «Ла Страда», цілодобово)",
    "1545": "Урядовий контактний центр (роутер, цілодобово)",
    "1547": "Лінія ДН / торгівля людьми / насильство щодо дітей (цілодобово)",
    "school_duty": "Обовʼязок закладу освіти (ПКМУ №684: 10 робочих днів відсутності)",
    "medical_duty": "Медзаклад (≤1 доба; ≤3 год у закладі)",
    "102": "Поліція (невідкладно)",
    "neighbor": "Звернення сусіда/громадянина",
}

# Реакція за верифікованими актами (ПКМУ №585/2020, №1513/2025, №800/2018).
DL_URGENT = "невідкладно / ≤3 год (загроза життю; ПКМУ №1513/2025)"
DL_SAFETY = "реєстрація негайно; оцінка безпеки ≤1 доба (ПКМУ №585/2020)"
DL_GENERAL = "реєстрація негайно; розгляд ≤14 кал. днів (ПКМУ №585/2020)"

_URGENT_VIOL = {"P1_physical_home", "F6_sexual_abuse", "W7_trafficking", "W5_deportation",
                "F1_psych_violence"}


def open_report(channel: str, child_ref: str, reporter: str, narrative: str = "",
                anonymous: bool = False, ts: str | None = None, entity_id: int | None = None) -> dict:
    """Відкриває попередній кейс із повідомлення. Повертає лише метадані (БЕЗ pull реєстрів)."""
    rid = _h(channel, child_ref, reporter, ts, n=9)
    return {
        "report_id": rid,
        "channel": channel,
        "channel_ua": CHANNELS.get(channel, channel),
        "child_pseudonym": f"px-{_h(child_ref, n=8):08d}",
        "entity_id": entity_id,                     # синтетичний лінк для демо (у проді — PSI-збіг)
        "reporter_type": reporter,
        "anonymous": anonymous,
        "narrative": narrative,
        "received_at": ts,
        "status": "provisional",
    }


def dedupe(reports: list[dict]) -> dict:
    """Групує звернення за псевдонімом дитини (одна дитина — кілька каналів)."""
    by_child: dict[str, list[dict]] = {}
    for r in reports:
        by_child.setdefault(r["child_pseudonym"], []).append(r)
    return by_child


def _deadline(channel: str, violations: set[str]) -> str:
    if channel in ("102", "1547", "medical_duty") or (violations & _URGENT_VIOL):
        return DL_URGENT
    if violations:
        return DL_SAFETY
    return DL_GENERAL


def triage(reports: list[dict], detections_by_id: dict, cfg: dict | None = None) -> dict:
    """
    Тріаж попередніх кейсів:
    - КОРРОБОРАЦІЯ: дитина крос-реєстрово підтверджена (≥2 кластери-докази) АБО ≥2 канали.
      Стіна: перевіряємо лише ЧЛЕНСТВО (є/нема порушень), НЕ тягнемо зміст walled-реєстрів.
    - «помста-сусід»: одиничне анонімне непідтверджене → демпфер у скорингу.
    - дедлайн реагування за ПКМУ №585/№1513.
    Повертає {cases: [...], by_entity: {entity_id: {intake_source, intake_corroborated}}}.
    """
    by_child = dedupe(reports)
    cases, by_entity = [], {}
    for pseud, group in by_child.items():
        channels = {g["channel"] for g in group}
        eids = {g["entity_id"] for g in group if g["entity_id"] is not None}
        dets = []
        for eid in eids:
            dets += detections_by_id.get(eid, [])
        viol = {d["violation"] for d in dets}
        ev_regs = set()
        for d in dets:
            ev_regs |= set(d.get("evidence", []))
        # корроборація: дитина має крос-реєстрові порушення (= в ≥1 кластері, її вже флагнуто)
        # АБО ≥2 канали/докази. Дитина в черзі завжди корроборована → демпфер НЕ топить реальні кейси.
        corroborated = bool(viol) or (len(channels) >= 2) or (len(ev_regs) >= 2)
        # «помста-сусід»: одиничне анонімне БЕЗ жодного крос-реєстрового підтвердження (не в черзі)
        anon_single = len(group) == 1 and group[0]["anonymous"] and not viol and len(channels) < 2
        binding = _deadline(min(channels, key=lambda c: 0 if c in ("102", "1547", "medical_duty") else 1),
                            viol)
        case = {
            "child_pseudonym": pseud,
            "entity_id": next(iter(eids), None),
            "channels": sorted(channels),
            "n_reports": len(group),
            "corroborated": corroborated,
            "malicious_suspected": anon_single,
            "matched_violations": sorted(viol),
            "reaction_deadline": binding,
            "urgent": binding == DL_URGENT,
        }
        cases.append(case)
        for eid in eids:
            by_entity[eid] = {"intake_source": sorted(channels)[0],
                              "intake_corroborated": corroborated}
    # ранг: невідкладні → підтверджені → більше каналів
    cases.sort(key=lambda c: (not c["urgent"], not c["corroborated"], -c["n_reports"]))
    return {"cases": cases, "by_entity": by_entity}


def synth_reports(entities: list[dict], detections: list[dict], cfg: dict,
                  rng: random.Random) -> list[dict]:
    """
    Синтетичні звернення для демо: частина — на дітей із порушеннями (підтверджені,
    зайшли «з лінії»); частина — анонімні сусідські на чистих дітей (непідтверджені/«помста»);
    кілька дублікатів (та сама дитина, ≥2 канали) для демонстрації дедупу.
    """
    det_by_id = {d["entity_id"]: d["detections"] for d in detections}
    reports = []
    ts0 = f"{cfg['population']['start_year'] + 1}-03-01"

    def ref(e):
        return e.get("unzr") or f"e{e['entity_id']}"

    # 1) кейси з порушеннями → звернення з релевантного каналу
    with_det = [e for e in entities if e["entity_id"] in det_by_id]
    rng.shuffle(with_det)
    for e in with_det[:int(len(with_det) * 0.5)]:
        viol = {d["violation"] for d in det_by_id[e["entity_id"]]}
        if viol & {"P1_physical_home", "F1_psych_violence", "F6_sexual_abuse"}:
            ch = rng.choice(["1547", "116111", "102"])
        elif viol & {"W3_out_of_education", "F4_child_labor"}:
            ch = "school_duty"
        elif viol & {"W8_medical_access", "F3_neglect"}:
            ch = rng.choice(["medical_duty", "116111"])
        else:
            ch = rng.choice(["116111", "1545"])
        reports.append(open_report(ch, ref(e), reporter="мандатований" if ch.endswith("duty") else "громадянин",
                                   anonymous=ch == "116111" and rng.random() < 0.4,
                                   ts=ts0, entity_id=e["entity_id"]))
        # дублікат іншим каналом (дедуп-демо)
        if rng.random() < 0.2:
            reports.append(open_report("1545", ref(e), reporter="громадянин", ts=ts0,
                                       entity_id=e["entity_id"]))

    # 2) анонімні сусідські звернення на ЧИСТИХ дітей → непідтверджені («помста-сусід»)
    clean = [e for e in entities if e["entity_id"] not in det_by_id]
    rng.shuffle(clean)
    for e in clean[:60]:
        reports.append(open_report("neighbor", ref(e), reporter="сусід", narrative="скарга на сімʼю",
                                   anonymous=True, ts=ts0, entity_id=e["entity_id"]))
    return reports
