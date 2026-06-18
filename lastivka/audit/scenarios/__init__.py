"""
Сід-бібліотека сценаріїв (фундамент cell-by-cell аудиту). Кодує відомі гарячі
точки «ризик vs захворіла» як диференціали + позитивні кейси (порушення МУСИТЬ
спрацювати) + dead-code awareness. Флот розширює це до повної матриці.
"""
from __future__ import annotations

from ..builders import (
    base_entity, compose,
    with_idp, with_school_exit, with_enrolled, with_absence_spike, with_gpa_drop,
    with_absence_and_gpa_drop, with_anti_bullying, with_chronic, with_decl_terminated,
    with_missed_checkup, with_trauma_repeat, with_psych, with_deported, with_war_grief,
    with_ssd, with_ssd_hardship, with_parent_death, with_court_deprivation,
    with_trafficking, with_sexual_abuse, with_dv_criminal, with_dv, with_hotline,
    with_disability, with_housing_alienation, with_sibling_in_care,
)
from ..scenario import Scenario, Expectation
from ..differential import DifferentialPair


# ── DIFFERENTIALS: ядро «справжній ризик vs просто захворіла» ──────────────
ALL_DIFFERENTIALS = [
    # F3 нехтування: хвора-бідна дитина (пропуски/невакцинація ПОЯСНЕНІ хворобою) НЕ має бути нехтуванням
    DifferentialPair(
        id="F3_sick_poor_vs_neglect", hotspot="F3_neglect", violation="F3_neglect",
        base=lambda: base_entity(),
        risk_signal=(with_missed_checkup(), with_absence_spike(), with_ssd_hardship()),
        confounder=(with_chronic(), with_missed_checkup(), with_absence_spike(), with_ssd_hardship()),
        rationale="Хронічно хвора дитина в бідній сім'ї з пропусками під час загострень — не доказ нехтування; "
                  "пропуски/невакцинація пояснені хворобою. Нехтування потребує драйвера поза бідністю+хворобою.",
        tags=("FP-confounder", "illness")),

    # W8 доступ до медицини: переміщення з ПОНОВЛЕНИМ доглядом (зміна лікаря) ≠ обмеження доступу
    DifferentialPair(
        id="W8_doctor_switch_vs_denial", hotspot="W8_medical_access", violation="W8_medical_access",
        base=lambda: base_entity(),
        risk_signal=(with_chronic(), with_idp(reatt_doctor=False), with_decl_terminated()),
        confounder=(with_chronic(), with_idp(reatt_doctor=True), with_decl_terminated()),
        rationale="Декларація розірвана при переїзді, але догляд поновлено в новому місці (medical_needs=забезпечено) — "
                  "це лаг зміни лікаря, не відмова в доступі. Поточний код ігнорує поновлення → хибне W8.",
        tags=("FP-confounder", "displacement")),

    # P1 фізичне насильство: ВИПАДКОВІ травми без поліції ≠ домашнє насильство (sentinel — має лишатись зеленим)
    DifferentialPair(
        id="P1_accident_vs_abuse", hotspot="P1_physical_home", violation="P1_physical_home",
        base=lambda: base_entity(),
        risk_signal=(with_trauma_repeat(), with_dv()),
        confounder=(with_trauma_repeat(),),
        rationale="Дві травми без виклику поліції/провадження 126-1 — можуть бути спортивні/побутові; "
                  "P1 вимагає корроборації правоохоронцями. Має лишатись зеленим (regression-sentinel).",
        tags=("regression-sentinel", "accident")),
]


# ── SCENARIOS: позитивні кейси (порушення МУСИТЬ спрацювати) + межові ──────
def _s(id, hotspot, build, expect, tags=(), note=""):
    return Scenario(id=id, hotspot=hotspot, build=build, expect=expect, tags=tags, note=note)


ALL_SCENARIOS = [
    # ── Позитивні: кожне активне порушення має спрацьовувати на своєму драйвері ──
    _s("pos_W3_school_exit", "W3_out_of_education",
       lambda: compose(base_entity(), with_school_exit()),
       Expectation(must_fire={"W3_out_of_education"}, rationale="Вихід зі школи у шкільному віці = поза освітою.")),
    _s("pos_W6_orphanhood", "W6_orphanhood",
       lambda: compose(base_entity(), with_parent_death(), with_ssd()),
       Expectation(must_fire={"W6_orphanhood"}, rationale="Смерть батьків + облік ССД = сирітство.")),
    _s("pos_W5_deportation", "W5_deportation",
       lambda: compose(base_entity(), with_deported(), with_ssd()),
       Expectation(must_fire={"W5_deportation"}, tier_exact="T0",
                   rationale="Статус депортована = негайний рівень.")),
    _s("pos_W7_trafficking", "W7_trafficking",
       lambda: compose(base_entity(), with_trafficking(), with_ssd()),
       Expectation(must_fire={"W7_trafficking"}, tier_exact="T0",
                   rationale="ЄРДР ст.149 = торгівля людьми, негайно.")),
    _s("pos_F6_sexual_abuse", "F6_sexual_abuse",
       lambda: compose(base_entity(), with_sexual_abuse()),
       Expectation(must_fire={"F6_sexual_abuse"}, tier_exact="T0",
                   rationale="ЄРДР ст.152 = сексуальне насильство, негайно.")),
    _s("pos_P1_physical", "P1_physical_home",
       lambda: compose(base_entity(), with_trauma_repeat(), with_dv()),
       Expectation(must_fire={"P1_physical_home"}, rationale="Повторні травми + поліція = домашнє насильство.")),
    _s("pos_E4_inclusion", "E4_inclusion",
       lambda: compose(base_entity(), with_disability(), with_enrolled(inclusive=False)),
       Expectation(must_fire={"E4_inclusion"}, rationale="Інвалідність + немає інклюзивного супроводу.")),
    _s("pos_W9_identity", "W9_identity",
       lambda: compose(base_entity(), with_housing_alienation()),
       Expectation(must_fire={"W9_identity"}, rationale="Відчуження житла дитини = порушення ідентичності.")),
    _s("pos_F3_genuine_neglect", "F3_neglect",
       lambda: compose(base_entity(), with_missed_checkup(), with_absence_spike(), with_ssd_hardship()),
       Expectation(must_fire={"F3_neglect"}, rationale="Невакцинація + прогули + СЖО без пояснення хворобою = нехтування.")),

    # ── FP-конфаундери (мають НЕ спрацьовувати; ймовірно червоні до фіксу) ──
    _s("fp_F3_sick_poor", "F3_neglect",
       lambda: compose(base_entity(), with_chronic(), with_missed_checkup(), with_absence_spike(), with_ssd_hardship()),
       Expectation(must_not_fire={"F3_neglect"},
                   rationale="Хвора-бідна дитина: пропуски/невакцинація пояснені хворобою, не нехтуванням."),
       tags=("FP-confounder", "illness")),
    _s("fp_W8_care_reestablished", "W8_medical_access",
       lambda: compose(base_entity(), with_chronic(), with_idp(reatt_doctor=True), with_decl_terminated()),
       Expectation(must_not_fire={"W8_medical_access"},
                   rationale="Догляд поновлено в новому місці — це лаг зміни лікаря, не відмова в доступі."),
       tags=("FP-confounder", "displacement")),
    _s("fp_war_grief_not_high", "W2_psych_trauma",
       lambda: compose(base_entity(), with_war_grief()),
       Expectation(tier_at_most="T2",
                   rationale="Воєнне горе (переміщена + психічний сигнал, без насильства) — спостереження, не високий tier."),
       tags=("FP-confounder", "war-grief")),
    _s("fp_academic_anxiety_not_bullying", "E1_bullying",
       lambda: compose(base_entity(), with_absence_and_gpa_drop(), with_psych()),
       Expectation(must_not_fire={"E1_bullying"},
                   rationale="Пропуски+падіння оцінок+тривога без комісії з булінгу — академічна тривога, не доведений булінг."),
       tags=("FP-confounder", "anxiety")),

    # ── Family-graph spillover: сиблінг у догляді не має давати ДИТЯЧЕ порушення ──
    _s("spillover_sibling_in_care", "familygraph",
       lambda: compose(base_entity(), with_sibling_in_care()),
       Expectation(must_not_fire={"F3_neglect", "P1_physical_home", "W6_orphanhood"},
                   no_walled_in_evidence=True,
                   rationale="Сиблінг у догляді — лише parental-вісь (P_sibling_in_care), не власне дитяче порушення."),
       tags=("spillover",)),
]
