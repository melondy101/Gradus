"use client";

import { ErrorFallbackPage } from "@/components/errors/error-fallback-page";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * /app 路由段的错误边界。根 error.tsx 只能兜住根布局，
 * 应用外壳里任一组件 throw 都会连带白屏整个页面；这里把爆炸半径
 * 限制在 /app 这一段，用户点「重试」不用整站刷新。
 */
export default function Error({ error, reset }: ErrorProps) {
  return <ErrorFallbackPage error={error} reset={reset} />;
}
