# Skill: React 项目代码提交辅助

## 触发条件

当用户说出以下意图时激活本 Skill:
- "帮我提交代码"
- "走提交流程"
- "创建 PR"
- "提交这次变更"
- 或描述了某个刚完成的功能/修复

---

## 技术栈上下文

- **框架:** React 18+ / TypeScript 5+
- **构建工具:** Vite + npm
- **代码检查:** TypeScript (`tsc`) + ESLint
- **版本控制:** Git + GitHub (`gh` CLI)

---

## 执行步骤

### Step 0 — 前置质量检查

**按顺序执行,任一失败立即停止:**

```bash
npx tsc --noEmit           # TypeScript 类型检查
npx eslint . --ext .ts,.tsx --max-warnings 0  # ESLint
npm run build              # 生产构建验证
```

向用户报告检查结果。全部通过后询问是否继续。

---

### Step 1 — 读取暂存区

```bash
git status --short
git diff --cached
```

**输出摘要,内容包括:**
- 涉及的文件列表(按组件/Hook/类型/配置分类)
- 本次变更的功能描述(1-3 句话)
- 推断出的提交类型和范围

询问用户: "以上摘要是否准确?是否需要调整?"

---

### Step 2 — 创建 Issue

根据摘要生成 Issue 内容并执行:

```bash
gh issue create \
  --title "<类型>(<范围>): <描述>" \
  --body "<生成的 Issue 正文>" \
  --label "type/<type>,priority/<level>"
```

**Issue 正文模板:**

```markdown
## 背景
[根据 diff 推断的变更动机]

## 需求描述
[具体实现内容]

## 技术方案
[涉及的组件、Hook、状态设计]

## 验收标准
- [ ] 功能正常运行
- [ ] TypeScript 无类型错误
- [ ] ESLint 无警告
- [ ] 构建成功

## 相关资源
[如有设计稿或接口文档链接]
```

记录返回的 Issue 编号 `#N`。

---

### Step 3 — 创建分支

```bash
git checkout main && git pull origin main
git checkout -b <type>/<short-desc>-#<N>
```

**分支命名规则:**

| 类型 | 场景 |
|------|------|
| `feat` | 新组件、新页面、新功能 |
| `fix` | Bug 修复 |
| `refactor` | 组件/Hook 重构 |
| `style` | 纯样式调整 |
| `perf` | 性能优化 |
| `chore` | 依赖升级、构建配置 |
| `docs` | 文档更新 |

---

### Step 4 — 生成并执行提交

生成符合规范的 Commit Message,展示给用户确认后执行:

```bash
git commit -m "<type>(<scope>): <subject>

<body>

<footer>"
```

**提交信息规则:**

- 语言: **中文**
- 格式: Conventional Commits
- 主题: 不超过 50 字,动词开头
- 范围参考:

| 文件位置 | 范围写法 |
|---------|---------|
| `src/pages/Login.tsx` | `pages.login` |
| `src/components/Button.tsx` | `components.button` |
| `src/hooks/useAuth.ts` | `hooks.useAuth` |
| `src/store/userSlice.ts` | `store.user` |
| `src/api/userApi.ts` | `api.user` |
| `src/utils/format.ts` | `utils.format` |
| `vite.config.ts` | `vite` |

---

### Step 5 — 推送并创建 PR

```bash
git push -u origin <branch-name>

gh pr create \
  --title "<同 Issue 标题>" \
  --body "<生成的 PR 正文>" \
  --label "type/<type>,priority/<level>"
```

**PR 正文模板:**

```markdown
## 变更说明
[做了什么]

## 影响范围
- 组件: 
- 路由: 
- 状态: 

## 测试说明
- [ ] 本地开发环境验证
- [ ] TypeScript 类型检查通过 (`tsc --noEmit`)
- [ ] ESLint 检查通过
- [ ] `npm run build` 构建成功

## 关联 Issue
Closes #<N>
```

---

## 示例输出

### 示例 A — 新增 Hook

```
feat(hooks.useAuth): 添加 JWT 鉴权 Hook

- 封装 token 存储与读取逻辑
- 提供 login / logout / isAuthenticated 方法
- 使用 useCallback 避免子组件不必要重渲染
- TypeScript 泛型支持自定义用户信息类型

Closes #88
```

### 示例 B — 修复组件 Bug

```
fix(components.table): 修复数据为空时表格崩溃问题

问题: data prop 传入空数组时 .map() 前未判空,导致运行时报错

修复:
- 添加 data?.length 空值守卫
- 补充空状态 EmptyState 占位组件
- 添加 undefined / null / [] 三种边界条件测试

Closes #112
```

### 示例 C — 重构

```
refactor(pages.dashboard): 拆分看板页面降低组件复杂度

- 将 DashboardPage (380 行) 拆分为 3 个子组件
- 提取 useStatistics Hook 管理数据获取副作用
- 消除 Props drilling,改用 DashboardContext
- 无功能变更,通过原有快照测试

Refs #156
```

---

## 禁止事项

- ❌ 不得提交 `.env*` 文件
- ❌ 不得提交 `package-lock.json`(团队统一用 npm,但 lockfile 由 CI 管理时除外)
- ❌ 不得在提交信息中使用 `fix bug` / `update` 等模糊描述
- ❌ TypeScript 类型检查失败时不得强行提交
- ❌ 不得使用 `// @ts-ignore`(应使用 `// @ts-expect-error` 并附说明)
- ❌ 功能开发与重构不得混在同一个 commit

---

## 快速诊断

| 现象 | 处理方式 |
|------|---------|
| `tsc` 报 `TS2345` 类型不匹配 | 修正类型定义或添加类型守卫 |
| ESLint `react-hooks/exhaustive-deps` | 补全 useEffect 依赖数组 |
| `npm run build` Rollup chunk 过大 | 添加路由级 `React.lazy` 分割 |
| `gh` 命令找不到 | 运行 `npm install -g @github/cli` |
| 分支落后 main 太多 | `git rebase main` 后 `git push --force-with-lease` |

---

**Skill 版本:** v1.0
**适用范围:** React 18+ / TypeScript 5+ / Vite / npm / GitHub
**最后更新:** 2026-04-15
