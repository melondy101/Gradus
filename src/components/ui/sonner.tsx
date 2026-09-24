"use client"

import { CircleCheck, Info, OctagonX, TriangleAlert, Loader2 } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * 全站唯一 toast 出口（§3 屏幕一的 `.toast` 语言：深色带药丸 + 黄勾）。
 * 样式全部走品牌令牌：bg-band-dark / text-on-dark / border-bd-dark +
 * `0 22px 46px -18px rgba(14,13,11,.6)` 深投影；语义色（warning/error）由调用方
 * 通过 toast.success/error 选择图标，容器颜色保持深药丸不随主题漂移。
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      offset={{ bottom: 70 }}
      mobileOffset={{ bottom: 70 }}
      duration={5000}
      icons={{
        success: <CircleCheck className="size-4 text-accent" />,
        info: <Info className="size-4 text-accent" />,
        warning: <TriangleAlert className="size-4 text-accent" />,
        error: <OctagonX className="size-4 text-accent" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--dark)",
          "--normal-text": "var(--on-dark)",
          "--normal-border": "var(--bd-dark)",
          "--border-radius": "999px",
          "--width": "356px",
          "--z-index": "9999",
          "--toast-offset-bottom": "70px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
        // 深药丸上的 13px 粗体，与 §3 `.toast` 语言一致（sonner 默认 400/14px）
        style: { fontWeight: 700, fontSize: 13 },
      }}
      {...props}
    />
  )
}

export { Toaster }
