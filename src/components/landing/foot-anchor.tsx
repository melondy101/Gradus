import Link from "next/link";

import { APP_URL } from "./links";

export type FootLink = { text: string; href: string; external?: boolean };

/** 页脚链接项的排版（原 `.foot-cols a`）：整行块级、透明下边框占位、悬停右移 3px 转纯白 */
const FOOT_LINK_CLASS =
  "block border-b border-transparent py-[7px] text-[14px] text-on-dark-2 transition-[color,transform] duration-[.16s] hover:translate-x-[3px] hover:text-on-dark";

/**
 * Footer 链接项：外链带 noopener；站内锚点用原生 <a>；
 * 进产品（/app）走 next/link。
 */
export function FootAnchor({ link }: { link: FootLink }) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={FOOT_LINK_CLASS}
      >
        {link.text}
      </a>
    );
  }
  if (link.href === APP_URL) {
    return (
      <Link href={link.href} className={FOOT_LINK_CLASS}>
        {link.text}
      </Link>
    );
  }
  return (
    <a href={link.href} className={FOOT_LINK_CLASS}>
      {link.text}
    </a>
  );
}
