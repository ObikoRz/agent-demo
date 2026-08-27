import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getDb } from "@/lib/db";
import { estimateOneRm } from "@/lib/oneRm";
import type { Exercise, SetLog, WorkoutSession } from "@/types";

interface ProgressPoint {
  date: string;
  [exercise: string]: number | string;
}

export function ProgressPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [data, setData] = useState<ProgressPoint[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const exs = await db.select<Exercise[]>(
        "SELECT * FROM exercises WHERE category = 'compound' ORDER BY name"
      );
      setExercises(exs);
      // Default: top 4 compound lifts
      const preferred = ["Back Squat", "Barbell Bench Press", "Conventional Deadlift", "Overhead Press"];
      const defaults = preferred
        .map((n) => exs.find((e) => e.name === n)?.id)
        .filter((id): id is number => id !== undefined);
      setSelectedIds(defaults);
    })();
  }, []);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setData([]);
      return;
    }
    (async () => {
      const db = await getDb();
      const placeholders = selectedIds.map((_, i) => `$${i + 1}`).join(",");
      const sets = await db.select<(SetLog & { exercise_name: string; date: string })[]>(
        `SELECT s.*, e.name as exercise_name, ws.date
         FROM set_logs s
         JOIN exercises e ON e.id = s.exercise_id
         JOIN workout_sessions ws ON ws.id = s.session_id
         WHERE s.is_warmup = 0 AND s.exercise_id IN (${placeholders})
         ORDER BY ws.date, s.id`,
        selectedIds
      );

      // Group by date, take top estimated 1RM per exercise per date
      const dateMap = new Map<string, Map<string, number>>();
      for (const s of sets) {
        if (!dateMap.has(s.date)) dateMap.set(s.date, new Map());
        const e1rm = estimateOneRm(s.weight_kg, s.reps);
        const m = dateMap.get(s.date)!;
        const prev = m.get(s.exercise_name) ?? 0;
        if (e1rm > prev) m.set(s.exercise_name, e1rm);
      }
      const points: ProgressPoint[] = [];
      const sortedDates = Array.from(dateMap.keys()).sort();
      for (const date of sortedDates) {
        const point: ProgressPoint = { date };
        for (const [exName, val] of dateMap.get(date)!) {
          point[exName] = Math.round(val * 10) / 10;
        }
        points.push(point);
      }
      setData(points);
    })();
  }, [selectedIds]);

  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const toggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-6)
    );
  };

  const selectedExercises = exercises.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">进度追踪</h1>
      <p className="text-sm text-muted-foreground mb-6">
        估算 1RM 趋势 - 多公式平均
      </p>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">选择追踪的动作（最多 6 个）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => toggle(ex.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedIds.includes(ex.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {ex.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            还没有训练数据。先去记几组训练吧。
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>1RM 趋势 (kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                  }}
                />
                <Legend />
                {selectedExercises.map((ex, i) => (
                  <Line
                    key={ex.id}
                    type="monotone"
                    dataKey={ex.name}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
