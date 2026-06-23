# Lastivka — Demo Script (for judges)

> A step-by-step walkthrough of the frontend MVP. Language defaults to **English**;
> a **UK** toggle is available in the top bar of every screen.
> All data is **synthetic** — structurally identical to the real registries, with no real personal data.

---

## How to run the demo

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000  (or: npm run build && npm run start)
```

Open `http://localhost:3000`. The landing page (`/`) and `/about` are public; everything
else requires sign-in and is role-gated. Unauthenticated visits to a protected route
redirect to `/login`.

### Demo logins (shared demo password: `lastivka`)

| Login | Persona | Role | Scope |
|---|---|---|---|
| `regional@lastivka.demo` | Olena Tkachenko | Regional manager / analyst | Kharkiv **oblast** — aggregates only, **no PII** |
| `chuhuiv@lastivka.demo` | Andrii Kovalenko | Community worker (Child Services / SSD) | **Chuhuiv** hromada — full PII, **Chuhuiv only** |
| `izium@lastivka.demo` | Mariia Bondar | Community worker (Child Services / SSD) | **Izium** hromada — full PII, **Izium only** |

On the `/login` screen, click a persona card to autofill the login, then **Sign in**.

### What the demo authentication enforces (verified)

- **Route protection** — `src/proxy.ts` redirects unauthenticated requests to `/login?next=…`,
  sends community workers away from analyst-only routes (`/dashboard`, `/caseload`) and
  regional managers away from operator-only routes (`/queue`, `/profile`, `/my-queue`).
- **Hromada isolation** — the Chuhuiv worker's queue/profile/my-queue contain **only Chuhuiv**
  children; the Izium worker sees **only Izium**. Cross-hromada `?id=` lookups (IDOR) return
  nothing. Scope is derived from the session in the data layer (`src/lib/api.ts`), not from
  client-supplied parameters.
- **PII redaction for regional** — the regional role never receives `pib` / `unzr` /
  `birth_date`; it gets de-identified oblast aggregates only.

---

## 0. One-line pitch (15 seconds)

> "A child's rights violation is only visible at the **intersection of several state registries**.
> Lastivka assembles a child from those disconnected registries — **with personal-data protection** —
> ranks cases by urgency, explains every decision, and hands a specialist a clear response queue.
> It is **decision support, not a verdict**: a human always makes the final call."

---

## 1. Open the solution description — the "what & why" (1–2 min)

1. Open the **landing page** (`/`) — scroll through: the problem, the core mission, the four steps, the six product screens, and "who it's for".
2. Open **`/about`** (top-bar link "About", or the "About" link in the app sidebar). Walk the panels:
   - **Problem** — a child slips through the cracks between systems.
   - **What it does** — decision support, not a verdict; human in the loop.
   - **Four pillars** — integration layer (Trembita / X-Road), indicator store (flags, not mass copies), transparent rules engine, specialist cabinet with audit.
   - **Roles & access** — Community Worker (PII, own hromada only) vs Regional Manager (aggregates, no PII).
   - **Privacy** — three data-access levels (Level 1 yes/no signal, Level 2 purpose-bound, Level 3 public/judicial) and privacy-preserving matching (PSI / PPRL).
   - **Cross-border** — Ukraine ↔ Estonia with no shared key.
   - **Risks come later** — risk scoring is the next phase; the UI leaves a clean seam.

> Talking point: the language switch (top-right **EN / UK**) shows full bilingual coverage.
> Non-translatable terms are transliterated — **EDDR** (ЄДДР), **Child Services / SSD** (ССД),
> **Trembita**, **hromada** (громада), **oblast** (область), **UNZR** (УНЗР).

---

## 2. The Community Worker view — scope + personal data (2 min)

The **operator** role. These screens show full personal data, scoped to the worker's caseload/territory.

1. **Response queue** (`/queue`) — children ordered by urgency (T0 today / T1 this week / T2 watch).
   - Expand any card: the system **explains** the priority — which registry signals aligned, the urgency index, vulnerability factors.
   - Point out the **Level-1 lock badge**: the most sensitive registries (eHealth, ERDR) appear only as a yes/no signal, never the content.
   - Use the **Region** filter to show territory scoping (oblast).
2. **Child profile** (`/profile`) — pick a case (e.g. the signature displacement case).
   - This is how the system "sees" a child **assembled from several registries** — without merging personal data into one shared database.
   - Walk the **timeline**: each event is tagged with its source registry; Level-1 events carry the lock and the "yes/no only" note.
3. **Specialist workspace** (`/my-queue`) — the worker's personal queue with response deadlines and a logged decision per case (confirmed / rejected / escalated). This is the human-in-the-loop record.

> Talking point: the Community Worker sees **names, dates, registries, deadlines** — but as an operator
> working their own caseload. The data-access model (see `docs/ROLE_ACCESS_MATRIX.md`) restricts the
> Child Services specialist to **their own territory** (Ф-Г = hromada).

---

## 3. The Regional Manager view — aggregates, no personal data (1–2 min)

The **analyst / supervisor** role. These screens are de-identified — counts, structure, completeness, planning.

1. **Management dashboard** (`/dashboard`) — the big picture:
   - KPIs (T0 / T1 / T2 / immediate / total in queue), distribution by violation type, queue tiers, **signal geography by oblast**.
   - **Model quality** panel: precision, recall, overall F1 — trust shown as numbers.
   - Note: this is **aggregated** — no names, no addresses anywhere on the screen.
2. **Service caseload** (`/caseload`) — strain by oblast: specialists vs capacity vs cases, utilisation, and "extra specialists needed" where caseload exceeds capacity. Pure resource planning, no PII.

> Talking point: the Regional Manager works at the **oblast** level on **de-identified** aggregates —
> exactly the 📊 column in the role-access matrix. Personal data stays with the worker handling the child.

---

## 4. Privacy & trust (1 min)

1. Open **`/privacy`** (sidebar: "Data protection & quality").
   - **Private matching**: registries compare encrypted fingerprints, not names — robust to spelling
     variants ("Олександр" / "Oleksandr" / "Alexander" = one person).
   - **Level-1 data**: criminal/medical reach the system only as a yes/no signal; full access needs a court order or medical confidentiality.
   - **Detection quality table**: precision/recall per violation type, verified on synthetic children with violations known in advance.
2. Reinforce: **poverty ≠ risk** — socio-economic factors alone are never a trigger (aligned with the EU AI Act).

---

## 5. Cross-border Ukraine ↔ Estonia (1 min)

1. Open **`/cross-border`**.
   - There is **no shared identifier** (UNZR ≠ isikukood), so linkage is **privacy-preserving**:
     only an encrypted Bloom fingerprint (PPRL) crosses the border — never personal data.
   - Show the cross-border KPIs (children in Estonian registries, linked, link rate) and the case list
     carrying **both** identifiers (🇺🇦 UNZR + 🇪🇪 isikukood).
   - New cross-border risks: **gap between systems**, **unaccompanied (UASC)**, **education rupture**, **medical rupture**.

---

## 6. Risk scoring — the next phase (15 sec)

> Explicit talking point: **risk scoring is intentionally not implemented in this release.**
> The interface leaves a clean seam — types and UI placeholders — where ranked risk signals will plug in
> next, without any scoring computation happening today. What you see ranked now is the urgency model on
> the synthetic dataset; the federated risk-reconciliation design is in `docs/FEDERATED_EDGE_ARCH.md`.

---

## 7. Wrap-up (15 sec)

- **EN by default**, full bilingual coverage, UK toggle retained, transliterated terms.
- **Two access levels** demonstrated: Community Worker (personal data, operator) vs Regional Manager (de-identified aggregates).
- **Privacy by design**: data minimisation, Level-1 yes/no signals, private matching, audit, human-in-the-loop.
- **Cross-border** without a shared key.
- **Decision support, not a verdict.**

---

## Appendix — the two access levels and the three demo personas

The role-access model (`docs/ROLE_ACCESS_MATRIX.md`, sheet "Role" of `docs/CHALLENGE_REQUIREMENTS.md`)
defines the two levels this demo illustrates. Suggested personas for the walkthrough, all in **Kharkiv oblast**:

| Persona | Role | Scope | Sees |
|---|---|---|---|
| **Olena Tkachenko** | Regional Manager / Analyst | Kharkiv **oblast** | Aggregates, statistics, data completeness, planning — **no personal data** |
| **Andrii Kovalenko** | Community Worker (Child Services / SSD) | **Chuhuiv** hromada | Full personal data (names, addresses, phones), cases, deadlines, visits — **Chuhuiv only** |
| **Mariia Bondar** | Community Worker (Child Services / SSD) | **Izium** hromada | Full personal data — **Izium only** |

Isolation principle to call out: a Chuhuiv worker does **not** see Izium cases and vice versa; the Regional
Manager sees aggregates across all hromadas but **never** personal data. This is **implemented and enforced**
in this MVP: demo authentication (`/login`) lets the presenter pick a persona at sign-in, route protection
lives in `src/proxy.ts`, and data scoping + PII redaction live in `src/lib/api.ts` (scope is derived from the
session, not from the client). The two demo community personas (Chuhuiv, Izium) each see only their own
hromada; the regional persona sees de-identified oblast aggregates only.

---

### Quick route map

| Route | Screen | Level |
|---|---|---|
| `/` | Landing — pitch | public |
| `/about` | Solution description | public |
| `/login` | Demo sign-in (pick a persona) | public |
| `/queue` | Response queue | Community Worker (PII) |
| `/profile` | Child profile | Community Worker (PII) |
| `/my-queue` | Specialist workspace | Community Worker (PII) |
| `/dashboard` | Management dashboard | Regional Manager (aggregates) |
| `/caseload` | Service caseload | Regional Manager (aggregates) |
| `/privacy` | Data protection & quality | shared (signed-in) |
| `/cross-border` | Cross-border UA ↔ EE | shared (signed-in) |
