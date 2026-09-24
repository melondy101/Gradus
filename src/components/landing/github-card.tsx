import { Star } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/utils";

import { CopyCommandButton } from "./copy-command-button";
import { REPO_LABEL, REPO_URL } from "./links";

/**
 * What's New 右侧深色开源卡 —— 《品牌与产品设计说明》§2.3（原 `.gh-card`）：
 * 深底反白 + 16px 圆角 + 32/28 内边距，1180px 以上随滚动吸顶（top 100px）。
 * 卡片本身无描边（原样式只有底色），故显式去掉 Card 的 1px 边框。
 */
export function GithubCard({ className }: { className?: string }) {
  return (
    <Card
      tone="dark"
      className={cn(
        "static top-auto border-0 px-7 py-8",
        "min-[1180px]:sticky min-[1180px]:top-[100px]",
        className,
      )}
    >
      <Eyebrow tone="accent">Open Source</Eyebrow>

      <Heading
        level={3}
        spec="sub"
        accentDot
        className="mt-0.5 text-[30px] leading-[40px] font-black"
      >
        整个项目
        <br />
        是开源的
      </Heading>

      <p className="text-body-lg leading-[24px] text-on-dark-2">
        Next.js + Drizzle + PostgreSQL，一条命令部署到你自己的服务器上。没有平台账号，没有厂商锁定。
      </p>

      <code className="block break-all rounded-tile border border-accent/26 bg-accent/10 px-3 py-2.5 text-caption tracking-[.02em] text-accent">
        {REPO_LABEL}
      </code>

      <div className="flex items-baseline gap-2 pt-1.5 pb-0.5">
        <Star
          size={15}
          aria-hidden
          className="shrink-0 self-center fill-accent text-accent"
        />
        <b className="text-[20px] font-black">1.2k</b>
        <em className="font-mono text-caption font-medium tracking-[.05em] text-on-dark-3 not-italic">
          Stars
        </em>
      </div>

      <Link
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "cream" }), "w-full")}
      >
        在 GitHub 上查看
      </Link>
      <CopyCommandButton />
    </Card>
  );
}
