import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { ChromaticTrack } from "@/components/ui/chromatic-track";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/utils";

import { CopyCommandButton } from "./copy-command-button";
import { REPO_LABEL, REPO_URL } from "./links";

/**
 * What's New 右侧开源卡 —— 《品牌与产品设计说明》§2.3（原 `.gh-card`）：
 *
 * 这块原先是「深色底 + 黄色点缀」的旧品牌语言，与落地页其余部分
 * （暖纸底 + 朱红强调 + 时间色谱）割裂，看着像上个版本残留。
 * 现在改成暖纸白卡：顶部一条时间色谱六段色轨做身份锚点，正文墨色，
 * 唯一强调是句点的朱红，主按钮走应用内的墨色按钮。
 */
export function GithubCard({ className }: { className?: string }) {
  return (
    <Card
      tone="base"
      className={cn(
        "static top-auto gap-3 px-6 py-8",
        "min-[1180px]:sticky min-[1180px]:top-[100px]",
        className,
      )}
    >
      <ChromaticTrack />

      <Eyebrow>Open Source</Eyebrow>

      <Heading level={3} spec="sub" className="mt-0.5 text-[30px] leading-[40px] font-black">
        整个项目
        <br />
        是开源的<span className="text-error">。</span>
      </Heading>

      <p className="text-body-lg leading-[24px] text-text-2">
        Next.js + Drizzle + PostgreSQL，一条命令部署到你自己的服务器上。没有平台账号，没有厂商锁定。
      </p>

      <code className="block break-all rounded-tile border border-bd-card bg-cream px-3 py-2.5 text-caption tracking-[.02em] text-ink">
        {REPO_LABEL}
      </code>

      <Link
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "app" }), "w-full")}
      >
        在 GitHub 上查看
      </Link>
      <CopyCommandButton />
    </Card>
  );
}
