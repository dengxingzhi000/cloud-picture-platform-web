# CloudPicturePlatform Web - 云图片协作平台前端

<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/dengxingzhi000/cloud-picture-platform-web?style=flat-square&color=green)](https://github.com/dengxingzhi000/cloud-picture-platform-web)
[![GitHub Forks](https://img.shields.io/github/forks/dengxingzhi000/cloud-picture-platform-web?style=flat-square&color=blue)](https://github.com/dengxingzhi000/cloud-picture-platform-web)
[![License](https://img.shields.io/badge/license-Apache%202.0-red?style=flat-square)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square)](https://www.typescriptlang.org/)

基于 Vue 3 + TypeScript + Vite 的云图片协作平台前端，配套后端项目 [cloud-picture-platform](https://github.com/dengxingzhi000/cloud-picture-platform)。

[简介](#简介) • [核心功能](#核心功能) • [技术栈](#技术栈) • [快速开始](#快速开始) • [项目结构](#项目结构) • [贡献指南](#贡献指南)

</div>

---

## 简介

**CloudPicturePlatform Web** 是云图片协作平台的前端应用，基于 Vue 3 + TypeScript + Vite 构建。采用组合式 API（Composition API）与 `<script setup>` 语法，配合 Element Plus 组件库，提供公开画廊浏览、图片上传与搜索、团队协作管理、标签维护以及管理员内容审核等完整用户界面。

### 🎯 核心优势

- ✨ **多场景界面** — 公开画廊 / 私人图库 / 团队协作空间，适配个人与企业使用需求
- 🔐 **完整的认证体系** — JWT Token 持久化、路由守卫、管理员角色双重拦截
- ♾️ **流畅的浏览体验** — 画廊页基于 IntersectionObserver 实现无限滚动加载
- 🏷️ **AI 标签展示** — 上传后展示 AI 生成的置信度标签，支持手动维护标签目录
- 🖼️ **客户端图片处理** — 头像裁剪使用 Canvas API 在本地完成，无需服务端参与
- 📋 **审核与导出** — 管理员内容审核工作流，支持调制记录与成员事件 CSV 导出

---

## 核心功能

### 🔒 身份认证
- **登录 / 注册** — 表单校验，成功后写入 localStorage（`cpp:token` / `cpp:user`）
- **路由守卫** — 受保护页面检查 Token，管理员页面额外校验 `user.role === 'ADMIN'`
- **自动鉴权** — Axios 请求拦截器自动附加 `Authorization: Bearer` 头，401 响应自动清除认证

### 🖼️ 图片资产管理
- **公开画廊** — 瀑布流展示已审核的公开图片，IntersectionObserver 驱动无限滚动
- **图片上传** — 带进度条的文件上传，支持设置可见性（PUBLIC / PRIVATE / TEAM）
- **高级搜索** — 关键词、标签、文件大小、方向、可见性、审核状态、日期范围多维过滤
- **元数据展示** — 分辨率、文件大小、格式、校验和、上传时间完整展示

### 👥 团队协作
- **团队列表** — 查看当前用户所属的全部团队
- **团队详情** — 成员列表、角色管理（OWNER / ADMIN / MEMBER）、邀请工作流
- **邀请记录** — 邀请历史与状态流转（待接受 / 已接受 / 已拒绝 / 已取消）
- **事件导出** — 成员操作事件支持导出 CSV

### 🏷️ 标签管理
- **标签目录** — 创建、重命名全局标签，使用中的标签禁止删除
- **图片标签** — 展示 AI 生成的标签及置信度评分

### 📋 内容审核（管理员）
- **待审列表** — 分页展示所有 PENDING 状态图片
- **审核详情** — 预览图片、查看元数据，执行 APPROVE / REJECT 操作
- **审核历史** — 完整的审核记录链路，支持 CSV 导出

### 👤 个人设置
- **资料编辑** — 用户名、头像修改
- **头像裁剪** — Canvas API 客户端裁剪，即时预览

---

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.5 | 渐进式前端框架，Composition API |
| TypeScript | 5.9 | 静态类型，严格模式 |
| Vite | 7.2 | 极速构建工具 |
| Vue Router | 4.6 | 客户端路由，Navigation Guards |
| Element Plus | 2.13 | UI 组件库 |
| Axios | 1.13 | HTTP 客户端，含拦截器封装 |

---

## 快速开始

### 前置需求

- Node.js 18+
- npm 9+
- 后端服务运行在 `http://localhost:8080`（参见 [cloud-picture-platform](https://github.com/dengxingzhi000/cloud-picture-platform)）

### 本地开发启动

```bash
# 1. 克隆仓库
git clone https://github.com/dengxingzhi000/cloud-picture-platform-web.git
cd cloud-picture-platform-web

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`，`/api` 和 `/uploads` 请求自动代理到 `http://localhost:8080`。

### 构建生产版本

```bash
npm run build    # 类型检查 + Vite 打包，产物输出到 dist/
npm run preview  # 本地预览生产构建
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE` | `""` | API 基础路径，生产部署时按需设置 |

> 开发环境通过 Vite 代理转发，无需设置此变量。

---

## 项目结构

```
src/
├── api/                    # HTTP 服务层，按领域拆分
│   ├── client.ts           # Axios 实例 + 请求/响应拦截器
│   ├── auth.ts             # 认证相关接口（登录、注册、用户信息）
│   ├── pictures.ts         # 图片资产接口（上传、搜索、审核、标签）
│   ├── tags.ts             # 标签目录接口
│   └── teams.ts            # 团队与成员接口
├── composables/
│   └── useAuth.ts          # 响应式用户状态（user、isAuthed、refresh、logout）
├── utils/
│   ├── auth.ts             # localStorage 读写（getToken、setToken、clearAuth）
│   └── format.ts           # 格式化工具（字节大小、日期）
├── router/
│   └── index.ts            # 路由定义与导航守卫
├── components/
│   └── ProfileDialog.vue   # 用户资料编辑弹窗（含 Canvas 头像裁剪）
├── views/                  # 页面组件
│   ├── LoginView.vue       # 登录 / 注册
│   ├── GalleryView.vue     # 公开画廊（无限滚动）
│   ├── SearchView.vue      # 高级搜索
│   ├── UploadView.vue      # 图片上传
│   ├── TeamListView.vue    # 团队列表
│   ├── TeamDetailView.vue  # 团队详情与成员管理
│   ├── TagManagerView.vue  # 标签目录管理
│   ├── AdminReviewList.vue # 管理员待审列表
│   └── AdminReviewDetail.vue # 管理员审核详情
├── App.vue                 # 根组件，全局导航栏
├── main.ts                 # 应用入口
└── style.css               # 全局 CSS 变量与基础样式
```

---

## 贡献指南

我们欢迎任何形式的贡献！

### 提交流程

1. Fork 项目
2. 创建特性分支（`git checkout -b feat/your-feature-#issue`）
3. 提交更改（遵循[约定式提交](https://www.conventionalcommits.org/zh-hans/)，使用中文）
4. 推送到分支（`git push origin feat/your-feature-#issue`）
5. 创建 Pull Request

### Commit 格式

```
feat(gallery): 添加图片收藏功能

- 新增收藏按钮与状态管理
- 调用收藏 API 并更新本地状态
- 添加收藏列表页面路由

Closes #15
```

### 代码规范

- 所有 Vue 组件使用 `<script setup>` 语法
- TypeScript 严格模式，禁止未使用的变量和参数
- 组件状态通过 `ref()` / `reactive()` 管理，跨组件共享状态通过 Composable
- 新增 API 接口统一在 `src/api/` 对应领域文件中添加，复用 `client.ts` 实例
- 路径别名使用 `@` 代替相对路径

---

## 许可证

本项目采用 Apache License 2.0 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 联系方式

- 📧 Email: [dengxingzhi2015@gmail.com](mailto:dengxingzhi2015@gmail.com)
- 🐛 Issue: [提交问题](https://github.com/dengxingzhi000/cloud-picture-platform-web/issues)
- 💬 Discussion: [参与讨论](https://github.com/dengxingzhi000/cloud-picture-platform-web/discussions)
- 🔗 后端项目: [cloud-picture-platform](https://github.com/dengxingzhi000/cloud-picture-platform)

---

<div align="center">

**Made with ❤️ by [dengxingzhi](https://github.com/dengxingzhi000)**

如果项目对你有帮助，请给个 Star ⭐ 支持一下！

</div>
