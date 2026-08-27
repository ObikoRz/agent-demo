import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Dumbbell, ListChecks, Bot, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogPage } from "@/pages/Log";
import { PlansPage } from "@/pages/Plans";
import { CoachPage } from "@/pages/Coach";
import { ProgressPage } from "@/pages/Progress";
import { SettingsPage } from "@/pages/Settings";

const navItems = [
  { to: "/log", label: "训练日志", icon: Dumbbell },
  { to: "/plans", label: "训练计划", icon: ListChecks },
  { to: "/progress", label: "进度追踪", icon: TrendingUp },
  { to: "/coach", label: "AI 教练", icon: Bot },
  { to: "/settings", label: "设置", icon: Settings },
];

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-56 border-r bg-card flex flex-col">
        <div className="px-5 py-5 border-b">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Agent Fitness
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Local-first AI coach</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t text-xs text-muted-foreground">
          v0.1.0 · 本地优先
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/log" replace />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
