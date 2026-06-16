"""
Генерація державних ідентифікаторів зі справжніми форматами й чексумами.

РНОКПП (ІПН): 10 цифр — перші 5 = днів від 1899-12-31 (дата народження),
              9-та = стать (непарна=чол, парна=жін), 10-та = контрольна.
УНЗР:         13 символів (API-форма без дефіса) — перші 8 = дата YYYYMMDD + 5 цифр.
              Людська/паспортна форма: YYYYMMDD-XXXXX.
isikukood:    11 цифр GYYMMDDSSSC (естонський — для фази 2).

Алгоритм чексуми РНОКПП перевірено на реальних tax_id: 3999869394->4, 2659719350->0.
"""
from __future__ import annotations
from datetime import date

_RNOKPP_BASE = date(1899, 12, 31)
_RNOKPP_WEIGHTS = [-1, 5, 7, 9, 4, 6, 10, 5, 7]


def rnokpp_checksum(first9: str) -> int:
    s = sum(int(d) * w for d, w in zip(first9, _RNOKPP_WEIGHTS))
    return (s % 11) % 10


def gen_rnokpp(birth_date: date, gender: str, rng) -> str:
    days = (birth_date - _RNOKPP_BASE).days
    first5 = f"{days:05d}"[-5:]
    d6, d7, d8 = rng.randint(0, 9), rng.randint(0, 9), rng.randint(0, 9)
    d9 = rng.randint(0, 9)
    # 9-та цифра кодує стать: непарна — чоловік, парна — жінка
    if gender == "MALE" and d9 % 2 == 0:
        d9 = (d9 + 1) % 10
    if gender == "FEMALE" and d9 % 2 == 1:
        d9 = (d9 + 1) % 10
    first9 = f"{first5}{d6}{d7}{d8}{d9}"
    return f"{first9}{rnokpp_checksum(first9)}"


def validate_rnokpp(value: str) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 10
        and value.isdigit()
        and rnokpp_checksum(value[:9]) == int(value[9])
    )


def gen_unzr(birth_date: date, rng) -> tuple[str, str]:
    """Повертає (api_form_13, human_form_dashed)."""
    datepart = birth_date.strftime("%Y%m%d")
    serial = f"{rng.randint(0, 9999):04d}"
    body = datepart + serial
    check = sum(int(c) for c in body) % 10  # апроксимація контрольної (точний алг. не публічний)
    return f"{body}{check}", f"{datepart}-{serial}{check}"


_ISI_W1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
_ISI_W2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3]


def isikukood_checksum(first10: str) -> int:
    s1 = sum(int(d) * w for d, w in zip(first10, _ISI_W1)) % 11
    if s1 < 10:
        return s1
    s2 = sum(int(d) * w for d, w in zip(first10, _ISI_W2)) % 11
    return s2 if s2 < 10 else 0


def gen_isikukood(birth_date: date, gender: str, rng) -> str:
    y = birth_date.year
    base = 1 if y < 1900 else 3 if y < 2000 else 5
    g = base + (0 if gender == "MALE" else 1)
    first10 = f"{g}{y % 100:02d}{birth_date.month:02d}{birth_date.day:02d}{rng.randint(0, 999):03d}"
    return f"{first10}{isikukood_checksum(first10)}"


def validate_isikukood(value: str) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 11
        and value.isdigit()
        and isikukood_checksum(value[:10]) == int(value[10])
    )
