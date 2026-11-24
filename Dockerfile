# ============================================================
# 拾级 Gradus —— 生产镜像
# Bun 构建 + `next start` 运行（不依赖 standalone 输出）
#
# 用法（详见 DEPLOY.md §4）：
#   docker build -t gradus .
#   docker run -d --name gradus -p 3000:3000 --env-file .env.local gradus
#   docker exec gradus bun run db:migrate     # 迁移也能在容器里跑
#
# ⚠️ 为什么不用 output: "standalone"：
#    本仓库的 next.config.ts 里 standalone 分支目前不会产出 .next/standalone
#    （已实测 webpack 与 turbopack 两种构建），依赖它必然构建失败。
#    这里直接带 .next + node_modules 跑 next start，行为可预期。
# ============================================================

# ---------- 构建 ----------
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# 构建期会收集路由配置，需要一个语法合法的连接串占位；
# 真实连接串只在运行期注入（NEXT_PUBLIC_* 之外的变量不会被内联进产物）
ENV DATABASE_URL=postgresql://build:build@localhost:5432/gradus
RUN bun run build

# ---------- 运行 ----------
FROM oven/bun:1.3-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# next start 默认只听 localhost，容器里必须显式放开
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
# node_modules 含 devDependencies（tsx / drizzle-kit），迁移才能在容器里执行
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# 迁移脚本与 schema：src/lib/db/migrate.ts、drizzle.config.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER bun
EXPOSE 3000

CMD ["bun", "run", "start"]
