"""
Офіційна транслітерація українського кирилічного письма латиницею.
Постанова КМУ №55 від 27.01.2010. Плюс генерація АЛЬТЕРНАТИВНИХ написань
(те, як те саме імʼя пишуть в естонських/польських/міжнародних базах) —
це джерело крос-кордонних колізій для fuzzy-матчингу (фаза 2).
"""
from __future__ import annotations

# Прості (позиційно-незалежні) відповідності
_SIMPLE = {
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e",
    "ж": "zh", "з": "z", "и": "y", "і": "i", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
}
# Позиційні: (на початку слова, всередині/в кінці)
_POSITIONAL = {
    "є": ("ye", "ie"), "ї": ("yi", "i"), "й": ("y", "i"),
    "ю": ("yu", "iu"), "я": ("ya", "ia"),
}


def translit_word(word: str) -> str:
    """Офіційна транслітерація одного слова за КМУ №55."""
    return translit_official(word)


# Символи, які пропускаються при транслітерації
_SKIPPED = ("ь", "'", "’")
# Внутрішній маркер для буквосполучення "зг"
_ZGH_MARKER = "\x00"


def _translit_char(ch: str, is_first: bool) -> str:
    """Транслітерація одного символа з урахуванням позиції у слові."""
    if ch in _POSITIONAL:
        return _POSITIONAL[ch][0 if is_first else 1]
    if ch in _SIMPLE:
        return _SIMPLE[ch]
    return ch


def _translit_single_word(word: str) -> str:
    """Транслітерація одного слова з капіталізацією першої літери."""
    w = word.lower().replace("зг", _ZGH_MARKER)
    out = []
    for i, ch in enumerate(w):
        if ch in _SKIPPED:
            continue
        if ch == _ZGH_MARKER:
            out.append("zgh")
            continue
        out.append(_translit_char(ch, i == 0))
    s = "".join(out)
    return s[:1].upper() + s[1:]


def translit_official(text: str) -> str:
    """Транслітерація ПІБ (кілька слів)."""
    return " ".join(_translit_single_word(word) for word in text.split())


# Поширені альтернативні написання популярних імен у інших країнах
_ALT = {
    "Олександр": ["Oleksandr", "Alexander", "Aleksander", "Olexandr"],
    "Юлія": ["Yuliia", "Yulia", "Julia", "Julija"],
    "Євген": ["Yevhen", "Eugen", "Evgen", "Yevgen"],
    "Андрій": ["Andrii", "Andriy", "Andrey", "Andrei"],
    "Дмитро": ["Dmytro", "Dmitro", "Dmitriy"],
    "Анастасія": ["Anastasiia", "Anastasia", "Nastia"],
    "Софія": ["Sofiia", "Sofia", "Sophia"],
    "Артем": ["Artem", "Artyom"],
    "Марія": ["Mariia", "Maria", "Marya"],
    "Іван": ["Ivan"],
}


def alt_spellings(first_name_uk: str, rng) -> str:
    """Імовірне 'іноземне' написання імені для крос-кордонної бази (фаза 2)."""
    if first_name_uk in _ALT:
        return rng.choice(_ALT[first_name_uk])
    return translit_official(first_name_uk)
