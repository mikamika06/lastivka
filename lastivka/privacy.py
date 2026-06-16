"""
Модуль 6 — Privacy-preserving шар.
(A) PPRL: Bloom-filter record linkage (метод Шнелля) — два реєстри матчаться по
    зашифрованих відбитках, не розкриваючи ПІБ/УНЗР. Dice-схожість на бітах.
(B) PSI: hashed-set перетин — кейсворкер дізнається ЛИШЕ «дитина X є в Рівень-1
    реєстрі (ЄРДР/психіатрія)» як булеан, не бачачи самого запису (медтаємниця).

Чистий Python (hmac/sha256) — демонструє механізм без зовнішніх крипто-бібліотек.
У проді — clkhash/anonlink + справжня PSI (OpenMined) / Sharemind.
"""
from __future__ import annotations
import hmac
import hashlib

M_BITS = 2048
K_HASHES = 6


def _qgrams(s: str, q: int = 2) -> list[str]:
    s = f"_{(s or '').lower().strip()}_"
    return [s[i:i + q] for i in range(len(s) - q + 1)]


def _popcount(x: int) -> int:
    return bin(x).count("1")


def bloom_encode(tokens, key: bytes, m: int = M_BITS, k: int = K_HASHES) -> int:
    bits = 0
    for tok in tokens:
        for i in range(k):
            h = hmac.new(key, f"{i}:{tok}".encode(), hashlib.sha256).digest()
            pos = int.from_bytes(h[:4], "big") % m
            bits |= (1 << pos)
    return bits


def clk(last, first, second, birth_date, unzr, key: bytes) -> int:
    """Cryptographic Long-term Key: усі ідентифікатори в один Bloom-фільтр."""
    toks = []
    for part in (last, first, second):
        toks += _qgrams(part or "")
    toks += _qgrams((birth_date or "").replace("-", ""))
    if unzr:
        toks += _qgrams(unzr)
    return bloom_encode(toks, key)


def dice(a: int, b: int) -> float:
    pa, pb = _popcount(a), _popcount(b)
    if pa + pb == 0:
        return 0.0
    return 2 * _popcount(a & b) / (pa + pb)


# ── (B) PSI: приватний перетin по УНЗР через HMAC ──
def psi_tokens(unzrs, key: bytes) -> set[str]:
    """Реєстр публікує лише HMAC(УНЗР) — з них не відновити УНЗР."""
    return {hmac.new(key, str(u).encode(), hashlib.sha256).hexdigest()
            for u in unzrs if u}


def psi_membership(query_unzrs, sensitive_tokens: set[str], key: bytes) -> dict:
    """Кейсворкер дізнається лише, котрі з ЙОГО дітей є у Рівень-1 реєстрі (булеан)."""
    out = {}
    for u in query_unzrs:
        if not u:
            continue
        tok = hmac.new(key, str(u).encode(), hashlib.sha256).hexdigest()
        out[u] = tok in sensitive_tokens
    return out


# ── демонстрація/валідація PPRL: чи відновлює ті самі лінки, що й plaintext ──
def pprl_selfcheck(records_a: list[dict], records_b: list[dict],
                   key: bytes, threshold: float = 0.85) -> dict:
    """records_*: {'last','first','second','birth_date','unzr'(істина для перевірки)}.
    Матчимо A↔B по Bloom-Dice (без plaintext) і звіряємо з істинним УНЗР."""
    enc_b = [(r, clk(r["last"], r["first"], r["second"], r["birth_date"], r.get("unzr"), key))
             for r in records_b]
    tp = fp = fn = 0
    for ra in records_a:
        ca = clk(ra["last"], ra["first"], ra["second"], ra["birth_date"], ra.get("unzr"), key)
        best, best_s = None, 0.0
        for rb, cb in enc_b:
            s = dice(ca, cb)
            if s > best_s:
                best, best_s = rb, s
        matched = best is not None and best_s >= threshold
        true_link = best is not None and ra.get("unzr") and best.get("unzr") == ra["unzr"]
        if matched and true_link:
            tp += 1
        elif matched and not true_link:
            fp += 1
        elif not matched and ra.get("unzr"):
            fn += 1
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    return {"tp": tp, "fp": fp, "fn": fn, "precision": round(prec, 3), "recall": round(rec, 3)}
