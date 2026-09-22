import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * cn() —— tailwind-merge 只认它自己配置里的标度，@theme 里 --radius-* 派生的
 * rounded-card / rounded-field / rounded-pill 它一概不判冲突（实测默认配置下
 * twMerge('rounded-pill','rounded-none') 都不折叠），于是同类圆角谁生效只能靠
 * 样式表声明顺序，Button variant="app" 的 12px 就是这样被 size 的 999px 顶掉的。
 *
 * 组名必须是 'rounded'（内置标度所在的那一组）；写成 'border-radius' 会另起一组，
 * 自定义角与 md/lg 之间仍然互相看不见。以后往 @theme 里加 --radius-* 也要同步这里。
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ["card", "field", "pill"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
