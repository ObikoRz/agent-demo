import { useEffect, useRef, useState } from "react";
import { Send, Bot, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { getDb } from "@/lib/db";
import { chat, type ChatMessage } from "@/lib/apiClient";
import type { Exercise, SetLog, WorkoutSession } from "@/types";
import { format } from "date-fns";

interface ChatItem {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const SYSTEM_PROMPT = `你是一位严谨的私人健身教练，名字叫 Agent Coach。
你的专长是力量训练、增肌减脂、训练周期化、动作技术分析、训练量管理、疲劳恢复和伤病预防。
回答时遵循以下原则：
1. 引用相关训练科学概念（如渐进超负荷、RPE、训练量、ACWR 急慢性负荷比等）时简短解释。
2. 涉及伤病、关节疼痛、术后恢复时，先建议看专业医生/物理治疗师，不要自己下诊断。
3. 数字要具体——给重量、组数、次数、RPE 区间，不要模糊。
4. 回答简洁、结构化，必要时用列表/表格。
5. 用户是中文交流，请用中文回答。
6. 不要使用 markdown 标题符号（#），用粗体和列表即可。
`;

export function CoachPage() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextPreview, setContextPreview] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const recentSets = await db.select<(SetLog & { exercise_name: string; date: string })[]>(
        `SELECT s.*, e.name as exercise_name, ws.date
         FROM set_logs s
         JOIN exercises e ON e.id = s.exercise_id
         JOIN workout_sessions ws ON ws.id = s.session_id
         WHERE s.is_warmup = 0
         ORDER BY ws.date DESC, s.id DESC
         LIMIT 30`
      );
      if (recentSets.length === 0) {
        setContextPreview("（用户还没有训练数据）");
        return;
      }
      const exList = await db.select<Exercise[]>("SELECT name, primary_muscle, equipment FROM exercises LIMIT 50");
      const summary = buildContextSummary(recentSets, exList);
      setContextPreview(summary);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatItem = { role: "user", content: text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const apiMessages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: `以下是用户的最近训练上下文（仅供参考，回答时如果用户问的是新问题可以忽略）：\n${contextPreview}`,
        },
        ...next.map((m) => ({ role: m.role, content: m.content })),
      ];
      const reply = await chat({ messages: apiMessages });
      setMessages([...next, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `⚠️ 出错了：${err}\n\n请检查 设置 页的 API 配置。`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-screen flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          AI 教练
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          基于你的训练历史回答问题。配置 API 见 设置。
        </p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-3">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                试试问我：<br />
                "今天练背，给我出 5 个动作"<br />
                "我深蹲卡 100kg 怎么办"<br />
                "我现在一周 4 练，怎么安排"
              </CardContent>
            </Card>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border"
                }`}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border rounded-lg px-4 py-2.5 text-sm text-muted-foreground">
                思考中...
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="问点什么..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function buildContextSummary(
  recentSets: (SetLog & { exercise_name: string; date: string })[],
  exList: Exercise[]
): string {
  const grouped = new Map<string, { date: string; sets: typeof recentSets }>();
  for (const s of recentSets) {
    const key = s.date;
    if (!grouped.has(key)) grouped.set(key, { date: s.date, sets: [] });
    grouped.get(key)!.sets.push(s);
  }

  const lines: string[] = [];
  lines.push(`可用动作库（${exList.length} 个）: ${exList.map((e) => e.name).join(", ")}`);
  lines.push("");
  lines.push("最近训练（按日期）:");

  for (const { date, sets } of grouped.values()) {
    const exMap = new Map<string, { reps: number; weight: number }[]>();
    for (const s of sets) {
      if (!exMap.has(s.exercise_name)) exMap.set(s.exercise_name, []);
      exMap.get(s.exercise_name)!.push({ reps: s.reps, weight: s.weight_kg });
    }
    lines.push(`- ${date}:`);
    for (const [name, arr] of exMap) {
      const top = arr.reduce((m, x) => (x.weight > m.weight ? x : m), arr[0]);
      lines.push(`    ${name}: ${arr.length} 组, top ${top.reps}×${top.weight}kg`);
    }
  }
  return lines.join("\n");
}
