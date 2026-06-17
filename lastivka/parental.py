"""
Модуль 5b — батьківські / сімейні фактори ризику (фаза 5).

Ризик дитини залежить не лише від її власних сигналів, а й від СУТІ
батьківських обставин (SUBSTANCE_FEATURES §1–4,8): кримінал, домашнє
насильство з боку опікуна, втрата/позбавлення батьків, обрив доходу.

Деривація читає РЕКОНСТРУЙОВАНІ рядки реєстрів (entity["rows_by_reg"]) —
тобто чесно з тих самих даних, що й решта детекції. Зважуємо суть:
  value = base × evidence_strength × recency_decay × relationship (× role)

Запобіжники:
  • бідність сама по собі — не ризик: економічний фактор лише на ПОДІЇ
    припинення допомоги (benefit_termination_flag), не на статусі;
  • психіка/залежність батьків клінічно недоступні (мед.таємниця) — у
    бекенді чесно НЕ фабрикуємо (frontend-демо ілюструє їх окремо);
  • сиблінг-агрегація потребує household-зв'язування (план, етап 4).

Дзеркало frontend: frontend/src/lib/parental.ts + config/scoring.yaml (parental).
"""
from __future__ import annotations
from datetime import date

_DEFAULT = {
    "base": {
        "crime_violent": 0.85, "crime_other": 0.50, "dv_abuser": 0.80,
        "deprivation": 0.75, "bereavement": 0.70, "addiction": 0.55,
        "mental_health": 0.50, "economic_shock": 0.45, "sibling_harm": 0.65,
    },
    "evidence": {"adjudicated": 1.3, "substantiated": 1.0, "alleged": 0.6, "unknown": 0.5},
    "relationship": {"biological": 1.0, "stepparent": 1.2, "other": 0.7},
    "recency_halflife": 18,
}


def _cfg(w: dict) -> dict:
    """Зливає ваги з scoring.yaml["parental"] з дефолтами."""
    p = w or {}
    return {
        "base": {**_DEFAULT["base"], **p.get("base", {})},
        "evidence": {**_DEFAULT["evidence"], **p.get("evidence", {})},
        "relationship": {**_DEFAULT["relationship"], **p.get("relationship", {})},
        "recency_halflife": p.get("recency_halflife", _DEFAULT["recency_halflife"]),
    }


def _sim_end(cfg: dict) -> date:
    pop = cfg["population"]
    months = pop["months"] - 1
    y = pop["start_year"] + months // 12
    m = months % 12 + 1
    return date(y, m, 1)


def _months_since(value, end: date) -> int:
    try:
        d = date.fromisoformat(str(value)[:10])
        return max(0, (end.year - d.year) * 12 + (end.month - d.month))
    except (ValueError, TypeError):
        return 12


def _recency_decay(months: int, halflife: float) -> float:
    return max(0.3, 0.5 ** (max(0, months) / halflife))


def _acuity(months: int) -> str:
    if months <= 4:
        return "acute"
    if months <= 12:
        return "active"
    if months <= 24:
        return "chronic"
    return "improving"


def _factor(kind, evidence, strength, months, p, relationship=None, role=None) -> dict:
    base = p["base"].get(kind, 0.5)
    val = base * p["evidence"].get(strength, 1.0) * _recency_decay(months, p["recency_halflife"])
    if relationship:
        val *= p["relationship"].get(relationship, 1.0)
    if role == "victim":
        val *= 1.1
    c = {
        "violation": f"PAR_{kind}", "value": round(val, 3), "severity": base,
        "evidence": evidence, "acuity": _acuity(months), "dimension": "parental",
        "evidence_strength": strength, "recency_months": months,
    }
    if relationship:
        c["relationship"] = relationship
    if role:
        c["role"] = role
    return c


def derive_parental(entity: dict, cfg: dict, w: dict) -> list[dict]:
    """Батьківські/сімейні внески ризику з рядків реєстрів дитини."""
    p = _cfg(w)
    R = entity.get("rows_by_reg", {})
    end = _sim_end(cfg)
    has = lambda code: bool(R.get(code))  # noqa: E731
    out: list[dict] = []

    # ── Домашнє насильство, кривдник — опікун (дитина жертва/свідок) ──
    dv = R.get("DV", [])
    if dv and any(str(d.get("parents_are_abusers_flag")) == "так" for d in dv):
        if has("EDRSR"):
            strength = "adjudicated"
        elif has("ERDR"):
            strength = "alleged"
        else:
            strength = "substantiated"
        physical = any(d.get("form_of_violence") == "фізичне" for d in dv)
        months = min(_months_since(d.get("incident_datetime"), end) for d in dv)
        evidence = ["DV"] + (["ERDR"] if has("ERDR") else []) + (["EDRSR"] if has("EDRSR") else [])
        out.append(_factor("dv_abuser", evidence, strength, months, p,
                           relationship="biological", role="victim" if physical else "witness"))

    # ── Кримінал батьків (провадження / вирок) ──
    er = R.get("ERDR", [])
    if er:
        adjud = has("EDRSR")
        months = min(_months_since(d.get("datetime_of_offence") or d.get("register_entry_datetime"), end) for d in er)
        out.append(_factor("crime_violent", ["ERDR"] + (["EDRSR"] if adjud else []),
                           "adjudicated" if adjud else "alleged", months, p, relationship="biological"))

    # ── Втрата одного з батьків (акт про смерть) ──
    death = [d for d in R.get("DRACS", []) if d.get("act_type") == "смерть"]
    if death:
        months = min(_months_since(d.get("registration_date") or d.get("reg_date"), end) for d in death)
        out.append(_factor("bereavement", ["DRACS"], "adjudicated", months, p))

    # ── Позбавлення батьківських прав ──
    dep = [d for d in R.get("EDRSR", []) if "позбавлення" in str(d.get("case_category", ""))]
    if dep:
        months = min(_months_since(d.get("decision_date") or d.get("adjudication_date"), end) for d in dep)
        out.append(_factor("deprivation", ["EDRSR"], "adjudicated", months, p))

    # ── Економічний шок: ЛИШЕ подія припинення/санкції допомоги (не статус бідності) ──
    term = [d for d in R.get("EISSS", []) if str(d.get("benefit_termination_flag")) == "так"]
    if term:
        months = min(_months_since(d.get("application_registration_date"), end) for d in term)
        out.append(_factor("economic_shock", ["EISSS"] + (["PFU"] if has("PFU") else []),
                           "substantiated", months, p))

    return out
