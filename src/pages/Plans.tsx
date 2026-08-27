import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { generateFiveThreeOne, progressFiveThreeOne, type FiveThreeOneConfig } from "@/lib/periodization";
import { Download } from "lucide-react";

export function PlansPage() {
  const [cfg, setCfg] = useState<FiveThreeOneConfig>({
    squat_tm: 140,
    bench_tm: 100,
    deadlift_tm: 180,
    ohp_tm: 60,
    unit: "kg",
  });
  const [weeks, setWeeks] = useState(4);
  const [generated, setGenerated] = useState<ReturnType<typeof generateFiveThreeOne> | null>(null);

  const generate = () => {
    setGenerated(generateFiveThreeOne(cfg, weeks));
  };

  const advance = () => {
    setCfg(progressFiveThreeOne(cfg));
    setGenerated(null);
  };

  const exportJson = () => {
    if (!generated) return;
    const blob = new Blob([JSON.stringify(generated, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `531-plan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">训练计划生成器</h1>
      <p className="text-sm text-muted-foreground mb-6">
        5/3/1 周期化模板 - 基于 Jim Wendler 方法
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">训练最大重量 (TM)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>深蹲 TM ({cfg.unit})</Label>
              <Input
                type="number"
                step="2.5"
                value={cfg.squat_tm}
                onChange={(e) => setCfg({ ...cfg, squat_tm: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>卧推 TM</Label>
              <Input
                type="number"
                step="2.5"
                value={cfg.bench_tm}
                onChange={(e) => setCfg({ ...cfg, bench_tm: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>硬拉 TM</Label>
              <Input
                type="number"
                step="2.5"
                value={cfg.deadlift_tm}
                onChange={(e) => setCfg({ ...cfg, deadlift_tm: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>推举 TM</Label>
              <Input
                type="number"
                step="2.5"
                value={cfg.ohp_tm}
                onChange={(e) => setCfg({ ...cfg, ohp_tm: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">周期设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>周数</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={generate}>生成计划</Button>
              <Button onClick={advance} variant="outline">
                完成本周期，TM 增长
              </Button>
              {generated && (
                <Button onClick={exportJson} variant="ghost">
                  <Download className="w-4 h-4" /> 导出 JSON
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">5/3/1 说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>· TM = 训练最大重量 ≈ 真实 1RM 的 90%</p>
            <p>· 周 1: 3x5 @ 65/75/85%</p>
            <p>· 周 2: 3x3 @ 70/80/90%</p>
            <p>· 周 3: 5/3/1 @ 75/85/95%</p>
            <p>· 周 4: Deload 3x5 @ 40/50/60%</p>
            <p>· 每 4 周 TM 增加：上肢 +2.5kg / 下肢 +5kg</p>
          </CardContent>
        </Card>
      </div>

      {generated && (
        <Card>
          <CardHeader>
            <CardTitle>计划预览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">周</th>
                    <th className="text-left p-2">日</th>
                    <th className="text-left p-2">动作</th>
                    <th className="text-left p-2">组</th>
                    <th className="text-left p-2">次数</th>
                    <th className="text-left p-2">%TM</th>
                    <th className="text-left p-2">重量</th>
                    <th className="text-left p-2">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {generated.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2 font-medium">W{s.week}</td>
                      <td className="p-2">D{s.day}</td>
                      <td className="p-2 capitalize">{s.lift}</td>
                      <td className="p-2">{s.set_index}</td>
                      <td className="p-2">{s.reps}{s.is_amrap ? "+" : ""}</td>
                      <td className="p-2">{(s.percent * 100).toFixed(0)}%</td>
                      <td className="p-2 font-mono">{s.weight}</td>
                      <td className="p-2 text-xs text-muted-foreground">{s.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
