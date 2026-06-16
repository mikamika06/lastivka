#!/usr/bin/env python3
"""Прогнати пайплайн: match -> detect -> score -> validate (Модулі 3–8)."""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lastivka import pipeline  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-c", "--config", default="config/config.yaml")
    ap.add_argument("-s", "--scoring", default="config/scoring.yaml")
    ap.add_argument("--no-mlflow", action="store_true")
    args = ap.parse_args()

    res = pipeline.run_pipeline(args.config, args.scoring, log_to_mlflow=not args.no_mlflow)
    m = res["metrics"]
    q = res["queue"]
    print(f"\n── МАТЧИНГ ──")
    mm = m["matching"]
    print(f"   дітей у реєстрах: {mm['true_children']}, сутностей: {mm['entities']}, "
          f"зібрано в 1: {mm['reconstruction_rate']:.1%}")
    print(f"   fuzzy-приєднано без УНЗР: {res['match_stats'].get('fuzzy_attached')}")
    print(f"\n── ДЕТЕКЦІЯ ──")
    o = m["detection"]["overall"]
    print(f"   precision {o['precision']:.2f}  recall {o['recall']:.2f}  F1 {o['f1']:.2f}")
    print(f"\n── PRIVACY (PPRL Bloom-Dice, без plaintext) ──")
    p = m["privacy"]
    print(f"   {p['n_pairs']} пар: precision {p['precision']:.2f}  recall {p['recall']:.2f}")
    print(f"\n── ЧЕРГА ТРІАЖУ ──")
    from collections import Counter
    tiers = Counter(r["tier"] for r in q)
    print(f"   T0 (сьогодні): {tiers.get('T0',0)}  |  T1 (тиждень): {tiers.get('T1',0)}  "
          f"|  T2 (спостереження): {tiers.get('T2',0)}")
    print(f"\n   ТОП-5 найтерміновіших:")
    for r in q[:5]:
        flag = "🔴" if r["tier"] == "T0" else "🟠" if r["tier"] == "T1" else "🟡"
        imm = " [НЕГАЙНО]" if r["immediate"] else ""
        print(f"   {flag} {r['tier']} score={r['score']:.2f}{imm}  {r['pib']} ({r['age']}р) "
              f"— {', '.join(r['violations'])}")


if __name__ == "__main__":
    main()
