"""
Модуль 1а — Entity: генерація популяції дітей (god-view).
Кожна дитина має реальні ідентифікатори (УНЗР/РНОКПП з валідними чексумами),
ПІБ, дату народження, регіон та латентні атрибути (інвалідність, хронік тощо).
Траєкторія (прихований стан у часі) додається модулем trajectory.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date
import random

from . import identifiers as ids
from . import names

_OBLAST_CENTER = {
    "Київська": "м. Київ", "Харківська": "м. Харків", "Львівська": "м. Львів",
    "Дніпропетровська": "м. Дніпро", "Одеська": "м. Одеса", "Запорізька": "м. Запоріжжя",
    "Донецька": "м. Краматорськ", "Полтавська": "м. Полтава", "Вінницька": "м. Вінниця",
    "Чернігівська": "м. Чернігів",
}


@dataclass
class Child:
    internal_id: int
    last_name: str
    first_name: str
    second_name: str
    gender: str          # MALE / FEMALE
    birth_date: date
    oblast: str
    settlement: str
    unzr: str            # API-форма (13)
    unzr_human: str      # YYYYMMDD-XXXXX
    rnokpp: str | None   # None якщо no_tax_id
    has_disability: bool
    has_chronic: bool
    parental_risk: bool          # залежність/психіатрія/кримінал у батьків
    family_base: str             # intact / single_parent
    # заповнюється trajectory:
    states: list = field(default_factory=list)     # list[MonthState]
    shocks: list = field(default_factory=list)      # list[Shock]
    labels: dict = field(default_factory=dict)      # violation_id -> onset_month

    @property
    def pib(self) -> str:
        return f"{self.last_name} {self.first_name} {self.second_name}"

    def age_at(self, sim_start: date, month: int) -> int:
        y = sim_start.year + (sim_start.month - 1 + month) // 12
        m = (sim_start.month - 1 + month) % 12 + 1
        a = y - self.birth_date.year - ((m, 1) < (self.birth_date.month, self.birth_date.day))
        return a


def _random_birth_date(min_age: int, max_age: int, sim_start: date, rng: random.Random) -> date:
    age = rng.randint(min_age, max_age)
    year = sim_start.year - age
    month = rng.randint(1, 12)
    day = rng.randint(1, 28)
    return date(year, month, day)


def generate_population(cfg: dict, rng: random.Random) -> list[Child]:
    pop_cfg = cfg["population"]
    sim_start = date(pop_cfg["start_year"], 1, 1)
    n = pop_cfg["n_children"]
    oblasts = cfg["oblasts"]
    no_rnokpp = cfg["noise"]["no_rnokpp_rate"]

    children: list[Child] = []
    for i in range(n):
        gender = "MALE" if rng.random() < 0.512 else "FEMALE"
        bd = _random_birth_date(pop_cfg["min_age"], pop_cfg["max_age"], sim_start, rng)
        unzr_api, unzr_human = ids.gen_unzr(bd, rng)
        rnokpp = None if rng.random() < no_rnokpp else ids.gen_rnokpp(bd, gender, rng)
        oblast = rng.choice(oblasts)
        children.append(Child(
            internal_id=i,
            last_name=names.gen_surname(gender, rng),
            first_name=names.gen_first(gender, rng),
            second_name=names.gen_patronymic(gender, rng),
            gender=gender,
            birth_date=bd,
            oblast=oblast,
            settlement=_OBLAST_CENTER.get(oblast, "м. ?"),
            unzr=unzr_api,
            unzr_human=unzr_human,
            rnokpp=rnokpp,
            has_disability=rng.random() < 0.06,
            has_chronic=rng.random() < 0.10,
            parental_risk=rng.random() < 0.08,
            family_base="single_parent" if rng.random() < 0.18 else "intact",
        ))
    return children
