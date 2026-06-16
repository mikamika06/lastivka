#!/usr/bin/env python3
"""Згенерувати синтетичні реєстри-силоси (Модулі 1–2)."""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lastivka import simulate  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--n-children", type=int, default=None)
    ap.add_argument("-c", "--config", default="config/config.yaml")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    res = simulate.run(args.config, n_override=args.n_children, seed_override=args.seed)
    print(f"✓ Згенеровано {res['n_children']} дітей, флагнутих {res['n_flagged']} "
          f"({res['n_flagged']/res['n_children']:.0%})")
    print("Реєстри-силоси (out/registries/*.db):")
    for code, n in res["registry_rows"].items():
        print(f"   {code:10s} {n:>8} записів")


if __name__ == "__main__":
    main()
