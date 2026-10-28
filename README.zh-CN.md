<div align="center">

  🇺🇸 **[English Version](README.md)** · 🇧🇷 **[Versão em Português](README.pt-BR.md)**
  <br>

  # 🏮 道禅中文学堂 (Portal Tao Ch'an Mandarim)

  ### **专为巴西中文学习者打造的沉浸式互动教学平台：融合视频课程、FSRS v4.5 间隔重复闪卡、声调词典、网页端语音对话模拟以及多题型在线评估系统。**

  [![在线演示](https://img.shields.io/badge/在线演示-mandarim.lucasresende.com-8a1818?style=for-the-badge&logo=cloudflare&logoColor=white)](https://mandarim.lucasresende.com)
  [![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=next.js&logoColor=white)](#)
  [![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](#)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_RLS-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](#)

  [🔗 **在线演示体验 (`mandarim.lucasresende.com`)**](https://mandarim.lucasresende.com) · [📖 **技术架构文档 (15章)**](DOCUMENTATION.md) · [🤖 **智能体软件工程 (Agentic Architecture)**](AGENTS.md)

</div>

---

## 📌 项目背景与解决的痛点

对于母语为葡萄牙语的初学者而言，学习中文面临着普通学习软件难以解决的教学与认知痛点。作者在**道禅寺**（*Templo Tao Ch'an*）担任中文教学志愿者期间，正值从**市场营销**转型并攻读**系统分析与开发（Fatec）**学位，在每周的实际教学中深刻体会到了师生面临的重重障碍：

### ⚠️ 核心教学与操作挑战
* **学习流程割裂：** 学生需要在 YouTube 录播课、Google Drive 课件 PDF、WhatsApp 语音作业群以及配置复杂的外部闪卡应用之间频繁切换。
* **声调与汉字认知门槛：** 缺乏汉语四声（及轻声）的可视化辅助和高频间隔复习，初学者容易迅速遗忘汉字笔画并混淆声调起伏（*mā, má, mǎ, mà*）。
* **口语表达畏难情绪：** 初学者往往因害羞不敢开口，在每周单次面授课之外缺乏结构化、有反馈的即时对话练习场景。
* **批改评估负担沉重：** 志愿者教师需要为数十名学生手工出题、逐一收听批改语音并给出反馈，耗费大量时间。

### 💡 解决方案
**道禅中文学堂**应运而生。它将整个学习闭环整合为一个**移动优先**的现代化 Web 平台：学生可以观看课程视频、查阅随课程进度解锁的声调词典、使用 **FSRS v4.5 算法**复习记忆卡、通过浏览器麦克风模拟真实对话，并完成互动单元考试；教师则可在专属的**老师工作台（Laoshi Panel）**中管理教学大纲、跟踪学生学情数据，并对口语及笔试作业进行综合批改。

---

## 🖼️ 平台功能展示与截图

### 1. 双角色极简免密演示登录 (`/login`)
专为作品集展示打造的极简登录页，提供一键以**学生身份**（*Aluno*）或**教师身份**（*Professor*）免登录体验完整系统，并包含直达 GitHub 源码的链接。

<div align="center">
  <img src="public/docs/screenshots/01-login-demo.png" alt="登录页面（学生与教师一键演示入口）" width="100%" />
</div>

### 2. 学生工作台 (`/dashboard`)
清晰呈现整体课程进度、**FSRS 连续打卡激励横幅（Study Streak）**、5大核心学习模块快捷入口，以及按周折叠的待学与已学视频课程堆栈。

<div align="center">
  <img src="public/docs/screenshots/02-student-dashboard.png" alt="学生仪表盘" width="100%" />
</div>

### 3. 智能声调词典 (`/dashboard/dicionario`)
词汇随着学生完课进度循序渐进解锁。每个词条均展示简体字与繁体字、**按声调严格配色的拼音**、真人音频发音、双语情境例句以及文化解析。

<div align="center">
  <img src="public/docs/screenshots/03-smart-dictionary.png" alt="智能声调词典" width="100%" />
</div>

### 4. FSRS v4.5 间隔重复闪卡系统 (`/dashboard/dicionario/srs`)
基于 `ts-fsrs`（自由间隔重复算法 v4.5）内核构建，具备每日学习队列分布（*新学、学习中、复习*）、类似 GitHub 风格的全年复习热力图，并支持汉字识记与葡中双向互测。

<div align="center">
  <img src="public/docs/screenshots/04-srs-flashcards.png" alt="FSRS 记忆卡与热力图" width="100%" />
</div>

### 5. 模拟对话训练器 (`/dashboard/simulador`)
采用类即时通讯界面的回合制对话练习：学生先听取对话方的中文语音，组织思路后通过浏览器 `MediaRecorder` API 录制自己的发音，并选择正确的中文回复推进剧情。

<div align="center">
  <img src="public/docs/screenshots/05-dialogue-simulator.png" alt="模拟对话训练器" width="100%" />
</div>

### 6. 多题型交互式单元评估引擎 (`/dashboard/atividades/[id]`)
全面支持 9 种评估题型，涵盖单选题、拼音拼写、词语拖拽排序（`@dnd-kit`）、汉字组句、听力理解、完形填空以及**在线口语录音作答**，并配备实时云端自动保存机制。

<div align="center">
  <img src="public/docs/screenshots/06-exam-engine.png" alt="多题型单元考试引擎" width="100%" />
</div>

### 7. 教师/老工管理中台 (`/admin`)
整合实时学情遥测（PostHog 集成）、全校核心 KPI 指标、学生近况动态流、操作审计日志以及 7 大教学管理模块的对称网格布局。

<div align="center">
  <img src="public/docs/screenshots/07-admin-dashboard.png" alt="教师管理面板" width="100%" />
</div>

### 8. 人机混合试卷批改系统 (`/admin/atividades/entregas/...`)
客观题在学生提交后自动完成判分，主观问答题与口语录音则自动列入待批队列，供教师在线听取、调节给分并撰写细致的辅导评语。

<div align="center">
  <img src="public/docs/screenshots/08-admin-exam-grading.png" alt="教师试卷批改界面" width="100%" />
</div>

---

## 🧠 智能体软件工程方法论 (Agentic Engineering)

在此向大家真诚说明我的背景：我此前拥有**市场营销**专业背景，在开发本项目时正处于**系统分析与开发（ADS）大专课程的起步阶段**。当时的我尚不具备从零手写 16 张数据表、React 19 全栈架构、PostgREST 模拟器和 FSRS 核心算法的传统编码经验。然而，道禅寺的学生们却有着真实、迫切的学习需求。

为了高质量、高标准地交付系统，我将自己定位为 **产品经理（Product Owner）、需求分析师、上下文架构师（Context Architect）与测试工程师（QA）**，系统性地运用了**智能体驱动软件工程（Agentic Software Engineering）**，构建了一套严格的架构护栏与确定性检验机制：

### 1. 结构化系统上下文 (`.agents/context/` & `DOCUMENTATION.md`)
在生成或重构代码前，AI 智能体必须加载严谨的系统知识库（[`AGENTS.md`](AGENTS.md)、[`.agents/context/system-map.md`](.agents/context/system-map.md) 以及 15 个技术专章），确保其在 PostgreSQL 数据库范式、行级安全（RLS）策略、React Query 缓存分层和麦克风硬件资源释放周期上保持绝对一致。

### 2. 领域专业技能分层 (`.agents/skills/`)
遵循 **三层递进公开（Progressive Disclosure）** 设计规范（`SKILL.md` → `references/` → `scripts/`），为智能体配置了 5 大专属技能包：
* **[`mandarin-exam-crafter`](.agents/skills/mandarin-exam-crafter/SKILL.md):** 强制执行 HSK 累积词汇白名单（杜绝试卷出现超纲生词）、声调拼音干扰项设计与 100 分制强校验。
* **[`mandarin-i18n`](.agents/skills/mandarin-i18n/SKILL.md):** 规范 Unicode NFC 字符标准化、拼音声调分词规则及中葡双语词条格式。
* **[`portal-frontend`](.agents/skills/portal-frontend/SKILL.md):** 规范 Next.js 16 App Router 服务端/客户端组件边界、Tailwind CSS v4 视觉令牌与 WCAG AA 无障碍标准。
* **[`portal-backend`](.agents/skills/portal-backend/SKILL.md):** 规范 Supabase PostgreSQL 迁移脚本、`is_admin()` 鉴权策略及 Storage 文件名防注入转义。
* **[`portal-refactor-guard`](.agents/skills/portal-refactor-guard/SKILL.md):** 跨 7 层系统架构（数据库、Actions、类型、组件、路由、样式、文档）进行影响面扫描与原子重构。

### 3. 确定性 Python 质量门禁 (`scripts/`)
由于大语言模型具备概率性，**工程验收必须依赖确定性验证**。每项技能均内嵌独立的 Python 自动化脚本：
* `validate_exam.py`: 检验试卷满分 100 分、9 大题型结构规范及汉字词汇白名单。
* `pinyin_auditor.py`: 扫描全库代码与数据中的非法声调组合及未规范化字符。
* `schema_validator.py`: 审计 SQL 迁移，检测无索引外键、缺失 RLS 的数据表及非法的 Storage 路径。
* `blast_radius_scanner.py`: 在任何重命名或模块重构前映射跨 7 层的依赖关系。
* `checklist.py`: 提交前的自动化总验收套件。

---

## 🧪 零后端沙盒架构 (Zero-Backend Sandbox)

为了严格保护生产环境中真实学生的个人隐私，同时允许面试官与同行直接体验完整的系统功能（包括数据库写入、口语录音、FSRS 复习调度及试卷批改），**无需搭建外部 Supabase 数据库**，本项目实现了一套**浏览器内 PostgREST 与 Auth 沙盒引擎** ([`lib/demo/supabaseSandbox.ts`](lib/demo/supabaseSandbox.ts))：

* **全局透明 `fetch` 拦截：** 在服务端组件（SSR）与客户端组件中，透明拦截针对 `*.supabase.co` 的 `/auth/v1`、`/rest/v1` 和 `/storage/v1` 请求。
* **TypeScript PostgREST 解析器：** 完整支持常用过滤语法（`eq`, `neq`, `in`, `not`, `or`, `ilike`）、关联查询（`select=*,aulas(titulo)`）、精确计数（`Prefer: count=exact`）、冲突更新（`upsert`）以及 RPC 调用。
* **本地状态持久化与即时身份切换：** 从 [`lib/demo/seedData.json`](lib/demo/seedData.json) 自动向 `localStorage` 灌入逼真的模拟教学数据，并通过右下角的 **ModoPortfólio** 工具栏随时一键在**学生模式（Maria Fernanda）**与**教师模式（Prof. Lucas）**之间热切换，或一键重置初始数据库状态。

---

## 🛠️ 技术选型栈

| 系统层级 | 核心技术与开发库 |
| :--- | :--- |
| **前端框架 & 界面** | [Next.js 16.4 (App Router)](https://nextjs.org/), [React 19.2](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **状态管理与数据缓存** | [TanStack React Query v5](https://tanstack.com/query/latest) (支持乐观 UI 更新与分层 `staleTime` 缓存策略) |
| **后端云服务 & 身份认证** | [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, Auth) + 本地零后端沙盒 |
| **间隔重复与交互手势** | [`ts-fsrs` v5 (FSRS v4.5 算法)](https://github.com/open-spaced-repetition/ts-fsrs), [`@dnd-kit`](https://dndkit.com/) (可访问触摸拖拽排序) |
| **富文本与音视频硬件** | [Tiptap Editor](https://tiptap.dev/), Web `MediaRecorder` / `MediaStream` API, [Framer Motion v12](https://motion.dev/) |
| **分析遥测与代码质量** | [PostHog](https://posthog.com/) (产品体验分析), Python 3.12 自动化确定性测试套件 |

---

## 🚀 本地开发与运行指南

得益于**零后端沙盒架构**，无需配置任何外部云数据库或 API 密钥，即可在本地直接运行完整的平台功能：

1. **克隆代码仓库并安装依赖：**
   ```bash
   git clone https://github.com/lucasresendev/portal-tao-chan-mandarim.git
   cd portal-tao-chan-mandarim
   npm install
   ```

2. **启动本地开发服务器（`.env.example` 默认已启用 Demo 模式）：**
   ```bash
   cp .env.example .env.local
   npm run dev
   ```

3. **在浏览器中访问 `http://localhost:3000`：**
   * 点击 **Aluno**：以学生身份体验视频课程、FSRS 记忆卡、对话模拟器及单元考试。
   * 点击 **Professor**（或使用右下角浮动工具条）：以老师身份巡检管理中台、学生学情与试卷批改。

4. **（可选）运行智能体 QA 质量校验套件：**
   ```bash
   python3 .agents/scripts/checklist.py .
   ```

---

## 📄 开源许可与署名说明 (License & Attribution)

本项目采用 **[PolyForm Noncommercial 1.0.0 许可证](LICENSE)** 授权发布。

* **允许范围：** 个人学习研读、学术科研、非营利性公益教学以及技术作品集评估。
* **商业限制：** 未经作者事先书面许可，严禁用于任何商业营利、付费服务、商业 SaaS 部署或转售行为。
* **创作者与系统架构师：** [Lucas Resende](https://github.com/lucasresendev)
* **署名指引：** 欢迎查阅 [ATTRIBUTION.md](ATTRIBUTION.md) 了解简要、友好的署名规范。

---

## 👤 作者信息

<div align="center">

  ### **Lucas Resende** (`@lucasresendev`)
  *软件开发者 / 系统分析与开发在读（Fatec Taubaté）*

  [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/lucasresendev)
  [![个人主页与技术博客](https://img.shields.io/badge/个人主页-0f4c80?style=for-the-badge&logo=astro&logoColor=white)](https://lucasresende.com)
  [![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/lucasresendev)

</div>
