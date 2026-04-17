# React 项目 AI 辅助提交规范 (Claude Code)

> 本文件用于指导 Claude Code 在 React 项目中完成标准化的代码提交流程。
> 技术栈: React + TypeScript + Vite + npm

---

## 核心约束

- **禁止自动执行:** 每个阶段完成后必须向用户确认,再进入下一阶段
- **禁止修改暂存区:** 流程启动后严禁执行 `git add` / `git rm`
- **禁止提交配置文件:** `vite.config.*`、`.env*`、`package-lock.json` 不得出现在提交中
- **提交信息语言:** 使用中文

---

## 前置检查 (必须全部通过)

在执行任何 git 操作前,按顺序运行以下检查:

```bash
# 1. TypeScript 类型检查
npx tsc --noEmit

# 2. ESLint 检查
npx eslint . --ext .ts,.tsx --max-warnings 0

# 3. 构建验证 (确保生产构建不报错)
npm run build
```

**任一检查失败 → 停止流程,报告错误,等待用户修复后重新触发。**

---

## 标准执行流程

### Phase 1 — 读取暂存区

```bash
git status --short
git diff --cached
```

总结本次变更涉及的组件、Hook、类型、页面范围,以及实现了什么功能或修复了什么问题。向用户展示摘要并确认。

---

### Phase 2 — 创建 GitHub Issue

```bash
gh issue create \
  --title "<类型>(<范围>): <描述>" \
  --body "$(cat <<'EOF'
## 背景
<!-- 为什么需要这个变更 -->

## 需求描述
<!-- 具体实现什么 -->

## 技术方案
<!-- 关键组件、Hook、状态管理思路 -->

## 验收标准
- [ ] 功能正常运行
- [ ] TypeScript 无类型错误
- [ ] ESLint 无警告
- [ ] 构建成功

## 相关资源
<!-- 设计稿、接口文档等 -->
EOF
)" \
  --label "type/feature,priority/P2"
```

> Issue 标题格式见下方 [提交信息规范](#提交信息规范)

---

### Phase 3 — 创建特性分支

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-#<issue-number>
```

分支命名格式: `<type>/<short-desc>-#<issue>` (见 [分支命名规范](#分支命名规范))

---

### Phase 4 — 提交变更

```bash
git commit
```

提交信息严格遵循 [提交信息规范](#提交信息规范)。

**提交粒度原则:**
- 组件重构与新功能必须分开提交
- 类型定义变更可与实现合并提交,但需在 Body 中说明
- 样式调整 (CSS/Tailwind) 与逻辑分离提交
- 每个 commit 必须能独立通过 `tsc --noEmit` 和 `eslint`

---

### Phase 5 — 推送并创建 PR

```bash
git push -u origin <branch-name>

gh pr create \
  --title "<与 Issue 一致的标题>" \
  --body "$(cat <<'EOF'
## 变更说明
<!-- 做了什么改动 -->

## 影响范围
- 组件: 
- 路由: 
- 状态: 

## 测试说明
- [ ] 本地开发环境验证
- [ ] TypeScript 类型检查通过
- [ ] ESLint 检查通过
- [ ] `npm run build` 构建成功
- [ ] 主流浏览器兼容性验证

## 关联 Issue
Closes #<issue-number>
EOF
)" \
  --label "type/feature,priority/P2"
```

---

### Phase 6 — 代码审查

**审查重点 (React/TypeScript 专项):**

- [ ] 组件 Props 类型定义完整,无 `any`
- [ ] 自定义 Hook 职责单一,命名以 `use` 开头
- [ ] 副作用 (`useEffect`) 依赖数组正确
- [ ] 异步操作有错误边界处理
- [ ] 无内存泄漏 (事件监听、定时器已清理)
- [ ] Key prop 使用稳定唯一值,非数组 index
- [ ] 敏感信息未硬编码在组件中

---

### Phase 7 — 合并

**合并前清单:**
- [ ] CI 全部通过
- [ ] 至少 1 名审查者批准
- [ ] 无未解决的 Review 评论
- [ ] 分支基于最新 main

**合并策略:** 优先使用 `Squash and Merge` 保持 main 历史整洁

---

## 分支命名规范

**格式:** `<type>/<short-desc>-#<issue>`

| 类型 | 说明 |
|------|------|
| `feat` | 新功能、新页面、新组件 |
| `fix` | Bug 修复 |
| `refactor` | 组件/Hook 重构 |
| `style` | 样式调整 |
| `perf` | 性能优化 |
| `docs` | 文档更新 |
| `chore` | 构建配置、依赖升级 |
| `test` | 测试相关 |

**示例:**
- `feat/user-profile-page-#101`
- `fix/form-validation-#202`
- `refactor/auth-hook-#303`
- `chore/upgrade-vite5-#404`

---

## 提交信息规范

遵循 **Conventional Commits**,提交信息使用**中文**。

```
<类型>(<范围>): <主题>

[可选正文]

[可选页脚]
```

**范围建议 (React 项目):**

| 场景 | 范围示例 |
|------|---------|
| 页面组件 | `pages.login`, `pages.dashboard` |
| 公共组件 | `components.button`, `components.modal` |
| 自定义 Hook | `hooks.useAuth`, `hooks.useFetch` |
| 状态管理 | `store.user`, `store.cart` |
| 路由 | `router` |
| API 层 | `api.user`, `api.order` |
| 工具函数 | `utils.format`, `utils.validator` |
| 构建配置 | `vite`, `tsconfig` |

---

### 提交示例

**新增页面组件:**
```
feat(pages.dashboard): 添加数据看板页面

- 实现 DashboardPage 主布局组件
- 添加 useStatistics 自定义 Hook 封装数据获取逻辑
- 使用 Recharts 渲染折线图和饼图
- 接入 /api/statistics 接口,含加载态和错误态处理
- TypeScript 类型覆盖率 100%

Closes #101
```

**修复 Hook 问题:**
```
fix(hooks.useAuth): 修复登出后 token 未清理导致的鉴权异常

问题: 调用 logout() 后 localStorage 中 token 未同步清除,
      刷新页面仍保持登录态

修复:
- 在 logout 方法中补充 localStorage.removeItem('token')
- 添加 useEffect 清理函数防止组件卸载后的状态更新
- 补充异常路径单元测试

影响范围: 所有依赖 useAuth 的页面
Closes #202
```

**重构组件:**
```
refactor(components.form): 重构表单组件提升复用性

- 将 LoginForm / RegisterForm 公共逻辑提取为 useFormValidation Hook
- 使用泛型约束表单字段类型,消除 any
- 统一错误提示展示逻辑
- 拆分前后文件行数: 320 → 180 + 90 (Hook)

BREAKING CHANGE: FormProps.onSubmit 回调签名变更为
  (values: T, helpers: FormHelpers) => Promise<void>

Refs #303
```

**依赖升级:**
```
chore(vite): 升级 Vite 至 v5.2.0

- 升级 vite: 4.5.0 → 5.2.0
- 升级 @vitejs/plugin-react: 4.0.0 → 4.3.0
- 更新 vite.config.ts 以适配 v5 API 变更
- 验证构建产物与升级前一致

Refs #404
```

---

## GitHub Labels 规范

### 优先级
| Label | 说明 |
|-------|------|
| `priority/P0` 🔥 | 线上崩溃、白屏,立即处理 |
| `priority/P1` 🔴 | 核心功能阻塞,本迭代必须完成 |
| `priority/P2` 🔵 | 正常排期 |
| `priority/P3` 🟢 | 可延后 |

### 状态
| Label | 说明 |
|-------|------|
| `status/triage` | 待评估 |
| `status/planned` | 已排期 |
| `status/in-progress` | 开发中 |
| `status/in-review` | Review 中 |
| `status/blocked` | 阻塞 |
| `status/done` | 已完成 |

### 类型
| Label | 说明 |
|-------|------|
| `type/feature` ✨ | 新功能 |
| `type/bug` 🐛 | Bug 修复 |
| `type/refactor` ♻️ | 重构 |
| `type/perf` ⚡ | 性能优化 |
| `type/style` 🎨 | 样式调整 |
| `type/chore` 🔧 | 构建/依赖 |
| `type/docs` 📝 | 文档 |

### 前端领域
| Label | 说明 |
|-------|------|
| `domain/ui` | UI 组件 |
| `domain/routing` | 路由相关 |
| `domain/state` | 状态管理 |
| `domain/api` | 接口层 |
| `domain/auth` | 鉴权相关 |
| `domain/perf` | 性能相关 |
| `domain/a11y` | 无障碍访问 |

---

## React/TypeScript 代码审查清单

### 类型安全
- [ ] 无裸 `any`,必要时用 `unknown` + 类型守卫
- [ ] Props 接口命名为 `<ComponentName>Props`
- [ ] 事件处理函数类型正确 (`React.ChangeEvent<HTMLInputElement>` 等)
- [ ] 异步函数返回 `Promise<T>` 而非 `Promise<any>`

### 组件设计
- [ ] 单一职责,单个组件不超过 200 行
- [ ] 纯展示组件与容器组件分离
- [ ] 避免 Props 层级超过 3 层 (考虑 Context 或状态提升)
- [ ] memo/useMemo/useCallback 使用合理,无过度优化

### 副作用
- [ ] `useEffect` 依赖数组完整
- [ ] 异步 effect 有取消/清理机制
- [ ] 定时器、事件监听在 cleanup 函数中清除

### 性能
- [ ] 大列表使用虚拟化 (react-window 等)
- [ ] 图片资源有懒加载
- [ ] 代码分割: 路由级别使用 `React.lazy`

### 安全
- [ ] 无 `dangerouslySetInnerHTML` 使用不受信任的内容
- [ ] 用户输入有转义处理
- [ ] 敏感 token 不存储于 localStorage (考虑 httpOnly cookie)

---

## 常见问题

**Q: TSC 报错但逻辑正确,可以跳过类型检查吗?**

A: 不可以。类型错误必须修复,使用 `// @ts-expect-error` 加注释说明原因作为临时方案,严禁使用 `// @ts-ignore`。

**Q: ESLint 规则太严格影响开发效率?**

A: 可在行级别禁用 `// eslint-disable-next-line rule-name`,并在 PR 中说明原因。大范围禁用需通过团队评审修改 `.eslintrc`。

**Q: vite.config.ts 需要改动怎么处理?**

A: 构建配置变更单独开 `chore/xxx` 分支提交,不与功能开发混合。配置文件本身可以提交,但 `.env.local`、`.env.production` 等环境文件严禁提交。

**Q: 组件拆分导致一次改动文件很多,怎么组织提交?**

A: 按以下顺序拆分提交:
1. `refactor`: 提取公共类型/接口
2. `refactor`: 拆分子组件
3. `feat`: 在重构基础上添加新功能
4. `docs`: 更新相关文档

---

## 附录: 推荐工具配置

### package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "preview": "vite preview"
  }
}
```

### .husky/pre-commit (Git Hook)

```bash
#!/bin/bash
echo "🔍 Running pre-commit checks..."

# TypeScript 类型检查
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Please fix before committing."
  exit 1
fi

# ESLint 检查
npx eslint . --ext .ts,.tsx --max-warnings 0
if [ $? -ne 0 ]; then
  echo "❌ ESLint violations found. Please fix before committing."
  exit 1
fi

echo "✅ All checks passed!"
exit 0
```

### commitlint.config.js

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'refactor', 'perf',
      'style', 'test', 'docs', 'chore', 'revert'
    ]],
    'subject-max-length': [2, 'always', 72],
  }
}
```

---

**文档版本:** v1.0
**适用技术栈:** React 18+ / TypeScript 5+ / Vite 5+ / npm
**最后更新:** 2026-04-15
