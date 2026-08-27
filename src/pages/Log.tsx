import { useEffect, useState } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getDb } from "@/lib/db";
import { estimateOneRm, rpeToPercent } from "@/lib/oneRm";
import type { Exercise, SetLog, WorkoutSession } from "@/types";
import { format } from "date-fns";

interface DraftSet {
  id: number;
  exercise_id: number;
  set_index: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  is_warmup: boolean;
  notes: string;
}

function newDraftSet(idx: number, exerciseId: number): DraftSet {
  return {
    id: idx,
    exercise_id: exerciseId,
    set_index: idx,
    reps: 5,
    weight_kg: 0,
    rpe: null,
    is_warmup: idx === 1,
    notes: "",
  };
}

export function LogPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [drafts, setDrafts] = useState<DraftSet[]>([]);
  const [exerciseFilter, setExerciseFilter] = useState("");
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [recent, setRecent] = useState<Array<{
    session: WorkoutSession;
    sets: (SetLog & { exercise_name: string })[];
  }>>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const exs = await db.select<Exercise[]>("SELECT * FROM exercises ORDER BY category, name");
      setExercises(exs);

      const today = format(new Date(), "yyyy-MM-dd");
      const todaySession = await db.select<WorkoutSession[]>(
        "SELECT * FROM workout_sessions WHERE date = $1 ORDER BY id DESC LIMIT 1",
        [today]
      );

      if (todaySession[0]) {
        setSession(todaySession[0]);
        const existingSets = await db.select<(SetLog & { exercise_name: string })[]>(
          `SELECT s.*, e.name as exercise_name
           FROM set_logs s
           JOIN exercises e ON e.id = s.exercise_id
           WHERE s.session_id = $1
           ORDER BY s.id`,
          [todaySession[0].id]
        );
        setDrafts(
          existingSets.map((s) => ({
            id: s.id,
            exercise_id: s.exercise_id,
            set_index: s.set_index,
            reps: s.reps,
            weight_kg: s.weight_kg,
            rpe: s.rpe,
            is_warmup: s.is_warmup === 1,
            notes: s.notes ?? "",
          }))
        );
      } else {
        const result = await db.execute(
          "INSERT INTO workout_sessions (user_id, date, name) VALUES (1, $1, $2)",
          [today, `训练 ${today}`]
        );
        const newId = Number(result.lastInsertId);
        setSession({
          id: newId,
          user_id: 1,
          date: today,
          name: `训练 ${today}`,
          notes: null,
          duration_min: null,
          bodyweight_kg: null,
        });
        setDrafts([]);
      }

      // Last 5 sessions
      const recentSessions = await db.select<WorkoutSession[]>(
        "SELECT * FROM workout_sessions ORDER BY date DESC, id DESC LIMIT 5"
      );
      const recentData = [];
      for (const s of recentSessions) {
        const sets = await db.select<(SetLog & { exercise_name: string })[]>(
          `SELECT s.*, e.name as exercise_name
           FROM set_logs s
           JOIN exercises e ON e.id = s.exercise_id
           WHERE s.session_id = $1
           ORDER BY s.id`,
          [s.id]
        );
        recentData.push({ session: s, sets });
      }
      setRecent(recentData);
    })();
  }, []);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(exerciseFilter.toLowerCase())
  );

  const addExercise = (ex: Exercise) => {
    setActiveExercise(ex);
    setExerciseFilter("");
  };

  const addSet = () => {
    if (!activeExercise) return;
    const next = drafts.filter((d) => d.exercise_id === activeExercise.id);
    const idx = next.length + 1;
    setDrafts([
      ...drafts,
      newDraftSet(idx, activeExercise.id),
    ]);
  };

  const updateDraft = (id: number, patch: Partial<DraftSet>) => {
    setDrafts(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeSet = (id: number) => {
    setDrafts(drafts.filter((d) => d.id !== id));
  };

  const save = async () => {
    if (!session) return;
    setSaving(true);
    const db = await getDb();
    await db.execute("DELETE FROM set_logs WHERE session_id = $1", [session.id]);
    for (const d of drafts) {
      await db.execute(
        `INSERT INTO set_logs
          (session_id, exercise_id, set_index, reps, weight_kg, rpe, is_warmup, is_pr, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)`,
        [
          session.id,
          d.exercise_id,
          d.set_index,
          d.reps,
          d.weight_kg,
          d.rpe,
          d.is_warmup ? 1 : 0,
          d.notes,
        ]
      );
    }
    setSavedAt(new Date());
    setSaving(false);
  };

  const grouped = (() => {
    const m = new Map<number, DraftSet[]>();
    for (const d of drafts) {
      if (!m.has(d.exercise_id)) m.set(d.exercise_id, []);
      m.get(d.exercise_id)!.push(d);
    }
    return Array.from(m.entries());
  })();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">训练日志</h1>
          <p className="text-sm text-muted-foreground">
            {session?.name} · {session?.date}
            {savedAt && (
              <span className="ml-2 text-primary">已保存 {format(savedAt, "HH:mm:ss")}</span>
            )}
          </p>
        </div>
        <Button onClick={save} disabled={saving || drafts.length === 0}>
          <Save className="w-4 h-4" />
          {saving ? "保存中..." : "保存训练"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {grouped.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                还没有记录。从右侧选个动作开始吧。
              </CardContent>
            </Card>
          )}

          {grouped.map(([exId, sets]) => {
            const ex = exercises.find((e) => e.id === exId)!;
            return (
              <Card key={exId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{ex.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ex.primary_muscle} · {ex.equipment}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveExercise(ex);
                      }}
                    >
                      <Plus className="w-4 h-4" /> 加组
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                      <div className="col-span-1">类型</div>
                      <div className="col-span-2">次数</div>
                      <div className="col-span-2">重量(kg)</div>
                      <div className="col-span-2">RPE</div>
                      <div className="col-span-2">估 1RM</div>
                      <div className="col-span-2">备注</div>
                      <div className="col-span-1"></div>
                    </div>
                    {sets
                      .sort((a, b) => a.set_index - b.set_index)
                      .map((s) => {
                        const oneRm = estimateOneRm(s.weight_kg, s.reps);
                        return (
                          <div
                            key={s.id}
                            className="grid grid-cols-12 gap-2 items-center"
                          >
                            <div className="col-span-1">
                              <button
                                onClick={() => updateDraft(s.id, { is_warmup: !s.is_warmup })}
                                className={`text-xs px-2 py-1 rounded w-full ${
                                  s.is_warmup
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {s.is_warmup ? "热" : "工"}
                              </button>
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                value={s.reps}
                                onChange={(e) =>
                                  updateDraft(s.id, { reps: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.5"
                                value={s.weight_kg}
                                onChange={(e) =>
                                  updateDraft(s.id, { weight_kg: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                placeholder="6-10"
                                value={s.rpe ?? ""}
                                onChange={(e) =>
                                  updateDraft(s.id, {
                                    rpe: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                              />
                            </div>
                            <div className="col-span-2 text-sm font-medium">
                              {oneRm.toFixed(1)}
                            </div>
                            <div className="col-span-2">
                              <Input
                                placeholder="..."
                                value={s.notes}
                                onChange={(e) => updateDraft(s.id, { notes: e.target.value })}
                              />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeSet(s.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">添加动作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="搜索动作..."
                value={exerciseFilter}
                onChange={(e) => setExerciseFilter(e.target.value)}
              />
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filtered.slice(0, 30).map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm"
                  >
                    <div className="font-medium">{ex.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ex.primary_muscle} · {ex.equipment}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {recent.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">最近训练</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {recent.map(({ session: s, sets }) => (
                  <div key={s.id} className="border-b last:border-0 pb-2 last:pb-0">
                    <div className="font-medium">{s.date}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Set(sets.map((set) => set.exercise_name)).size} 个动作 ·{" "}
                      {sets.filter((s) => !s.is_warmup).length} 个工作组
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
