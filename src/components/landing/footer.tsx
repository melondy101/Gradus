import { GradusLogo } from "@/components/ui/gradus-logo";
import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

import { BandWrap, wrapClass } from "./band-wrap";
import { FootCol } from "./foot-col";
import { FootSocial } from "./foot-social";
import type { FootLink } from "./foot-anchor";
import { APP_URL, appViewUrl, REPO_URL } from "./links";

const COLUMNS: { label: string; links: FootLink[] }[] = [
  {
    label: "产品",
    links: [
      { text: "今日面板", href: APP_URL },
      { text: "甘特视图", href: appViewUrl("timeline") },
      { text: "资源校验", href: "#sec-cap" },
    ],
  },
  {
    label: "资源",
    links: [
      { text: "README", href: REPO_URL, external: true },
      {
        text: "开发者指南",
        href: `${REPO_URL}/blob/main/AGENTS.md`,
        external: true,
      },
      {
        text: "部署文档",
        href: `${REPO_URL}/blob/main/DEPLOY.md`,
        external: true,
      },
      { text: "更新日志", href: "#sec-whatsnew" },
    ],
  },
  {
    label: "关于",
    links: [
      { text: "品牌标识", href: `${REPO_URL}/tree/main/output`, external: true },
      { text: "设计说明", href: `${REPO_URL}/tree/main/output`, external: true },
      { text: "开源协议", href: `${REPO_URL}#-开源许可证`, external: true },
      { text: "联系方式", href: `${REPO_URL}/issues`, external: true },
    ],
  },
];

const LEGAL_LINK_CLASS =
  "text-body-sm text-on-dark-3 transition-colors duration-[.16s] hover:text-on-dark";

/**
 * 8 · Footer（深色带）—— 《品牌与产品设计说明》§2.8
 * Logo + 标语 / 三列链接两端分布 / 底栏版权、法条与社交图标。
 */
export function LandingFooter() {
  return (
    <footer className="bg-band-dark pt-20 text-on-dark">
      <BandWrap layout="foot">
        <div>
          <GradusLogo size={18} onDark />
          <p className="mt-4 flex items-baseline gap-2.5 text-[22px] font-black">
            拾级 <Mono className="text-micro tracking-[.24em] text-on-dark-3">GRADUS</Mono>
          </p>
          <p className="mt-3 max-w-[340px] text-[14px] leading-[24px] text-on-dark-2">
            面向自主学习者的 AI 学习任务规划器。一步一步，走到你想去的地方。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-1.5">
          {COLUMNS.map((column) => (
            <FootCol key={column.label} {...column} />
          ))}
        </div>
      </BandWrap>

      <div
        className={cn(
          wrapClass,
          "flex flex-col items-start gap-3.5 border-t border-bd-dark pt-[22px] pb-[30px]",
          "min-[680px]:flex-row min-[680px]:items-center min-[680px]:justify-between min-[680px]:gap-6"
        )}
      >
        <Mono className="text-on-dark-3">Copyright 2026 Gradus · 拾级</Mono>
        <nav className="flex gap-[22px]">
          <a href="#sec-privacy" className={LEGAL_LINK_CLASS}>
            隐私政策
          </a>
          <span className={LEGAL_LINK_CLASS} title="服务条款尚未发布">
            服务条款（筹备中）
          </span>
        </nav>
        <FootSocial />
      </div>
    </footer>
  );
}
