"""Класи збоїв, які виявляє харнес. Кожен — машинно-перевірюваний."""
from __future__ import annotations
from enum import Enum


class FailureClass(str, Enum):
    FP_CONFOUNDER = "FP-confounder"          # benign look-alike (хвороба/бідність/горе) спрацював як ризик
    FP_SPURIOUS = "FP-spurious"              # спрацював без жодного драйвера
    FN_MISSED = "FN-missed"                  # справжній ризик не виявлено
    WRONG_TIER = "wrong-tier"                # спрацював, але tier не той
    WRONG_REASON = "wrong-reason"            # те порушення, але хибні/недостатні докази-реєстри
    DOUBLE_COUNT = "double-count"            # та сама шкода рахується двічі
    PRIVACY_LEAK = "privacy-leak"            # walled-реєстр (EHEALTH/ERDR/TERVIS) використано там, де заборонено
    FAMILY_GRAPH_SPILLOVER = "family-graph-spillover"  # сиблінг-сигнал став власним порушенням дитини
    CROSSBORDER_MISREPLACE = "crossborder-misreplacement"  # W1/W3/W8 хибно лишено/прибрано при UA<->EE
    ORACLE_DISAGREEMENT = "oracle-disagreement"  # очікування != god-view (підозра на баг god-view)
    DEAD_CODE = "dead-code"                  # severity/label існує, але правило ніколи не спрацьовує


# Дитяче-безпекова вага: пропущене насильство критичніше за хибну тривогу.
SEVERITY_RANK = {
    FailureClass.FN_MISSED: "critical",
    FailureClass.PRIVACY_LEAK: "critical",
    FailureClass.FP_CONFOUNDER: "high",
    FailureClass.FP_SPURIOUS: "high",
    FailureClass.FAMILY_GRAPH_SPILLOVER: "high",
    FailureClass.CROSSBORDER_MISREPLACE: "high",
    FailureClass.WRONG_TIER: "medium",
    FailureClass.WRONG_REASON: "medium",
    FailureClass.DOUBLE_COUNT: "medium",
    FailureClass.DEAD_CODE: "medium",
    FailureClass.ORACLE_DISAGREEMENT: "info",
}
