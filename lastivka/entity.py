"""
Модуль 1а — Entity: дитина (god-view) з ідентифікаторами, демографією та
латентними КОНТЕКСТ-факторами. Семплування й призначення ризиків — у realmodel.py.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
import random

from . import identifiers as ids
from . import names

OBLAST_CENTER = {
    "Київська": "м. Київ", "Харківська": "м. Харків", "Львівська": "м. Львів",
    "Дніпропетровська": "м. Дніпро", "Одеська": "м. Одеса", "Запорізька": "м. Запоріжжя",
    "Донецька": "м. Краматорськ", "Полтавська": "м. Полтава", "Вінницька": "м. Вінниця",
    "Чернігівська": "м. Чернігів", "Закарпатська": "м. Ужгород", "Івано-Франківська": "м. Івано-Франківськ",
    "Хмельницька": "м. Хмельницький", "Чернівецька": "м. Чернівці", "Волинська": "м. Луцьк",
    "Рівненська": "м. Рівне", "Тернопільська": "м. Тернопіль", "Кіровоградська": "м. Кропивницький",
    "Черкаська": "м. Черкаси", "Житомирська": "м. Житомир", "Миколаївська": "м. Миколаїв",
    "Сумська": "м. Суми", "Херсонська": "м. Херсон", "Луганська": "м. Сєвєродонецьк",
}


@dataclass
class Child:
    internal_id: int
    last_name: str
    first_name: str
    second_name: str
    gender: str
    birth_date: date
    oblast: str
    settlement: str
    urban_rural: str
    unzr: str
    unzr_human: str
    rnokpp: str | None
    # латентні контекст-фактори
    geo_tier: str = "rear"
    is_idp: bool = False
    poverty: str = "ok"            # ok | poor | deep
    family_type: str = "intact"    # intact | single_parent | many_children | guardianship | no_parental_care
    par_unemployment: bool = False
    par_addiction: bool = False
    par_disability: bool = False
    has_disability: bool = False
    has_chronic: bool = False
    # батьки (для ДРАЦС/ЕІССС тощо)
    mother_rnokpp: str | None = None
    father_rnokpp: str | None = None
    # сімейний граф / household (пост-прохід realmodel.build_family_graph; інертні дефолти)
    household_id: int | None = None
    sibling_internal_ids: list = field(default_factory=list)
    sibling_in_care: bool = False
    sibling_prior_violation: set = field(default_factory=set)
    new_cohabitant_recent: bool = False
    cohabitant_entry_month: int | None = None
    kinship_care: bool = False
    household_churn: int = 0
    single_parent_unemployed: bool = False
    parent_incarcerated: bool = False           # push/consent-only; ніколи з ЄРДР
    household_risk_density: float = 0.0
    w6_cause: str | None = None                  # death | deprivation
    # заповнюється realmodel:
    states: list = field(default_factory=list)
    shocks: list = field(default_factory=list)
    labels: dict = field(default_factory=dict)

    @property
    def pib(self) -> str:
        return f"{self.last_name} {self.first_name} {self.second_name}"

    def age_at(self, sim_start: date, month: int) -> int:
        y = sim_start.year + (sim_start.month - 1 + month) // 12
        m = (sim_start.month - 1 + month) % 12 + 1
        return y - self.birth_date.year - ((m, 1) < (self.birth_date.month, self.birth_date.day))


_AGE_BAND_RANGE = {"0-2": (0, 2), "3-5": (3, 5), "6-10": (6, 10), "11-14": (11, 14), "15-17": (15, 17)}


def weighted_choice(weights: dict, rng: random.Random):
    items = list(weights.items())
    total = sum(w for _, w in items)
    r = rng.uniform(0, total)
    acc = 0.0
    for k, w in items:
        acc += w
        if r <= acc:
            return k
    return items[-1][0]


def birth_date_from_band(band: str, sim_start: date, rng: random.Random) -> date:
    lo, hi = _AGE_BAND_RANGE[band]
    age = rng.randint(lo, hi)
    year = sim_start.year - age
    return date(year, rng.randint(1, 12), rng.randint(1, 28))


def make_child(i: int, gender: str, birth_date: date, oblast: str, urban_rural: str,
               no_rnokpp_rate: float, rng: random.Random) -> Child:
    unzr_api, unzr_human = ids.gen_unzr(birth_date, rng)
    rnokpp = None if rng.random() < no_rnokpp_rate else ids.gen_rnokpp(birth_date, gender, rng)
    return Child(
        internal_id=i,
        last_name=names.gen_surname(gender, rng),
        first_name=names.gen_first(gender, rng),
        second_name=names.gen_patronymic(gender, rng),
        gender=gender, birth_date=birth_date, oblast=oblast,
        settlement=OBLAST_CENTER.get(oblast, "м. ?"), urban_rural=urban_rural,
        unzr=unzr_api, unzr_human=unzr_human, rnokpp=rnokpp,
        mother_rnokpp=ids.gen_rnokpp(birth_date - timedelta(days=rng.randint(7000, 12000)), "FEMALE", rng),
        father_rnokpp=(None if rng.random() < 0.12 else
                       ids.gen_rnokpp(birth_date - timedelta(days=rng.randint(8000, 14000)), "MALE", rng)),
    )
