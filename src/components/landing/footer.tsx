import { GradusLogo } from "@/components/ui/gradus-logo";
import { Mono } from "@/components/ui/eyebrow";
import { PRODUCT_VERSION } from "@/lib/version";
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
      { text: "开源协议", href: `${REPO_URL}/blob/main/LICENSE`, external: true },
      { text: "联系方式", href: `${REPO_URL}/issues`, external: true },
    ],
  },
];

const LEGAL_LINK_CLASS =
  "text-body-sm text-text-3 transition-colors duration-[.16s] hover:text-ink";

/**
 * 8 · Footer —— 《品牌与产品设计说明》§2.8
 * 品牌 + 标语 / 三列链接两端分布 / 底栏版权、法条与社交图标。
 * 配色改为时间色谱：浅奶油底 + 墨字，顶部 2px 墨线收尾（与应用内接续排期色带同语言），
 * 不再是重构前的「深色带 + 黄字」。
 */
export function LandingFooter() {
  return (
    <footer className="border-t-2 border-ink bg-cream-light pt-20 text-ink">
      <BandWrap layout="foot">
        <div>
          <GradusLogo size={22} />
          <p className="mt-4 flex items-baseline gap-2.5">
            <b className="font-chromatic text-[22px] font-extrabold tracking-[-.01em]">拾级</b>
            <Mono className="text-micro tracking-[.24em] text-text-3">GRADUS</Mono>
          </p>
          <p className="mt-3 max-w-[340px] text-[14px] leading-[24px] text-text-2">
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
          "flex flex-col items-start gap-3.5 border-t border-bd-card pt-[22px] pb-[30px]",
          "min-[680px]:flex-row min-[680px]:items-center min-[680px]:justify-between min-[680px]:gap-6"
        )}
      >
        <Mono className="text-text-3">Copyright 2026 Gradus · 拾级 · v{PRODUCT_VERSION}</Mono>
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
