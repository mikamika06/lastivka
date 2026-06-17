#!/usr/bin/env python3
"""
Калібрувальний харнес. Читає зворотний звʼязок (рішення кейсворкерів) і:
  1) рахує точність флагів (підтверджено vs відхилено);
  2) якщо міток достатньо — навчає ІНТЕРПРЕТОВАНУ калібровану модель
     (логістична регресія, P(підтверджено | фічі)), логує в MLflow, зберігає
     out/calibration.joblib. Тоді scoring підхоплює її як шов (model_score поруч).
Прозорість: виводимо коефіцієнти — жодної чорної скрині.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lastivka import feedback, pipeline, scoring  # noqa: E402

FEATURE_NAMES = ["max_внесок", "сума_внесків", "к-сть_порушень", "вразливість", "immediate"]


def main():
    st = feedback.stats()
    print("── ЗВОРОТНИЙ ЗВ'ЯЗОК ──")
    print(" ", st.get("note"))
    fb = feedback.read_feedback()
    if fb.empty:
        print("Спершу: python scripts/seed_feedback.py (демо) або накопичіть реальні рішення.")
        return

    # точність флагів: confirmed vs rejected
    conf = int((fb["decision"] == "confirmed").sum())
    rej = int((fb["decision"] == "rejected").sum())
    tot = conf + rej
    print(f"  рішень: {len(fb)} | підтверджено {conf} | відхилено {rej} | "
          f"confirm-rate {conf/tot:.1%}" if tot else "")

    labeled = fb[fb["outcome"] != "unknown"]
    if len(labeled) < 200:
        print(f"\nМіток для навчання: {len(labeled)} (<200) — модель НЕ тренуємо (рано).")
        print("Шов готовий: щойно міток вистачить, ця ж команда натренує й увімкне калібрування.")
        return

    # фічі з черги
    q = pipeline.read_queue()
    qmap = {int(r["entity_id"]): r for _, r in q.iterrows()}
    X, y = [], []
    for _, f in labeled.iterrows():
        r = qmap.get(int(f["entity_id"]))
        if r is None:
            continue
        row = {"contributions": json.loads(r["contributions"]),
               "vulnerability": float(r["vulnerability"]), "immediate": bool(r["immediate"])}
        X.append(scoring.features(row))
        y.append(1 if f["outcome"] == "substantiated" else 0)

    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score
    from sklearn.model_selection import cross_val_predict
    model = LogisticRegression(max_iter=1000, class_weight="balanced").fit(X, y)
    proba = cross_val_predict(LogisticRegression(max_iter=1000, class_weight="balanced"),
                              X, y, cv=5, method="predict_proba")[:, 1]
    auc = roc_auc_score(y, proba)

    print(f"\n── КАЛІБРОВАНА МОДЕЛЬ (логістична, інтерпретована) ──")
    print(f"  навчальних прикладів: {len(y)} | частка підтверджених: {sum(y)/len(y):.1%}")
    print(f"  ROC-AUC (5-fold CV): {auc:.3f}")
    print("  коефіцієнти (прозоро, який сигнал як впливає):")
    for name, coef in zip(FEATURE_NAMES, model.coef_[0]):
        print(f"    {name:16s} {coef:+.3f}")

    os.makedirs("out", exist_ok=True)
    import joblib
    joblib.dump(model, "out/calibration.joblib")
    print("  ✓ збережено out/calibration.joblib → scoring підхопить як model_score")

    try:
        import mlflow
        mlflow.set_experiment("lastivka-calibration")
        with mlflow.start_run():
            mlflow.log_metrics({"roc_auc_cv": auc, "n_labeled": len(y),
                                "positive_rate": sum(y)/len(y)})
            mlflow.log_params({f"coef_{n}": round(c, 4) for n, c in zip(FEATURE_NAMES, model.coef_[0])})
        print("  ✓ залоговано в MLflow (experiment: lastivka-calibration)")
    except ImportError:
        pass


if __name__ == "__main__":
    main()
