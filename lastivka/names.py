"""Українські імена/прізвища/по батькові для синтетичних дітей та батьків."""
from __future__ import annotations

MALE_FIRST = [
    "Олександр", "Андрій", "Дмитро", "Максим", "Артем", "Іван", "Назар",
    "Богдан", "Володимир", "Денис", "Євген", "Кирило", "Михайло", "Олег",
    "Павло", "Роман", "Сергій", "Тарас", "Юрій", "Ярослав", "Віктор", "Тимофій",
]
FEMALE_FIRST = [
    "Анастасія", "Софія", "Марія", "Юлія", "Дарія", "Вікторія", "Аліна",
    "Катерина", "Олена", "Ірина", "Наталія", "Оксана", "Тетяна", "Христина",
    "Поліна", "Злата", "Єва", "Соломія", "Мирослава", "Вероніка", "Уляна", "Діана",
]
SURNAME_BASE = [
    "Шевченк", "Коваленк", "Бондаренк", "Ткаченк", "Кравченк", "Мельник",
    "Шевчук", "Поліщук", "Бойк", "Ткачук", "Савченк", "Руденк", "Лисенк",
    "Марченк", "Петренк", "Григоренк", "Захарченк", "Іваненк", "Мороз", "Гончар",
]
MALE_PATRONYMIC_BASE = [
    "Олександр", "Андрій", "Іван", "Сергій", "Володимир", "Михайл", "Петр",
    "Василь", "Юрій", "Дмитр", "Богдан", "Олег", "Роман", "Тарас",
]


def _surname(base: str, gender: str) -> str:
    if base.endswith("к"):  # ...енк -> о / а
        return base + ("о" if gender == "MALE" else "о")  # обидві форми -енко
    if base in ("Мороз", "Гончар"):
        return base
    if base.endswith("ук") or base.endswith("чук"):
        return base
    return base


def gen_surname(gender: str, rng) -> str:
    base = rng.choice(SURNAME_BASE)
    return _surname(base, gender)


def gen_patronymic(gender: str, rng) -> str:
    base = rng.choice(MALE_PATRONYMIC_BASE)
    if base.endswith("й"):
        stem = base[:-1]
        return stem + ("йович" if gender == "MALE" else "ївна")
    if base.endswith("ь"):
        stem = base[:-1]
        return stem + ("ьович" if gender == "MALE" else "івна")
    return base + ("ович" if gender == "MALE" else "івна")


def gen_first(gender: str, rng) -> str:
    return rng.choice(MALE_FIRST if gender == "MALE" else FEMALE_FIRST)


# ---- легкий шум у ПІБ (опечатки/варіанти) для реалістичного fuzzy-матчингу ----
_TYPO_MAP = {"и": "і", "і": "и", "е": "є", "г": "ґ", "ї": "і"}


def corrupt_name(name: str, rng, p: float = 0.5) -> str:
    """З імовірністю p вносить один реалістичний шум у написання."""
    if rng.random() > p or len(name) < 3:
        return name
    mode = rng.random()
    chars = list(name)
    if mode < 0.4:  # заміна літери на схожу
        idxs = [i for i, c in enumerate(chars) if c.lower() in _TYPO_MAP]
        if idxs:
            i = rng.choice(idxs)
            repl = _TYPO_MAP[chars[i].lower()]
            chars[i] = repl.upper() if chars[i].isupper() else repl
    elif mode < 0.7 and len(chars) > 4:  # пропуск літери
        del chars[rng.randint(1, len(chars) - 2)]
    elif len(chars) > 4:  # перестановка сусідніх
        i = rng.randint(1, len(chars) - 2)
        chars[i], chars[i + 1] = chars[i + 1], chars[i]
    return "".join(chars)
