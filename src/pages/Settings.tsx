import { useEffect, useState } from "react";
import { Save, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getApiConfig, saveApiConfig, chat } from "@/lib/apiClient";
import { getDb } from "@/lib/db";
import { CORE_EXERCISES } from "@/data/exercises";
import type { Exercise } from "@/types";

export function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [exCount, setExCount] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    (async () => {
      const cfg = await getApiConfig();
      if (cfg) {
        setBaseUrl(cfg.base_url ?? baseUrl);
        setApiKey(cfg.api_key ?? "");
        setModel(cfg.model ?? model);
      }
      const db = await getDb();
      const rows = await db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM exercises");
      setExCount(rows[0]?.c ?? 0);
    })();
  }, []);

  const onSave = async () => {
    await saveApiConfig({ base_url: baseUrl, api_key: apiKey, model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await saveApiConfig({ base_url: baseUrl, api_key: apiKey, model });
      const reply = await chat({
        messages: [
          { role: "system", content: "你是测试助手。" },
          { role: "user", content: "回复一个 'ok' 即可。" },
        ],
        maxTokens: 50,
      });
      setTestResult(`✅ 成功：${reply.slice(0, 80)}`);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setTestResult(`❌ 失败：${err}`);
    } finally {
      setTesting(false);
    }
  };

  const seedExercises = async () => {
    setSeeding(true);
    const db = await getDb();
    const existing = await db.select<Exercise[]>("SELECT * FROM exercises");
    const existingNames = new Set(existing.map((e) => e.name));
    let added = 0;
    for (const ex of CORE_EXERCISES) {
      if (existingNames.has(ex.name)) continue;
      await db.execute(
        `INSERT INTO exercises (name, category, primary_muscle, secondary_muscles, equipment, pattern, demo_url, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          ex.name,
          ex.category,
          ex.primary_muscle,
          ex.secondary_muscles,
          ex.equipment,
          ex.pattern,
          ex.demo_url,
          ex.notes,
        ]
      );
      added++;
    }
    const rows = await db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM exercises");
    setExCount(rows[0]?.c ?? 0);
    setSeeding(false);
    setTestResult(added > 0 ? `✅ 新增 ${added} 个动作` : "动作库已完整");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold mb-2">设置</h1>

      <Card>
        <CardHeader>
          <CardTitle>AI API 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            支持任何 OpenAI 兼容协议的 API（OpenAI、DeepSeek、OpenRouter、自部署 vLLM 等）。
            密钥仅存于本地 SQLite。
          </p>
          <div>
            <Label>Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div>
            <Label>Model</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave}>
              {saved ? (
                <>
                  <Check className="w-4 h-4" /> 已保存
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> 保存
                </>
              )}
            </Button>
            <Button onClick={test} variant="outline" disabled={testing || !apiKey}>
              {testing ? "测试中..." : "测试连接"}
            </Button>
          </div>
          {testResult && (
            <p className="text-sm bg-muted p-2 rounded">{testResult}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>动作库</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            数据库中已有 {exCount ?? 0} 个动作。{exCount === 0 && "首次使用需要初始化。"}
          </p>
          <Button onClick={seedExercises} disabled={seeding}>
            {seeding ? "导入中..." : "导入 50 个核心动作"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关于</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Agent Fitness v0.1.0</p>
          <p>本地优先 · 数据存于 SQLite</p>
          <p>技术栈：Tauri + React + TypeScript + SQLite</p>
        </CardContent>
      </Card>
    </div>
  );
}
