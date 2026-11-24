import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gradus - 拾级 | AI 学习任务规划器",
    short_name: "拾级",
    description: "面向自主学习者的 AI 学习任务规划器：将模糊目标拆解为带排期、资源与甘特图的可执行子任务",
    start_url: "/app",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F2EA",
    theme_color: "#F5F2EA",
    icons: [
      {
        // ?v= 与 layout.tsx 的图标版本号保持一致：换标识时一起改，否则 PWA 图标仍是旧的
        src: "/icon.svg?v=brand-v2",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg?v=brand-v2",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
