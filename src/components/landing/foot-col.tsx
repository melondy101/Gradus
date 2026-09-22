import { Eyebrow } from "@/components/ui/eyebrow";

import { FootAnchor, type FootLink } from "./foot-anchor";

export interface FootColProps {
  label: string;
  links: FootLink[];
}

/**
 * Footer 链接列 —— 《品牌与产品设计说明》§2.8（原 `.foot-cols` 的一列）：
 * 等宽眉题作列名（深底上转 on-dark-3 弱一级）+ 纵向链接。
 */
export function FootCol({ label, links }: FootColProps) {
  return (
    <div>
      <Eyebrow kind="label" className="text-on-dark-3">
        {label}
      </Eyebrow>
      {links.map((link) => (
        <FootAnchor key={link.text} link={link} />
      ))}
    </div>
  );
}
