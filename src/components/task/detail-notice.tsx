import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

interface DetailNoticeProps {
  /** 大标题上方的短眉题 */
  title: string;
  text?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

/**
 * 屏二的三种门控状态（加载中 / 需要登录 / 任务未找到）共用同一张白卡，
 * 保持设计稿卡片 + 眉题语言，不引入额外配色。
 */
export function DetailNotice({ title, text, ctaLabel, onCta }: DetailNoticeProps) {
  return (
    <Card className="items-center gap-0 p-10 text-center">
      <Eyebrow kind="label" className="mb-0">
        拾级 · 任务详情
      </Eyebrow>
      <Heading level={2} spec="sub" className="mt-1.5">
        {title}
      </Heading>
      {text ? (
        <Mono className="mt-2.5 block text-text-3">{text}</Mono>
      ) : null}
      {ctaLabel && onCta ? (
        <Button className="mt-[22px]" onClick={onCta}>
          {ctaLabel}
        </Button>
      ) : null}
    </Card>
  );
}
