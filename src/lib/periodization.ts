import { workingWeight } from "./oneRm";

/**
 * 5/3/1 by Jim Wendler.
 * Cycle: 4 weeks, then deload.
 * Each week uses the same 4 main lifts (squat, bench, deadlift, OHP)
 * but with different rep schemes:
 *   Week 1: 3x5 @ 65/75/85%
 *   Week 2: 3x3 @ 70/80/90%
 *   Week 3: 5/3/1 @ 75/85/95%
 *   Week 4: Deload 3x5 @ 40/50/60%
 * After cycle 4, training max increases by 5lb upper / 10lb lower.
 */

export interface FiveThreeOneConfig {
  squat_tm: number;
  bench_tm: number;
  deadlift_tm: number;
  ohp_tm: number;
  unit: "kg" | "lb";
}

export interface PlannedSet {
  week: number;
  day: number;
  lift: "squat" | "bench" | "deadlift" | "ohp";
  set_index: number;
  reps: number;
  weight: number;
  percent: number;
  is_amrap?: boolean;
  notes?: string;
}

const WEEK_SCHEMES = [
  // Week 1: 5s
  [
    { reps: 5, pct: 0.65 },
    { reps: 5, pct: 0.75 },
    { reps: 5, pct: 0.85, is_amrap: true },
  ],
  // Week 2: 3s
  [
    { reps: 5, pct: 0.7 },
    { reps: 3, pct: 0.8 },
    { reps: 3, pct: 0.9, is_amrap: true },
  ],
  // Week 3: 5/3/1
  [
    { reps: 5, pct: 0.75 },
    { reps: 3, pct: 0.85 },
    { reps: 1, pct: 0.95, is_amrap: true },
  ],
  // Week 4: Deload
  [
    { reps: 5, pct: 0.4 },
    { reps: 5, pct: 0.5 },
    { reps: 5, pct: 0.6 },
  ],
] as const;

const LIFT_SCHEDULE: Record<number, ("squat" | "bench" | "deadlift" | "ohp")[]> = {
  // 4-day split
  1: ["squat", "bench"],
  2: ["deadlift", "ohp"],
  3: ["squat", "bench"],
  4: ["deadlift", "ohp"],
};

export function generateFiveThreeOne(
  cfg: FiveThreeOneConfig,
  weeks: number = 4
): PlannedSet[] {
  const out: PlannedSet[] = [];
  const tms = {
    squat: cfg.squat_tm,
    bench: cfg.bench_tm,
    deadlift: cfg.deadlift_tm,
    ohp: cfg.ohp_tm,
  };

  for (let w = 1; w <= weeks; w++) {
    const scheme = WEEK_SCHEMES[(w - 1) % 4];
    for (let d = 1; d <= 4; d++) {
      const lifts = LIFT_SCHEDULE[d];
      for (const lift of lifts) {
        const tm = tms[lift];
        for (let s = 0; s < scheme.length; s++) {
          const set = scheme[s];
          out.push({
            week: w,
            day: d,
            lift,
            set_index: s + 1,
            reps: set.reps,
            weight: workingWeight(tm, set.pct),
            percent: set.pct,
            is_amrap: "is_amrap" in set ? set.is_amrap : false,
            notes:
              s === scheme.length - 1 && w === 4
                ? "Deload - stay light, focus on form"
                : s === scheme.length - 1
                ? "AMRAP - push for PR set"
                : undefined,
          });
        }
      }
    }
  }
  return out;
}

/**
 * TM progression after each completed cycle.
 * Upper body lifts (bench, ohp): +2.5kg
 * Lower body lifts (squat, deadlift): +5kg
 */
export function progressFiveThreeOne(cfg: FiveThreeOneConfig): FiveThreeOneConfig {
  return {
    ...cfg,
    bench_tm: cfg.bench_tm + 2.5,
    ohp_tm: cfg.ohp_tm + 2.5,
    squat_tm: cfg.squat_tm + 5,
    deadlift_tm: cfg.deadlift_tm + 5,
  };
}
