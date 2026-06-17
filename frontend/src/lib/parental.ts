/**
 * Батьківські / сімейні фактори ризику (фаза 5).
 *
 * Ризик дитини залежить не лише від її власних сигналів, а й від СУТІ
 * батьківських обставин (SUBSTANCE_FEATURES §1–4,8): кримінал, домашнє
 * насильство з боку опікуна, психіка/залежність із впливом на догляд,
 * економічний шок, втрата/позбавлення батьків, насильство над сиблінгом.
 *
 * Кожен фактор зважується за СУТТЮ, а не за фактом присутності:
 *   value = база × сила_доказу × згасання_за_давністю × стосунок × роль
 *
 * Запобіжники (вшиті в генерацію/деривацію, не тут):
 *   • бідність ≠ нехтування — рахуємо лише санкцію/припинення допомоги;
 *   • toxic-trio — пояснювальний контекст, не автоматичний бал;
 *   • брак даних (мед.таємниця) = «unknown», низька вага, без штрафу.
 *
 * Ваги — стартові (seed); калібруються на мітках рецидиву, коли будуть.
 * Дзеркало backend: lastivka/parental.py + config/scoring.yaml (parental).
 */
import type {
  Acuity,
  Contribution,
  EvidenceStrength,
  ParentalKind,
  RegistryCode,
  Relationship,
} from "./types";

/** Базова вага фактора (severity до модифікаторів). */
export const PARENTAL_BASE: Record<ParentalKind, number> = {
  crime_violent: 0.85,
  crime_other: 0.5,
  dv_abuser: 0.8,
  deprivation: 0.75,
  bereavement: 0.7,
  addiction: 0.55,
  mental_health: 0.5,
  economic_shock: 0.45,
  sibling_harm: 0.65,
};

/** Сила доказу: вирок > підтверджено > звернення > лише облік (King 2013, Besemer). */
export const EVIDENCE_MULT: Record<EvidenceStrength, number> = {
  adjudicated: 1.3,
  substantiated: 1.0,
  alleged: 0.6,
  unknown: 0.5,
};

/** Стосунок кривдника: вітчим → новий потерпілий, вищий ризик (re-perpetration). */
export const RELATIONSHIP_MULT: Record<Relationship, number> = {
  biological: 1.0,
  stepparent: 1.2,
  other: 0.7,
};

/** Згасання за давністю: hazard рецидиву пікує 30 днів–4 міс і спадає ~2 роки (Fluke). */
const RECENCY_HALFLIFE = 18; // міс.
export function recencyDecay(months: number): number {
  return Math.max(0.3, Math.pow(0.5, Math.max(0, months) / RECENCY_HALFLIFE));
}

/** Акутність (для UI-тегу) виводиться з давності. */
export function acuityFromRecency(months: number): Acuity {
  if (months <= 4) return "acute";
  if (months <= 12) return "active";
  if (months <= 24) return "chronic";
  return "improving";
}

export interface ParentalInput {
  kind: ParentalKind;
  evidence: RegistryCode[];
  evidence_strength: EvidenceStrength;
  recency_months: number;
  relationship?: Relationship;
  role?: "victim" | "witness";
}

/** Перетворює батьківський фактор на Contribution (вимір "parental"). */
export function makeParentalContribution(p: ParentalInput): Contribution {
  const base = PARENTAL_BASE[p.kind];
  const ev = EVIDENCE_MULT[p.evidence_strength];
  const rec = recencyDecay(p.recency_months);
  const rel = p.relationship ? RELATIONSHIP_MULT[p.relationship] : 1.0;
  const roleMult = p.role === "victim" ? 1.1 : 1.0;
  const value = +(base * ev * rec * rel * roleMult).toFixed(3);
  return {
    violation: `PAR_${p.kind}`,
    value,
    severity: base,
    evidence: p.evidence,
    acuity: acuityFromRecency(p.recency_months),
    dimension: "parental",
    evidence_strength: p.evidence_strength,
    relationship: p.relationship,
    role: p.role,
    recency_months: p.recency_months,
  };
}

/** Чи є внесок батьківського виміру. */
export function isParentalContribution(c: Contribution): boolean {
  return c.dimension === "parental" || c.violation.startsWith("PAR_");
}
