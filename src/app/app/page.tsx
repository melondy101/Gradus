import { HomePage } from "@/components/home";
import type { NavView } from "@/components/layout/nav-items";

/**
 * 产品应用入口（今日面板）。
 * 站点根路径 / 已让给品牌落地页，App 外壳整体搬到这里，
 * 保持与原 / 一致的容器约束：外层 body 为 overflow:hidden，
 * 由 main 提供 100% 高度 + 内部滚动。
 */
interface AppPageProps {
  searchParams: Promise<{ view?: string }>;
}

function getInitialView(view?: string): NavView {
  return view === "plans" || view === "steps" || view === "timeline" ? view : "today";
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const { view } = await searchParams;
  return (
    <main style={{ height: "100%", overflow: "hidden" }}>
      <HomePage initialView={getInitialView(view)} />
    </main>
  );
}
