"""
Ластівка — управлінська панель (Streamlit).
Чотири стовпи: 01 Інтеграція даних · 02 Виявлення ризиків · 03 Цілеспрямоване
реагування · 04 Управлінська панель.

Запуск:  streamlit run app/dashboard.py
"""
import json
import os
import sys

import pandas as pd
import streamlit as st

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lastivka import matching, pipeline  # noqa: E402
from lastivka.emitters import REGISTRIES  # noqa: E402

st.set_page_config(page_title="Ластівка", page_icon="🕊️", layout="wide")

REG_UA = {r["code"]: r["ua"] for r in REGISTRIES}
REG_ACCESS = {r["code"]: r["access"] for r in REGISTRIES}
TIER_LABEL = {"T0": "🔴 T0 · сьогодні", "T1": "🟠 T1 · цей тиждень", "T2": "🟡 T2 · спостереження"}
VIOL_UA = {
    "W1_displacement": "Вимушене переміщення", "W3_out_of_education": "Поза освітою",
    "W8_medical_access": "Обмеження медицини", "W2_psych_trauma": "Психотравма",
    "W6_orphanhood": "Сирітство / втрата опіки", "W5_deportation": "Депортація",
    "W7_trafficking": "Торгівля людьми", "F3_neglect": "Нехтування потребами",
    "P1_physical_home": "Фізичне насильство вдома", "E1_bullying": "Булінг",
    "F6_sexual_abuse": "Сексуальне насильство", "F4_child_labor": "Дитяча праця",
    "E4_inclusion": "Доступ до інклюзії",
}


@st.cache_data(show_spinner="Матчинг силосів…")
def load_entities():
    ents = matching.match()
    return {e["entity_id"]: e for e in ents}, matching.LAST_STATS


@st.cache_data
def load_queue():
    return pipeline.read_queue()


@st.cache_data
def load_metrics():
    return pipeline.read_metrics()


def vname(v):
    return VIOL_UA.get(v, v)


def oblast_of(ent):
    for r in ent.get("rows_by_reg", {}).get("EDDR", []):
        addr = r.get("registered_residence") or ""
        if "обл" in addr:
            return addr.split(" обл")[0].split(",")[-1].strip()
    return "—"


# ── дані ──
try:
    queue = load_queue()
    metrics = load_metrics()
    entities, match_stats = load_entities()
except Exception as e:
    st.error(f"Спершу згенеруй дані й прожени пайплайн:\n\n"
             f"`python scripts/run_generation.py -n 5000`\n\n"
             f"`python scripts/run_pipeline.py --no-mlflow`\n\nПомилка: {e}")
    st.stop()

st.title("🕊️ Ластівка")
st.caption("Проактивний privacy-preserving захист прав дитини · крос-реєстрова система раннього виявлення")

page = st.sidebar.radio("Розділ", [
    "④ Управлінська панель", "③ Черга реагування", "① Профіль дитини",
    "② Приватність і якість моделі",
])
st.sidebar.markdown("---")
st.sidebar.metric("Дітей у реєстрах", f"{metrics['matching']['true_children']:,}")
st.sidebar.metric("Сигналів у черзі", f"{len(queue):,}")
st.sidebar.metric("Негайних (T0)", int((queue['tier'] == 'T0').sum()))


# ══════════════════ 04 УПРАВЛІНСЬКА ПАНЕЛЬ ══════════════════
if page.startswith("④"):
    st.subheader("④ Управлінська панель — моніторинг і підтримка рішень")
    c = st.columns(4)
    c[0].metric("🔴 Сьогодні (T0)", int((queue.tier == "T0").sum()))
    c[1].metric("🟠 Цей тиждень (T1)", int((queue.tier == "T1").sum()))
    c[2].metric("🟡 Спостереження (T2)", int((queue.tier == "T2").sum()))
    c[3].metric("Негайних [immediate]", int(queue.immediate.sum()))

    st.markdown("##### Розподіл за типами порушень")
    vlist = []
    for vs in queue["violations"]:
        vlist += [vname(v) for v in json.loads(vs)]
    vc = pd.Series(vlist).value_counts()
    st.bar_chart(vc, horizontal=True, color="#e8743b")

    cc = st.columns(2)
    with cc[0]:
        st.markdown("##### За регіонами (топ)")
        obl = pd.Series([oblast_of(entities[e]) for e in queue["entity_id"]]).value_counts().head(10)
        st.bar_chart(obl, horizontal=True)
    with cc[1]:
        st.markdown("##### Рівні черги")
        st.bar_chart(queue["tier"].value_counts())

    st.markdown("##### Якість моделі (на синтетичному ground truth)")
    o = metrics["detection"]["overall"]
    q = st.columns(4)
    q[0].metric("Precision", f"{o['precision']:.2f}")
    q[1].metric("Recall", f"{o['recall']:.2f}")
    q[2].metric("F1", f"{o['f1']:.2f}")
    q[3].metric("Матчинг (зібрано в 1)", f"{metrics['matching']['reconstruction_rate']:.0%}")


# ══════════════════ 03 ЧЕРГА РЕАГУВАННЯ ══════════════════
elif page.startswith("③"):
    st.subheader("③ Цілеспрямоване реагування — ранжована черга кейсворкера")
    f = st.columns([1, 1, 2])
    tier_sel = f[0].multiselect("Рівень", ["T0", "T1", "T2"], default=["T0", "T1"])
    only_imm = f[1].checkbox("Лише негайні", value=False)
    vsel = f[2].multiselect("Тип порушення", sorted({vname(v) for vs in queue["violations"] for v in json.loads(vs)}))

    view = queue[queue["tier"].isin(tier_sel)]
    if only_imm:
        view = view[view.immediate == 1]
    if vsel:
        view = view[view["violations"].apply(lambda vs: any(vname(v) in vsel for v in json.loads(vs)))]

    st.caption(f"Показано {len(view)} із {len(queue)} сигналів. Сортування — за терміновістю.")
    for _, r in view.head(60).iterrows():
        viols = ", ".join(vname(v) for v in json.loads(r["violations"]))
        imm = " · 🚨 НЕГАЙНО" if r["immediate"] else ""
        with st.expander(f"{TIER_LABEL[r['tier']]} · score {r['score']:.2f}{imm} — "
                         f"{r['pib']} ({r['age']} р.) · {viols}"):
            cols = st.columns([2, 1])
            with cols[0]:
                st.markdown("**Чому в черзі (пояснення):**")
                for con in json.loads(r["contributions"]):
                    regs = ", ".join(REG_UA.get(x, x) for x in con["evidence"])
                    lvl1 = [x for x in con["evidence"] if REG_ACCESS.get(x) == 1]
                    note = ""
                    if lvl1:
                        note = f" · 🔒 Рівень-1 ({', '.join(lvl1)}) через PSI-булеан; повний доступ за ухвалою суду"
                    st.markdown(f"- **{vname(con['violation'])}** · внесок {con['value']:.2f} "
                                f"(тяжкість {con['severity']}, гострота *{con['acuity']}*)\n"
                                f"  - перетин реєстрів: {regs}{note}")
            with cols[1]:
                st.metric("Urgency score", f"{r['score']:.2f}")
                st.metric("Вразливість ×", f"{r['vulnerability']:.2f}")
                vf = json.loads(r["vuln_factors"])
                if vf:
                    st.caption("Фактори: " + ", ".join(vf))
                st.caption("УНЗР: " + (str(r["unzr"]) if r["unzr"] else "— (матч по ПІБ+дата)"))
            st.caption("ℹ️ Decision support: рішення ухвалює спеціаліст; система лише пріоритезує і пояснює.")


# ══════════════════ 01 ПРОФІЛЬ ДИТИНИ ══════════════════
elif page.startswith("①"):
    st.subheader("① Інтеграція даних — крос-реєстровий профіль дитини")
    opts = {f"{r['pib']} ({r['age']} р.) · {r['tier']} · score {r['score']:.2f}": int(r["entity_id"])
            for _, r in queue.head(200).iterrows()}
    sel = st.selectbox("Оберіть дитину з черги", list(opts.keys()))
    ent = entities[opts[sel]]

    st.markdown(f"### {ent['pib']}")
    h = st.columns(4)
    h[0].metric("УНЗР", ent["unzr"] or "—")
    h[1].metric("Дата народження", ent["birth_date"] or "—")
    h[2].metric("Реєстрів інтегровано", ent["n_registries"])
    h[3].metric("Регіон", oblast_of(ent))

    st.markdown("##### Силоси, з яких зібрано профіль")
    chips = " ".join(f"`{REG_UA.get(c, c)}`" for c in ent["registries"])
    st.markdown(chips)

    # таймлайн подій
    st.markdown("##### Хронологія сигналів (з різних реєстрів)")
    events = []
    R = ent["rows_by_reg"]
    for r in R.get("VPO", []):
        events.append((r.get("displacement_date"), "ВПО", f"Переміщення → {r.get('actual_residence_place')}"))
    for r in R.get("EDEBO", []):
        if r.get("study_status") in ("transferred", "expelled"):
            events.append((r.get("status_effective_date"), "ЄДЕБО", f"Вихід зі школи (статус: {r.get('study_status')})"))
    for r in R.get("EHEALTH", []):
        if r.get("resource_type") == "declaration" and r.get("status") == "terminated":
            events.append((r.get("end_date"), "eHealth", "Декларацію з лікарем закрито"))
        if r.get("condition_category") in ("trauma", "psych") and r.get("date"):
            tag = "травма" if r.get("condition_category") == "trauma" else "психолог"
            events.append((r.get("date"), "eHealth", f"Звернення: {tag}"
                           + (" (повторне)" if str(r.get("is_repeat")) == "true" else "")))
    for r in R.get("CHILDWAR", []):
        events.append((r.get("incident_date"), "Діти війни", f"Статус: {r.get('status_category')}"))
    for r in R.get("DITY", []):
        events.append((r.get("primary_registration_date"), "ССД", f"Облік: {r.get('child_status')}"))
    for r in R.get("ERDR", []):
        events.append((r.get("register_entry_datetime"), "ЄРДР 🔒", f"Провадження: {r.get('preliminary_legal_qualification')} (Рівень 1)"))
    for r in R.get("DV", []):
        events.append((r.get("incident_datetime"), "Дом. насильство", f"Виклик поліції ({r.get('form_of_violence')})"))
    ev = pd.DataFrame([e for e in events if e[0] and e[0] != "None"],
                      columns=["дата", "реєстр", "подія"]).sort_values("дата")
    st.dataframe(ev, hide_index=True, use_container_width=True)

    # графік відвідуваності (change-point)
    aikom = sorted(R.get("AIKOM", []), key=lambda x: x.get("attendance_period", ""))
    if aikom:
        st.markdown("##### Відвідуваність / успішність (виявлення зламу)")
        df = pd.DataFrame([{"період": r.get("attendance_period"),
                            "пропуски": float(r.get("missed_lessons_count") or 0),
                            "оцінка(12)": float(r.get("score_12") or 0)} for r in aikom]).set_index("період")
        st.line_chart(df)


# ══════════════════ 02 ПРИВАТНІСТЬ І ЯКІСТЬ ══════════════════
else:
    st.subheader("② Приватність і якість моделі")
    st.markdown("##### 🔐 Privacy-preserving матчинг (PPRL, Bloom-filter / Dice)")
    p = metrics["privacy"]
    cc = st.columns(3)
    cc[0].metric("Пар перевірено", p["n_pairs"])
    cc[1].metric("Precision (без plaintext)", f"{p['precision']:.2f}")
    cc[2].metric("Recall", f"{p['recall']:.2f}")
    st.info("Реєстри зіставляються по **зашифрованих** Bloom-відбитках — ПІБ/УНЗР не розкриваються. "
            "Дані Рівня 1 (ЄРДР, психіатрія) входять у скоринг як **PSI-булеан** «сигнал є», "
            "без розкриття вмісту. Це єдиний юридично чистий спосіб (медтаємниця, судова ухвала).")

    st.markdown("##### 🎯 Якість виявлення (precision/recall vs синтетичний ground truth)")
    rows = []
    for v, m in metrics["detection"]["per_violation"].items():
        rows.append({"порушення": vname(v), "TP": m["tp"], "FP": m["fp"], "FN": m["fn"],
                     "precision": m["precision"], "recall": m["recall"]})
    dfm = pd.DataFrame(rows).sort_values("precision", ascending=False)
    st.dataframe(dfm, hide_index=True, use_container_width=True)
    o = metrics["detection"]["overall"]
    st.success(f"**Загалом: precision {o['precision']:.2f} · recall {o['recall']:.2f} · F1 {o['f1']:.2f}** "
               f"— валідовано на {metrics['matching']['true_children']:,} синтетичних дітях із "
               f"підсадженими порушеннями (ground truth).")

    st.markdown("##### 🧬 Матчинг (відновлення дитини з силосів)")
    mm = metrics["matching"]
    mc = st.columns(3)
    mc[0].metric("Сутностей", f"{mm['entities']:,}")
    mc[1].metric("Зібрано в 1", f"{mm['reconstruction_rate']:.1%}")
    mc[2].metric("Чистих кластерів", f"{mm['pure_clusters']:,}")
    st.caption(f"Fuzzy-приєднано записів без УНЗР: {match_stats.get('fuzzy_attached', 0):,} "
               f"(матч по ПІБ+дата, бо частина дітей без РНОКПП/УНЗР).")
