"""
Ластівка — REST API (FastAPI). Віддає чергу тріажу (з поясненням), профіль
сутності, таймлайн подій, відвідуваність та метрики — усе, що потрібно фронтенду.

Запуск:  uvicorn app.api:app --reload --port 8000
"""
import json
import os
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lastivka import pipeline, matching, detection, roles, familygraph, intake, edge_agent, monitoring, crossborder  # noqa: E402
from lastivka.emitters import REGISTRIES, WALLED  # noqa: E402
import yaml as _yaml  # noqa: E402

_CFG = _yaml.safe_load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                         "config", "config.yaml"), encoding="utf-8"))

# Батьківсько-сімейні контрибуції (dimension=parental): severity + спостережуваність/стіна/запобіжник.
# severity дзеркалить config/scoring.yaml; усі ≤0.55 (нижче за дитячі тяжкості 0.60–1.00).
_PARENTAL_SPEC = {
    "P_parent_criminal":  {"severity": 0.55, "observability": "push-only",
                           "wall": "ЄРДР WALLED · КПК ст.222 (таємниця слідства)",
                           "safeguard": "лише факт судимості (push/post-conviction), не зміст провадження"},
    "P_parent_rights":    {"severity": 0.50, "observability": "content",
                           "wall": "ЄДРСР · відкритий (ЗУ 3262-IV)",
                           "safeguard": "не дублює W6 (сирітство); втрата ≠ позбавлення"},
    "P_parent_addiction": {"severity": 0.45, "observability": "push/consent",
                           "wall": "ЕСОЗ WALLED · медтаємниця (Основи 2801-XII)",
                           "safeguard": "факт не зміст; лікування/ремісія — протективний модифікатор"},
    "P_parent_mh":        {"severity": 0.45, "observability": "push/consent",
                           "wall": "ЕСОЗ WALLED · медтаємниця",
                           "safeguard": "функціональний вплив на догляд, не діагноз/МКХ-10"},
    "P_sibling_violation": {"severity": 0.45, "observability": "signal-only",
                            "wall": "PSI на C1 · стіни сиблінга тримаються",
                            "safeguard": "household-рецидив evidenced, не лише бідність"},
    "P_sibling_in_care":  {"severity": 0.40, "observability": "signal-only",
                           "wall": "PSI на C1 · стіни сиблінга тримаються",
                           "safeguard": "контекст, не детермінізм"},
}

app = FastAPI(title="Ластівка API", version="0.2.0",
              description="Privacy-preserving захист прав дитини — крос-реєстрове виявлення")

# CORS — щоб фронтенд (Next.js, :3000) міг звертатися до API (:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REG_ACCESS = {r["code"]: r["access"] for r in REGISTRIES}
_entities = None


def entities():
    global _entities
    if _entities is None:
        ents = familygraph.rollup(matching.match())   # household/сиблінг-сигнали
        dets = detection.detect_all(ents, _CFG)
        # крос-кордон UA↔EE: PPRL-звʼязок → country/isikukood/link_score/X-ризики на сутності
        ents, _dets, _cb = crossborder.apply(ents, dets, _CFG)
        _entities = {e["entity_id"]: e for e in ents}
    return _entities


def oblast_of(ent) -> str:
    for code, fld in (("EDDR", "registered_residence"), ("DRACS", "birth_place"),
                      ("DITY", "place_of_residence")):
        for r in ent.get("rows_by_reg", {}).get(code, []):
            addr = str(r.get(fld) or "")
            if " обл" in addr:
                return addr.split(" обл")[0].split(",")[-1].strip()
    return "—"


@app.get("/metrics")
def metrics():
    return pipeline.read_metrics()


@app.get("/queue")
def queue(tier: str | None = None, immediate: bool = False, limit: int = 500, role: str = "ssd"):
    if role not in roles.ROLES:
        raise HTTPException(400, f"Невідома роль: {role}")
    df = pipeline.read_queue()
    if tier:
        df = df[df.tier == tier]
    if immediate:
        df = df[df.immediate == 1]
    out = []
    for _, r in df.head(limit).iterrows():
        # редакція WALLED: ССД не бачить навіть присутності ЕСОЗ/ЄРДР (КПК ст.222 / медтаємниця)
        regs, protected = roles.split_walled(json.loads(r["registries"]), role)
        contribs = json.loads(r["contributions"])
        for c in contribs:
            ev_kept, ev_prot = roles.split_walled(c.get("evidence", []), role)
            c["evidence"] = ev_kept
            if ev_prot:
                c["evidence_protected"] = len(set(ev_prot))
        out.append({
            "rank": int(r["rank"]), "entity_id": int(r["entity_id"]),
            "unzr": r["unzr"] if r["unzr"] not in (None, "", "None") else None,
            "pib": r["pib"], "birth_date": r["birth_date"], "age": r["age"],
            "country": r.get("country", "UA"), "isikukood": r.get("isikukood"),
            "oblast": r.get("oblast"), "worker_id": r.get("worker_id"),
            "tier": r["tier"], "score": r["score"], "immediate": bool(r["immediate"]),
            "vulnerability": r["vulnerability"],
            "vuln_factors": json.loads(r["vuln_factors"]),
            "violations": json.loads(r["violations"]),
            "registries": regs,
            "protected_sources": len(set(protected)),
            "contributions": contribs,
            "household_risk": r.get("household_risk"),
            "corroborated": (None if r.get("corroborated") is None else bool(r.get("corroborated"))),
            "intake_source": r.get("intake_source"),
        })
    return {"count": len(out), "items": out}


@app.get("/caseload")
def caseload_overview():
    """Розподіл по кейсворкерах: статистика областей, зведення, дедлайни, штат."""
    return pipeline.read_metrics().get("caseload", {})


@app.get("/caseload/worker/{worker_id}")
def caseload_worker(worker_id: str):
    """Персональна черга конкретного наглядача (його топ за терміновістю)."""
    df = pipeline.read_queue()
    rows = df[df.worker_id == worker_id]
    out = []
    for _, r in rows.iterrows():
        out.append({"rank": int(r["rank"]), "entity_id": int(r["entity_id"]),
                    "pib": r["pib"], "age": r["age"], "oblast": r.get("oblast"),
                    "tier": r["tier"], "score": r["score"], "immediate": bool(r["immediate"]),
                    "violations": json.loads(r["violations"])})
    return {"worker_id": worker_id, "count": len(out), "cases": out}


# ── Feedback: захоплення рішень кейсворкера (джерело майбутніх міток для моделі) ──
from pydantic import BaseModel  # noqa: E402
from lastivka import feedback as _feedback  # noqa: E402


class FeedbackIn(BaseModel):
    entity_id: int
    decision: str            # confirmed | rejected | escalated
    outcome: str = "unknown"  # substantiated | unsubstantiated | unknown
    caseworker: str | None = None
    note: str | None = None


@app.post("/feedback")
def post_feedback(fb: FeedbackIn):
    df = pipeline.read_queue()
    row = df[df.entity_id == fb.entity_id]
    extra = {}
    if not row.empty:
        r = row.iloc[0]
        extra = dict(unzr=r["unzr"], pib=r["pib"], tier=r["tier"], score=float(r["score"]),
                     violations=json.loads(r["violations"]))
    try:
        _feedback.log_feedback(fb.entity_id, fb.decision, outcome=fb.outcome,
                               caseworker=fb.caseworker, note=fb.note, **extra)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@app.get("/feedback/stats")
def feedback_stats():
    return _feedback.stats()


@app.get("/crossborder")
def crossborder_metrics():
    """Крос-кордонна статистика UA↔EE: скільки естонських дітей зв'язано (PPRL), скільки незнайдених."""
    return pipeline.read_metrics().get("crossborder", {})


class IntakeIn(BaseModel):
    channel: str                 # 116111 | 1545 | 1547 | school_duty | medical_duty | 102 | neighbor
    child_ref: str
    reporter: str = "громадянин"
    narrative: str = ""
    anonymous: bool = False


@app.get("/intake")
def intake_list():
    """Передні двері: попередні кейси зі звернень + тріаж (дедуп, корроборація, дедлайн 585/1513)."""
    m = pipeline.read_metrics().get("intake", {})
    return {"channels": intake.CHANNELS, "n_reports": m.get("n_reports", 0),
            "household": m.get("household", {}), "cases": m.get("cases", [])}


@app.post("/intake/report")
def intake_report(r: IntakeIn):
    """Відкриває попередній кейс із повідомлення. Повертає лише метадані — БЕЗ pull eHealth/ЄРДР."""
    if r.channel not in intake.CHANNELS:
        raise HTTPException(400, f"Невідомий канал: {r.channel}")
    case = intake.open_report(r.channel, r.child_ref, r.reporter, r.narrative, r.anonymous)
    case["note"] = "Кейс відкрито. Крос-реєстрова перевірка — лише як тріаж/корроборація (стіни ЕСОЗ/ЄРДР тримаються)."
    return case


@app.get("/monitoring")
def monitoring_list():
    """Режим 2 — моніторинг вже-постраждалих: когорти + прогрес плану реінтеграції + флаг погіршення."""
    ents = list(entities().values())
    df = pipeline.read_queue()
    det = [{"entity_id": int(r)} for r in df["entity_id"].tolist()]
    enrolled = monitoring.enroll(ents, det)
    return {"summary": monitoring.summary(enrolled), "cohorts": monitoring.COHORTS,
            "children": enrolled[:200]}


@app.get("/lra/demo")
def lra_demo():
    """LRA (Local Risk Agent): федеративне 2-вузлове демо — локальні сигнали + PSI-перетин,
    ЕСОЗ pull відхилено (WALLED), лікарський push дозволено. Сирі поля не обмінюються."""
    return edge_agent.demo(list(entities().values()), _CFG)


@app.get("/roles")
def roles_list():
    """Перелік рольових кодів кабінету (для перемикача у фронтенді)."""
    return {"roles": [{"code": r, "ua": roles.ROLE_UA[r]} for r in roles.ROLES]}


@app.get("/entity/{entity_id}")
def entity(entity_id: int, role: str = "ssd"):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, "Не знайдено")
    if role not in roles.ROLES:
        raise HTTPException(400, f"Невідома роль: {role}")
    is_own = role == "parent"
    proj = roles.project_records(e["rows_by_reg"], role, is_own_child=is_own)
    records, signals = {}, {}
    for reg, val in proj.items():
        if isinstance(val, dict) and val.get("signal_only"):
            signals[reg] = val
        else:
            records[reg] = len(val)
    # захищені (WALLED) джерела, повністю приховані від ролі — лише лічильник (не які саме)
    protected = sum(1 for reg in e["rows_by_reg"]
                    if reg in WALLED and reg not in records and reg not in signals)
    # ── медичні ФАКТ-сигнали (ССД/поліція): правомірно для оцінки потреб; зміст — за медтаємницею ──
    R = e["rows_by_reg"]
    health = None
    if role in ("ssd", "police"):
        eh = R.get("EHEALTH", [])
        facts = {
            "disability": bool(R.get("CBI_DISABILITY")),
            "chronic": any(r.get("condition_code") == "chronic" or r.get("condition_category") == "chronic" for r in eh),
            "psych_signal": any(r.get("condition_category") == "psych" for r in eh),
            "trauma_signal": any(r.get("condition_category") == "trauma" for r in eh),
            "immunization_gap": any(r.get("resource_type") == "immunization" and r.get("status") == "not_done" for r in eh),
        }
        health = {**facts, "has_any": any(facts.values()),
                  "content_available": False,
                  "legal_basis": "Оцінка потреб дитини — лише факт-сигнали (наявність стану), без діагнозу/МКХ.",
                  "wall": "Зміст (діагноз, лікування) — лікарська таємниця (Основи 2801-XII, ст.39-1/40).",
                  "break_glass": "Розкриття змісту — за згодою законного представника, рішенням суду або у невідкладному випадку через лікаря."}
    # ── крос-кордонний слід в Естонії (ССД + поліція; TERVIS — присутність без змісту) ──
    cb = None
    if role in ("ssd", "police") and (e.get("country") in ("UA+EE", "EE") or e.get("isikukood")):
        def _row(reg, fields):
            rows = R.get(reg, [])
            return {f: rows[0].get(f) for f in fields} if rows else None
        cb = {
            "country": e.get("country", "UA"),
            "isikukood": e.get("isikukood"),
            "link_score": e.get("link_score"),
            "ee_presence": {k: bool(R.get(k)) for k in ("RAHV", "EHIS_EE", "TERVIS", "SKAIS")},
            "ee_details": {
                "RAHV": _row("RAHV", ["elamisluba", "hooldusoigus", "elukoht", "kande_kuupaev"]),
                "EHIS_EE": _row("EHIS_EE", ["oppeasutus", "klass", "oppe_staatus", "immatrikuleerimise_kuupaev"]),
                "SKAIS": _row("SKAIS", ["huvitis_tyyp", "teenus", "kov", "maaramise_kuupaev"]),
            },
        }
    return {"entity_id": e["entity_id"], "unzr": e["unzr"], "pib": e["pib"],
            "birth_date": e["birth_date"], "registries": sorted(records.keys()),
            "n_registries": len(records), "oblast": oblast_of(e),
            "role": role, "records": records, "signals": signals,
            "protected_sources": protected, "crossborder": cb, "health": health}


@app.get("/entity/{entity_id}/timeline")
def timeline(entity_id: int, role: str = "ssd"):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, "Не знайдено")
    if role not in roles.ROLES:
        raise HTTPException(400, f"Невідома роль: {role}")
    R = e["rows_by_reg"]
    ev = []

    def add(date, reg, label):
        if date and date != "None":
            ev.append({"date": str(date)[:10], "registry": reg, "label": label,
                       "level1": reg in WALLED})

    for r in R.get("VPO", []):
        add(r.get("displacement_date"), "VPO", f"Переміщення → {r.get('actual_residence_place')}")
    for r in R.get("EDEBO", []):
        if r.get("study_status") in ("transferred", "expelled"):
            add(r.get("status_effective_date"), "EDEBO", f"Вихід зі школи (статус: {r.get('study_status')})")
    for r in R.get("EHEALTH", []):
        if r.get("resource_type") == "declaration" and r.get("status") == "terminated":
            add(r.get("end_date"), "EHEALTH", "Декларацію із сімейним лікарем закрито")
        if r.get("condition_category") in ("trauma", "psych") and r.get("date"):
            tag = "травма" if r.get("condition_category") == "trauma" else "психолог"
            rep = " (повторне)" if str(r.get("is_repeat")) in ("1", "True", "true") else ""
            add(r.get("date"), "EHEALTH", f"Звернення: {tag}{rep}")
    for r in R.get("DRACS", []):
        if r.get("act_type") == "смерть":
            add(r.get("registration_date") or r.get("reg_date"), "DRACS", "Акт про смерть одного з батьків")
    for r in R.get("CHILDWAR", []):
        add(r.get("incident_date"), "CHILDWAR", f"Статус «Діти війни»: {r.get('status_category')}")
    for r in R.get("DITY", []):
        add(r.get("primary_registration_date"), "DITY", f"Облік ССД: {r.get('child_status')}")
    for r in R.get("EDRSR", []):
        add(r.get("decision_date") or r.get("adjudication_date"), "EDRSR", "Судове рішення щодо батьківських прав")
    for r in R.get("ERDR", []):
        add(r.get("register_entry_datetime"), "ERDR",
            f"Провадження: {r.get('preliminary_legal_qualification')}")
    for r in R.get("DV", []):
        add(r.get("incident_datetime"), "DV", f"Виклик поліції ({r.get('form_of_violence')})")
    for r in R.get("CBI_DISABILITY", []):
        add(r.get("date_established") or r.get("registration_date_cbi"), "CBI_DISABILITY", "Встановлено інвалідність / потреба супроводу")

    ev.sort(key=lambda x: x["date"])
    ev = roles.project_timeline(ev, role, is_own_child=(role == "parent"))
    return {"role": role, "events": ev}


@app.get("/entity/{entity_id}/family")
def family(entity_id: int, role: str = "ssd"):
    """Сімейний граф (household/сиблінги). Крос-sibling резолюція — лише ССД-рівень."""
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, "Не знайдено")
    if role not in roles.ROLES:
        raise HTTPException(400, f"Невідома роль: {role}")
    if role != "ssd":
        return {"role": role, "available": False,
                "note": "Сімейний граф (крос-реєстрове зведення сиблінгів) доступний лише на рівні ССД"}
    h = e.get("household", {})
    members = []
    for sid in [entity_id] + h.get("sibling_entity_ids", []):
        se = entities().get(sid)
        if not se:
            continue
        m_marks = sorted(familygraph._observable_marks(se))
        members.append({"entity_id": sid, "pib": se["pib"], "birth_date": se["birth_date"],
                        "is_index": sid == entity_id, "n_registries": se["n_registries"],
                        "risk_marks": m_marks, "in_care": "in_care" in m_marks})
    # ── батьки (спостережувано: ДРАЦС присутність/смерть, ЄДРСР права, ПФУ безробіття + push-булеани) ──
    R = e["rows_by_reg"]
    dracs = R.get("DRACS", [])

    def _has(v):
        return v and str(v) not in ("None", "")
    father_present = any(_has(r.get("father_rnokpp")) for r in dracs)
    mother_present = any(_has(r.get("mother_rnokpp")) for r in dracs)
    parent_death = any(r.get("act_type") == "смерть" for r in dracs)
    rights_deprived = any("батьк" in str(r.get("case_category", "")) for r in R.get("EDRSR", []))
    # acuity W6: смерть → death; позбавлення прав без смерті → deprivation
    w6_cause = "death" if parent_death else ("deprivation" if rights_deprived else None)
    parents = {
        "structure": ("Одинока мати / один з батьків" if (mother_present and not father_present)
                      else "Обоє батьків" if (mother_present and father_present) else "—"),
        "single_parent": mother_present and not father_present,
        "both_parents": mother_present and father_present,
        "mother_present": mother_present,
        "father_present": father_present,
        "parent_death": parent_death,
        "w6_cause": w6_cause,
        "rights_deprived": rights_deprived,
        "deprivation_scope": ("повне" if rights_deprived and not parent_death else None),
        "parent_unemployed": any(r.get("employment_status_indicator") == "безробітний" for r in R.get("PFU", [])),
        "parent_incarcerated": bool(e.get("parent_incarcerated")),
        "parent_criminal": bool(e.get("parent_criminal")),
        "parent_addiction": bool(e.get("parent_addiction")),
        "parent_mental_health": bool(e.get("parent_mental_health")),
    }
    # ── батьківсько-осьові контрибуції (dimension=parental; ВСІ нижче за дитячі тяжкості) ──
    sib_marks = set(e.get("sibling_prior_violation") or [])
    triggers = {
        "P_sibling_in_care": e.get("sibling_in_care"),
        "P_sibling_violation": bool(sib_marks),
        "P_parent_rights": rights_deprived and not parent_death,
        "P_parent_criminal": e.get("parent_criminal") or e.get("parent_incarcerated"),
        "P_parent_addiction": e.get("parent_addiction"),
        "P_parent_mh": e.get("parent_mental_health"),
    }
    evidence_map = {"P_sibling_in_care": ["DITY"], "P_sibling_violation": sorted(sib_marks) or ["DITY"],
                    "P_parent_rights": ["EDRSR"], "P_parent_criminal": ["push"],
                    "P_parent_addiction": ["push"], "P_parent_mh": ["push"]}
    parental_contributions = []
    for code, on in triggers.items():
        if not on:
            continue
        spec = _PARENTAL_SPEC[code]
        parental_contributions.append({
            "code": code, "dimension": "parental", "severity": spec["severity"],
            "value": round(spec["severity"] * 0.6, 3),   # 1 джерело доказу (evidence=0.6), acuity=active
            "evidence": evidence_map[code], "observability": spec["observability"],
            "wall": spec["wall"], "safeguard": spec["safeguard"]})
    # ── walled-алерти: сірі плитки БЕЗ джерела/причини/дати (лише present) ──
    walled_alerts = [
        {"topic": "addiction", "present": bool(e.get("parent_addiction"))},
        {"topic": "mental_health", "present": bool(e.get("parent_mental_health"))},
        {"topic": "criminal", "present": bool(e.get("parent_criminal") or e.get("parent_incarcerated"))},
    ]
    return {"role": role, "available": True, "entity_id": entity_id,
            "household": {
                "household_id": h.get("household_id"), "size": h.get("size", 1),
                "n_siblings": e.get("n_siblings", 0), "churn_count": e.get("household_churn", 0),
                "risk_density": e.get("household_risk_density", 0.0),
                "density_breakdown": e.get("density_breakdown", {}),
                "escalated": float(e.get("household_risk_density", 0.0) or 0.0) >= 0.5},
            "members": members, "parents": parents,
            "relatives": {"kinship_care": bool(e.get("kinship_care")),
                          "kin_caregiver_relation": e.get("kin_caregiver_relation"),
                          "protective": True},
            "signals": {
                "sibling_in_care": e.get("sibling_in_care"),
                "sibling_prior_violation": sorted(sib_marks),
                "new_cohabitant_recent": bool(e.get("new_cohabitant_recent")),
                "kinship_care": e.get("kinship_care"),
                "single_parent_unemployed": e.get("single_parent_unemployed"),
                "household_churn": e.get("household_churn"),
                "parent_incarcerated": e.get("parent_incarcerated"),
                "household_risk_density": e.get("household_risk_density"),
            },
            "parental_contributions": parental_contributions,
            "walled_alerts": walled_alerts,
            "safeguards": {
                "poverty_not_risk": "бідність / безробіття / одинока мати — контекст, ніколи не самостійний флаг",
                "missing_is_unknown": "немає даних = невідомо, не штраф",
                "parental_capped_below_child": "усі батьківські тяжкості ≤0.55 — нижче за дитячі (0.60–1.00)",
                "toxic_trio_not_auto": "комбінації не маркуються як авто-високий ризик (контекст, не бал)",
                "walls": "ЄРДР (КПК ст.222) і ЕСОЗ (медтаємниця) ніколи не pull-яться; лише факт через push/consent",
                "human_in_the_loop": "рішення ухвалює Комісія з питань захисту прав дитини; Ластівка — підтримка",
            }}


@app.get("/entity/{entity_id}/attendance")
def attendance(entity_id: int):
    e = entities().get(entity_id)
    if not e:
        raise HTTPException(404, "Не знайдено")
    aikom = sorted(e["rows_by_reg"].get("AIKOM", []), key=lambda x: x.get("attendance_period", ""))
    if not aikom:
        return {"points": [], "changePointIndex": None}
    points = [{"period": r.get("attendance_period"),
               "absences": int(float(r.get("missed_lessons_count") or 0)),
               "gpa": float(r.get("score_12") or 0)} for r in aikom]
    cp_idx, _, cp_dir = detection.change_point([p["absences"] for p in points])
    return {"points": points, "changePointIndex": cp_idx if cp_dir > 0 else None}
