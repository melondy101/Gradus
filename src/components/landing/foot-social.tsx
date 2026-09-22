import { REPO_URL } from "./links";

/** 社交图标沿用设计稿的内联 SVG 路径（图形，不是 emoji），尺寸由 [&>svg] 控制 */
const ITEMS = [
  {
    label: "GitHub",
    href: REPO_URL,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.6 0 0 3.6 0 8c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3s1.4.1 2 .3c1.5-1 2.2-.8 2.2-.8.5 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3.1-1.8 3.7-3.6 4 .3.2.5.7.5 1.4v2.1c0 .2.1.5.5.4C13.7 14.5 16 11.5 16 8c0-4.4-3.6-8-8-8z" />
      </svg>
    ),
  },
  {
    label: "GitHub Issues",
    href: `${REPO_URL}/issues`,
    icon: (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
      >
        <rect x="1" y="3" width="14" height="10" rx="2" />
        <path d="M2 5l6 4 6-4" />
      </svg>
    ),
  },
];

/** 图标位样式（原 `.foot-social a`）：34px 方圆角 9 描边位，悬停描边转亮并浮起 6% 白雾 */
const SOCIAL_CLASS = [
  "grid place-items-center size-[34px] rounded-[9px] border border-bd-dark",
  "text-on-dark-2 [&>svg]:size-[15px]",
  "transition-[color,border-color,background-color] duration-[.16s]",
  "hover:border-on-dark-3 hover:bg-[rgba(245,242,234,.06)] hover:text-on-dark",
].join(" ");

/** 底栏社交图标组 —— 仅保留已验证的仓库与反馈入口。 */
export function FootSocial() {
  return (
    <div className="flex gap-2.5">
      {ITEMS.map((item) => (
        <a
          key={item.label}
          href={item.href}
          aria-label={item.label}
          className={SOCIAL_CLASS}
          target={item.href === "#" ? undefined : "_blank"}
          rel={item.href === "#" ? undefined : "noopener noreferrer"}
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}
