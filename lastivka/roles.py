"""
Модуль 8 — Рольовий доступ. Проєкція реєстрів/подій за роллю користувача
згідно з ВИПРАВЛЕНОЮ матрицею docs/ROLE_ACCESS_MATRIX.md (звірена рев'ю).

Принципи (сегрегація):
- лікар ≠ суд; школа ≠ медичне-зміст; поліція = кримінал/ДН; батьки = своя дитина.
- крос-реєстрове виявлення — лише ССД-рівень (єдина роль з інтегрованим доступом).
- WALLED (ЕСОЗ/ЄРДР/TERVIS) НЕ віддаються навіть як сигнал/зміст (КПК ст.222, медтаємниця).
- правило «батько-кривдник»: батьки ✋ (не 🏠) на кейс/кримінал/ДН/СКАЙД/лінії.
- EE — лише крос-кордонний PPRL-сигнал (🌐), не доступ до реєстру.
"""
from __future__ import annotations

from .emitters import WALLED

ROLES = ("ssd", "doctor", "school", "police", "justice", "pfu", "parent", "analyst", "public")

ROLE_UA = {
    "ssd": "Фахівець ССД", "doctor": "Лікар (МОЗ)", "school": "Школа (МОН)",
    "police": "Поліція (МВС)", "justice": "Мінʼюст", "pfu": "ПФУ",
    "parent": "Батьки", "analyst": "Наглядач/Аналітик", "public": "Публіка",
}

# Позначки: full ✅ | signal 🔆 | signal_off 🔆※ (de lege ferenda, OFF=немає) |
#           public 🌐 | own 🏠 | xborder 🌐(EE PPRL) | none ✋. Аналітик — agg 📊 (не per-record).
# Кодуємо лише НЕ-"none" клітинки; решта — "none". Звірено з ROLE_ACCESS_MATRIX.md §1.
_M: dict[str, dict[str, str]] = {
    # Поліція (ювенальна превенція) = НАДМНОЖИНА ССД + вищий допуск (ЄРДР/SKAID кримінал).
    # Той самий інтегрований профіль, що ССД, плюс walled-кримінал; медицина лишається signal-only.
    "DRACS":          {"ssd": "full", "police": "full", "justice": "full", "parent": "own"},
    "EDDR":           {"ssd": "full", "police": "full", "justice": "full", "pfu": "signal", "parent": "own"},
    "EHEALTH":        {"ssd": "signal_off", "police": "signal_off", "doctor": "full", "parent": "own"},
    "EDEBO":          {"ssd": "full", "police": "full", "school": "full", "parent": "own", "public": "public"},
    "AIKOM":          {"ssd": "full", "police": "full", "school": "full", "parent": "own"},
    "VPO":            {"ssd": "full", "police": "full", "parent": "own"},
    "CHILDWAR":       {"ssd": "full", "police": "full", "parent": "own"},
    "DITY":           {"ssd": "full", "police": "full"},     # батьки/Мінʼюст — ✋; поліція — вищий допуск
    "ERDR":           {"police": "full"},                    # ССД/Мінʼюст — ✋ (WALLED, КПК ст.222)
    "EDRSR":          {"ssd": "full", "doctor": "public", "school": "public", "police": "full",
                       "justice": "full", "pfu": "public", "parent": "public", "public": "public"},
    "DV":             {"ssd": "full", "doctor": "full", "school": "full", "police": "full"},
    "CBI_DISABILITY": {"ssd": "full", "police": "full", "doctor": "full", "school": "full", "pfu": "signal", "parent": "own"},
    "EISSS":          {"ssd": "full", "police": "full", "pfu": "full", "parent": "own"},
    "SKAID":          {"police": "full"},                    # ССД — ✋ ([звірка] акта)
    "DRRP":           {"ssd": "full", "police": "full", "justice": "full", "parent": "own", "public": "public"},
    "PFU":            {"ssd": "signal", "police": "signal", "pfu": "full", "parent": "own"},
    "HOTLINE":        {"ssd": "full", "police": "signal"},   # ССД — інтейк/feed; поліція — push-сигнал
    # ── EE (крос-кордон): лише PPRL-сигнал збігу для ССД, ніколи доступ ──
    "RAHV":           {"ssd": "xborder"},
    "EHIS_EE":        {"ssd": "xborder"},
    "SKAIS":          {"ssd": "xborder"},
    "TERVIS":         {},                                    # art.9 — ✋ рутинно (лише невідкладно через лікаря/SKA)
}

# Реєстри, до яких застосовне правило «батько-кривдник» (батьки ✋, не 🏠).
PERPETRATOR_SUPPRESSED = {"DITY", "ERDR", "DV", "SKAID", "HOTLINE"}

# WALLED блокує КРОС-вертикальний доступ до змісту (медтаємниця/таємниця слідства),
# але НЕ власну вертикаль реєстру і НЕ представника-пацієнта (батьки → своя дитина).
WALLED_OWNER = {"EHEALTH": "doctor", "ERDR": "police", "TERVIS": None}

_CONTENT_MARKS = {"full", "public", "own"}
# signal_off (ЕСОЗ для ССД) — de lege ferenda OFF: сьогодні НЕ дає навіть сигналу.
_SIGNAL_MARKS = {"signal", "xborder"}


def mark(role: str, registry: str) -> str:
    """Позначка доступу (role, registry) за матрицею. Аналітик — лише агрегат."""
    if role == "analyst":
        return "agg"
    if role == "public":
        return _M.get(registry, {}).get("public", "none")
    return _M.get(registry, {}).get(role, "none")


def can_read_content(role: str, registry: str, is_own_child: bool = False) -> bool:
    """
    Чи бачить роль ЗМІСТ записів реєстру.
    WALLED: зміст — лише власній вертикалі (лікар→ЕСОЗ, поліція→ЄРДР) або
    представнику-пацієнту (батьки→своя дитина); крос-вертикально — ніколи.
    """
    # правило «батько-кривдник» — load-bearing guard (не покладаємось на пропуск у _M)
    if role == "parent" and registry in PERPETRATOR_SUPPRESSED:
        return False
    m = mark(role, registry)
    if registry in WALLED:
        if WALLED_OWNER.get(registry) == role and m == "full":
            return True
        if m == "own" and is_own_child:          # представник-пацієнт (медкарта своєї дитини)
            return True
        return False
    if m in ("full", "public"):
        return True
    if m == "own":
        return bool(is_own_child)
    return False


def is_signal_only(role: str, registry: str) -> bool:
    """Чи доступний реєстр лише як сигнал «є/нема» (не зміст) для цієї ролі."""
    if role == "parent" and registry in PERPETRATOR_SUPPRESSED:
        return False
    if can_read_content(role, registry, is_own_child=True):
        return False                              # власник/представник читає зміст, не сигнал
    m = mark(role, registry)
    if m == "signal_off":                         # ЕСОЗ для ССД: OFF сьогодні → жодного сигналу
        return False
    return m in _SIGNAL_MARKS                      # analyst(agg)/none/WALLED-чужому → False (стіна)


def visible_registries(role: str, is_own_child: bool = False) -> set[str]:
    """Реєстри, ЗМІСТ яких роль може читати (для фільтра rows_by_reg/таймлайну)."""
    return {reg for reg in _M if can_read_content(role, reg, is_own_child)}


def signal_registries(role: str) -> set[str]:
    """Реєстри, доступні ролі лише як сигнал/закритий-зміст."""
    return {reg for reg in set(_M) | WALLED if is_signal_only(role, reg)}


def split_walled(codes, role: str = "ssd"):
    """
    Розділяє перелік реєстрів/доказів на видимі та ЗАХИЩЕНІ (walled, не для цієї ролі).
    ССД не бачить навіть ПРИСУТНОСТІ ЕСОЗ/ЄРДР (КПК ст.222 / медтаємниця) — у черзі/доказах
    walled-коди редагуються до лічильника «захищених джерел».
    """
    kept, protected = [], []
    for c in codes or []:
        if c in WALLED and WALLED_OWNER.get(c) != role:
            protected.append(c)
        else:
            kept.append(c)
    return kept, protected


def project_records(rows_by_reg: dict, role: str, is_own_child: bool = False) -> dict:
    """
    Проєкція rows_by_reg за роллю:
    - повний зміст — лише дозволені реєстри;
    - сигнальні/WALLED — редагований маркер {present: bool, signal_only: True, redacted: True};
    - решта — відсутні.
    """
    out = {}
    for reg, rows in rows_by_reg.items():
        if can_read_content(role, reg, is_own_child):
            out[reg] = rows
        elif is_signal_only(role, reg):
            out[reg] = {"present": bool(rows), "signal_only": True, "redacted": True,
                        "note": "зміст закрито" if reg in WALLED else "лише сигнал «є/нема»"}
    return out


def project_timeline(events: list[dict], role: str, is_own_child: bool = False) -> list[dict]:
    """
    Проєкція таймлайну за роллю: подія входить, лише якщо роль бачить зміст реєстру.
    Сигнальні/WALLED-реєстри → подія редагується до маркера без деталей.
    """
    vis = visible_registries(role, is_own_child)
    sig = signal_registries(role)
    out = []
    for ev in events:
        reg = ev.get("registry")
        if reg in vis:
            out.append(ev)
        elif reg in sig:
            out.append({"date": ev.get("date"), "registry": reg,
                        "label": "Сигнал: подія в реєстрі (зміст закрито за роллю)",
                        "level1": True, "redacted": True})
    return out
