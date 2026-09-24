import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/utils"

/**
 * 按钮 —— 设计说明 §1.4：
 * 主按钮墨色药丸（radius 999 / padding 26×13 / 白字）；次按钮 1px 墨色描边药丸；
 * App 内主按钮用方圆角 radius 12、与 56 高输入框同高；强调黄只留给 accent 变体。
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border bg-clip-padding whitespace-nowrap transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      /**
       * size 必须先声明、variant 后声明：cva 按声明顺序拼类名（实测），
       * 而 cn() 的 tailwind-merge 现在是「后写的圆角赢」，所以排在后面的
       * variant 才能用自己声明的圆角盖掉 size 的默认药丸角（app → 12px 方圆）。
       */
      size: {
        default:
          "h-11 gap-2 rounded-pill px-[26px] text-body-lg font-bold has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        xs: "h-[30px] gap-1 rounded-pill px-[15px] text-xs font-bold has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[38px] gap-1.5 rounded-pill px-5 text-sm font-bold has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-14 gap-2.5 rounded-field px-[30px] text-base font-bold",
        icon: "size-10 rounded-field",
        "icon-xs": "size-6 rounded-tile [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-icon [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 rounded-field",
        full: "w-full h-11 gap-2 rounded-pill px-[26px] text-body-lg font-bold",
      },
      variant: {
        /** 墨色药丸 —— 全站主操作 */
        default:
          "border-ink bg-ink text-cream hover:bg-black hover:shadow-[0_10px_24px_-10px_rgba(17,17,17,.6)]",
        /** 1px 墨色描边药丸 —— 次操作，悬停反白 */
        outline:
          "border-ink bg-transparent text-ink hover:bg-ink hover:text-cream",
        secondary:
          "bg-cream-light text-ink border-bd-card hover:border-ink hover:bg-white",
        /** 无底、悬停浅奶油 —— 用于图标按钮与关闭按钮 */
        ghost:
          "border-transparent bg-transparent text-text-2 hover:bg-cream-light hover:text-ink",
        destructive:
          "border-error/20 bg-error/10 text-error hover:bg-error/20 focus-visible:outline-error",
        link: "border-transparent text-ink underline-offset-4 hover:underline",
        /** 点缀黄 —— 一个界面里最多出现一次 */
        accent: "bg-accent text-ink border-accent-deep hover:bg-accent-bright",
        /** App 内主按钮：radius 12、与 56 高输入框同高（靠 size 先声明才盖得住药丸角） */
        app: "border-ink bg-ink text-cream rounded-field hover:bg-black",
        /** 深底上的奶油按钮 */
        cream: "border-cream bg-cream text-ink hover:bg-white",
        /** 深底描边按钮 */
        onDark:
          "border-bd-dark bg-transparent text-on-dark-2 hover:border-on-dark-3 hover:bg-white/5 hover:text-on-dark",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
