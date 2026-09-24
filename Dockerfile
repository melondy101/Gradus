# ============================================================
# 拾级 Gradus - 生产级多阶段 Dockerfile
# 优化目标：安全、体积小、启动快、非 root 运行
# ============================================================

# ---------- Stage 1: 依赖安装 ----------
FROM node:20-slim AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# 安装生产依赖，利用缓存层
RUN pnpm install --frozen-lockfile --prod

# ---------- Stage 2: 构建 ----------
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
# 先复制依赖描述文件以利用缓存
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
# 复制源码
COPY . .
# 生成 Prisma/Drizzle 客户端（如有需要）
RUN pnpm run db:generate || true
# 构建 Next.js
RUN pnpm run build

# ---------- Stage 3: 运行 ----------
FROM node:20-slim AS runner
ENV NODE_ENV production
ENV PORT 3000

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# 从 builder 复制必要产物
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换非 root 用户
USER nextjs

EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
