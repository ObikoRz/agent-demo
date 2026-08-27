# Agent Fitness 🏋️

本地优先的 AI 健身教练：训练日志 + 周期化 + AI 对话教练。

## 特性

- **训练日志**：记组数 × 次数 × 重量 × RPE，自动估算 1RM
- **5/3/1 周期化**：基于 Jim Wendler 方法，4 周一轮，自动 TM 增长
- **进度追踪**：1RM 趋势图，多动作对比
- **AI 教练**：基于你的训练历史对话，问计划、问技术、问伤病
- **本地优先**：所有数据在本地 SQLite，可备份可导出
- **API 自由**：支持任意 OpenAI 兼容协议的 API（OpenAI、DeepSeek、OpenRouter、自部署 vLLM 等）

## 技术栈

- **Tauri 2.x** - 跨平台桌面壳（Windows / macOS / Linux）
- **React 18 + TypeScript + Vite**
- **SQLite** (via tauri-plugin-sql)
- **Recharts** - 图表
- **Tailwind CSS** - 样式

## 快速开始

### 前置要求

- **Node.js** 18+
- **Rust** 1.77+ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- 系统依赖：
  - **macOS**: `xcode-select --install`
  - **Windows**: Microsoft Visual Studio C++ Build Tools + WebView2
  - **Linux**: `webkit2gtk-4.1` 和 `libssl-dev` 等（见 Tauri 文档）

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 开发模式
npm run tauri:dev

# 3. 构建发布版
npm run tauri:build
```

### 首次使用

1. 启动应用后，进入 **设置** 页
2. 点击 **导入 50 个核心动作**（只需一次）
3. 配置你的 API：填入 Base URL、API Key、Model 名
4. 点击 **测试连接** 确认
5. 开始记训练

## 项目结构

```
src/
  components/ui/      # 基础 UI 组件（Button, Input, Card...）
  data/exercises.ts   # 50 个核心动作数据
  lib/
    db.ts            # SQLite 客户端
    oneRm.ts         # 1RM 计算公式
    periodization.ts # 5/3/1 引擎
    apiClient.ts     # OpenAI 兼容 API 客户端
  pages/
    Log.tsx          # 训练日志
    Plans.tsx        # 计划生成
    Progress.tsx     # 进度追踪
    Coach.tsx        # AI 教练对话
    Settings.tsx     # 设置
  types/             # TypeScript 类型
src-tauri/
  src/lib.rs         # Tauri 入口 + SQL migration
  tauri.conf.json    # Tauri 配置
```

## 数据备份

数据库文件在系统应用数据目录下，文件名 `agent_fitness.db`：

- macOS: `~/Library/Application Support/com.agentfitness.app/`
- Windows: `%APPDATA%/com.agentfitness.app/`
- Linux: `~/.local/share/com.agentfitness.app/`

直接复制这个文件即可备份和迁移。

## 路线图

- [x] Phase 1: 训练日志 + 1RM 计算
- [x] Phase 1: 5/3/1 周期化模板
- [x] Phase 1: 进度趋势图
- [x] Phase 2: AI 教练对话
- [x] Phase 2: 计划生成器
- [ ] Phase 3: 多模板计划（Starting Strength、Push/Pull/Legs）
- [ ] Phase 3: 动作视频/图片占位
- [ ] Phase 3: 训练量与疲劳管理（ACWR）
- [ ] Phase 4: 体重/睡眠/营养追踪
- [ ] Phase 4: 多用户支持

## License

MIT
