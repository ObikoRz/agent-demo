/**
 * 1RM (one-rep max) estimation formulas.
 *
 * Sources:
 *  - Epley (1985)
 *  - Brzycki (1993)
 *  - Lombardi (1989)
 *  - Mayhew et al. (1992)
 *  - O'Conner et al. (1989)
 *
 * General rule: most accurate in the 1-10 rep range.
 * For reps > 10 the estimate variance gets large, so we clamp.
 */

export type OneRmFormula = "epley" | "brzycki" | "lombardi" | "mayhew" | "oconner" | "average";

export interface OneRmResult {
  estimated: number;
  byFormula: Record<Exclude<OneRmFormula, "average">, number>;
}

export function epley(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function brzycki(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps >= 37) return weight; // formula diverges
  return (weight * 36) / (37 - reps);
}

export function lombardi(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  return weight * Math.pow(reps, 0.1);
}

export function mayhew(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
}

export function oconner(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  return weight * (1 + 0.025 * reps);
}

export function estimateOneRm(
  weight: number,
  reps: number,
  formula: OneRmFormula = "average"
): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;

  const byFormula = {
    epley: epley(weight, reps),
    brzycki: brzycki(weight, reps),
    lombardi: lombardi(weight, reps),
    mayhew: mayhew(weight, reps),
    oconner: oconner(weight, reps),
  };

  if (formula === "average") {
    const sum = Object.values(byFormula).reduce((a, b) => a + b, 0);
    return sum / Object.values(byFormula).length;
  }
  return byFormula[formula];
}

/**
 * Working weight at a given % of 1RM.
 * E.g. workingWeight(oneRm, 0.85) -> weight for ~85% 1RM set.
 */
export function workingWeight(oneRm: number, percent: number): number {
  return Math.round((oneRm * percent) / 2.5) * 2.5; // round to nearest 2.5kg plate
}

/**
 * Wilks-style helper: convert RPE + reps -> approximate %1RM (Tuchscherer RPE chart).
 * Used to back-calculate working weight when user logs with RPE only.
 */
const RPE_CHART: Record<number, Record<number, number>> = {
  10: { 1: 1.0, 2: 0.955, 3: 0.91, 4: 0.89, 5: 0.87, 6: 0.85, 7: 0.83, 8: 0.81, 9: 0.79, 10: 0.77, 11: 0.75, 12: 0.73 },
  9.5: { 1: 0.978, 2: 0.93, 3: 0.885, 4: 0.86, 5: 0.84, 6: 0.815, 7: 0.795, 8: 0.775, 9: 0.755, 10: 0.735 },
  9: { 1: 0.955, 2: 0.91, 3: 0.865, 4: 0.84, 5: 0.82, 6: 0.79, 7: 0.77, 8: 0.75, 9: 0.73, 10: 0.71 },
  8.5: { 1: 0.93, 2: 0.885, 3: 0.84, 4: 0.815, 5: 0.795, 6: 0.765, 7: 0.745, 8: 0.725, 9: 0.705 },
  8: { 1: 0.91, 2: 0.86, 3: 0.815, 4: 0.79, 5: 0.77, 6: 0.74, 7: 0.72, 8: 0.7, 9: 0.68 },
  7.5: { 1: 0.885, 2: 0.835, 3: 0.79, 4: 0.765, 5: 0.745, 6: 0.715, 7: 0.695 },
  7: { 1: 0.86, 2: 0.81, 3: 0.765, 4: 0.74, 5: 0.72, 6: 0.69 },
  6.5: { 1: 0.835, 2: 0.785, 3: 0.74, 4: 0.715, 5: 0.695 },
  6: { 1: 0.81, 2: 0.76, 3: 0.715, 4: 0.69 },
};

export function rpeToPercent(rpe: number, reps: number): number {
  const repsClamped = Math.max(1, Math.min(reps, 12));
  const rpeKeys = Object.keys(RPE_CHART)
    .map(Number)
    .sort((a, b) => b - a);
  for (const r of rpeKeys) {
    if (rpe >= r) {
      return RPE_CHART[r][repsClamped] ?? 0.7;
    }
  }
  return 0.65;
}
