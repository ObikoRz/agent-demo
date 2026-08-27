export type Experience = "beginner" | "intermediate" | "advanced";

export interface User {
  id: number;
  name: string;
  bodyweight_kg: number | null;
  height_cm: number | null;
  experience: Experience | null;
  created_at: string;
}

export type ExerciseCategory = "compound" | "isolation" | "cardio" | "accessory";
export type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "carry"
  | "lunge"
  | "rotation"
  | "isolation";

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  primary_muscle: string;
  secondary_muscles: string | null;
  equipment: string;
  pattern: MovementPattern | null;
  demo_url: string | null;
  notes: string | null;
}

export interface WorkoutSession {
  id: number;
  user_id: number;
  date: string;
  name: string | null;
  notes: string | null;
  duration_min: number | null;
  bodyweight_kg: number | null;
}

export interface SetLog {
  id: number;
  session_id: number;
  exercise_id: number;
  set_index: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  is_warmup: number;
  is_pr: number;
  notes: string | null;
}

export interface TrainingMax {
  id: number;
  user_id: number;
  exercise_id: number;
  tm_kg: number;
  unit: string;
  updated_at: string;
}

export interface Plan {
  id: number;
  user_id: number;
  name: string;
  template: string;
  goal: string | null;
  weeks: number;
  days_per_week: number;
  config_json: string | null;
  created_at: string;
}

export interface PlanSession {
  id: number;
  plan_id: number;
  week: number;
  day: number;
  name: string | null;
}

export interface PlanExercise {
  id: number;
  session_id: number;
  exercise_id: number;
  sets: number;
  reps: string;
  intensity: string | null;
  notes: string | null;
  sort_order: number;
}

export interface ApiConfig {
  id: number;
  base_url: string | null;
  api_key: string | null;
  model: string | null;
  updated_at: string;
}
