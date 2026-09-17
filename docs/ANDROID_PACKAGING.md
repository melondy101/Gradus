# 拾级（Gradus）移动端适配与安卓 APK 打包发布指南

本项目已完成深度移动端适配（全面支持 Android 与 iOS 手势、沉浸式状态栏与安全区、底部导航栏、浮动 AI 规划抽屉与触控优化），并提供全自动将应用打包为 Android APK 并在 GitHub Releases 发布的能力。

---

## 1. 移动端架构与联网一致性设计

拾级是基于 Next.js App Router + Neon PostgreSQL + JWT Cookie 的全栈架构。为了确保安卓安装包在安装后：
- **登录状态与网页端完全互通**
- **所有任务、排期、成就、AI 拆解流水线实时联网**
- **无需维护两套不同 API**

客户端采用 **Capacitor 驱动的高性能原生 WebView 壳层**，直接桥接到你的线上部署服务（如 Vercel 部署域名）。

```
+----------------------------------------------------------------+
|                 Android Native APK (拾级)                      |
|                                                                |
|  [安全区状态栏]                                                 |
|  +----------------------------------------------------------+  |
|  |  顶栏: 视图切换指示 | 搜索 | 提醒中心 | 主题切换 | 会员 | 账号 |  |
|  +----------------------------------------------------------+  |
|  |  核心视图: 今日聚焦 / 全部计划 / 拾级天梯 / 时间甘特图       |  |
|  |  (带平滑手势回弹、触控放大、防误触与底部避让)               |  |
|  +----------------------------------------------------------+  |
|  |  浮动入口: [🤖 AI 规划面板] (呼吸态徽标, 点击底部平滑抽屉) |  |
|  +----------------------------------------------------------+  |
|  |  底栏: 今日聚焦 | 全部计划 | 拾级天梯 | 时间轴 | [+]新建计划  |  |
|  +----------------------------------------------------------+  |
|  [虚拟键/手势避让安全区 env(safe-area-inset-bottom)]           |
+----------------------------------------------------------------+
                               |
                               | HTTPS + JWT Session Cookie
                               v
               线上 Next.js 生产服务 (如 Vercel)
               - /api/auth/* (登录/注册/会话保持)
               - /api/tasks/* (实时任务 CRUD)
               - /api/tasks/[id]/analyze (4段式 AI 规划流水线)
               - Neon PostgreSQL 云端数据持久化
```

---

## 2. 方案 A：GitHub Actions 一键自动打包发布 Release（推荐）

项目内已配置 `.github/workflows/build-android-apk.yml`。

### 触发方式 1：打 Tag 自动发布
在本地终端或 GitHub 仓库打标签并推送：
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions 会自动：
1. 启动 Ubuntu 构建机并配置 Node.js 20、Java 17、Android SDK
2. 将 `capacitor.config.ts` 中的服务器地址指向你配置的线上域名
3. 自动运行 Gradle 编译生成 `gradus-android.apk`
4. 自动在 GitHub Releases 发布并上传 `gradus-android.apk` 文件，供用户直接下载安装！

### 触发方式 2：在 GitHub 网页手动点击触发
1. 打开 GitHub 仓库，进入 **Actions** 标签页
2. 在左侧选择 **Build Android APK & Release** 工作流
3. 点击右侧 **Run workflow**
4. 输入你的线上服务域名（例如 `https://your-domain.vercel.app`）
5. 点击运行，等待 3~5 分钟即可在 Artifacts 和 Releases 中下载 APK。

---

## 3. 方案 B：本地编译 Android APK

如果你需要在本地 Android Studio 中调试或签名：

### 前置要求
- Node.js 18+
- Android Studio 与 Android SDK（API Level 33+）
- Java JDK 17

### 操作步骤
1. 安装依赖：
   ```bash
   npm install
   ```
2. 初始化 Android 工程：
   ```bash
   npx cap add android
   ```
3. 在 `capacitor.config.ts` 中指定线上服务器地址（或通过环境变量传入）：
   ```bash
   export CAPACITOR_SERVER_URL="https://your-domain.vercel.app"
   npm run cap:sync
   ```
4. 打开 Android Studio：
   ```bash
   npm run cap:open:android
   ```
5. 在 Android Studio 中点击 **Build > Build Bundle(s) / APK(s) > Build APK(s)**。
   生成的 APK 文件位于 `android/app/build/outputs/apk/debug/app-debug.apk`。

---

## 4. 方案 C：无需安装包的 Android PWA 即刻体验

拾级已内置完善的 Web App Manifest (`src/app/manifest.ts`) 与移动端 Viewport 沉浸规则：
1. 用 Android 手机上的 Chrome / Edge 浏览器打开网站
2. 浏览器菜单中点击 **“添加到主屏幕”** 或底部弹出的 **“安装应用”**
3. 即可作为独立 App 运行，享受全屏无地址栏、桌面图标以及独立任务栏切换体验。

---

## 5. 移动端自动检查更新与 APK 覆盖升级机制

应用已内置两层更新管理体系：
1. **静默启动检测**：客户端启动 4 秒后，自动向 `/api/app/check-update` 接口查询 GitHub Releases 最新 Tag。若发现远端版本高于本地运行版本，自动弹出「新版本发布」通知卡片。
2. **手动检查更新**：在移动端或桌面端点击头像徽标菜单中的「检查移动端 / 客户端更新」即可随时核验版本。
3. **一键下载并覆盖升级**：
   - 弹窗自动解析 GitHub Release 附件中的 `.apk`（如 `gradus-android.apk`）；
   - 展示版本号对比、发布时间、安装包体积与更新日志摘要；
   - 用户点击「下载最新 APK」后，手机系统将直接开始下载；
   - **下载完毕后直接点击通知栏或文件管理器中的 APK 即可完成覆盖升级**，用户的登录态、学习排期与本地任务完全不受影响！
