"use client";

/**
 * 桌面端扫码支付弹层（FB-04）
 *
 * 观猹（爱猹收）返回的购买入口可能是 `alipays://` 深链 —— 那是给移动端唤起支付宝用的，
 * 桌面浏览器直接跳会报 ERR_UNKNOWN_URL_SCHEME，页面就断在这儿。
 *
 * 后端其实同时返回了 `purchase.qr_code_url`，只是之前没透传。这里：
 *   桌面端 → 弹二维码，手机扫码付款
 *   移动端 → 仍然直接唤起支付宝（深链本来就是为它设计的）
 */

import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/** 是否是移动端 / 触屏设备：深链只在这种环境里才有意义 */
export function prefersMobileApp(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const ua = navigator.userAgent ?? "";
  const mobileUa = /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(ua);
  return coarse || mobileUa;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 商品名，如「AI 规划 10 次包」 */
  name: string;
  /** 价格文案，如「¥9.90」 */
  price: string;
  /** 深链或网页地址 */
  url: string;
  /** 桌面端二维码地址（平台未返回时为空） */
  qrUrl: string | null;
}

export function WatchaPayDialog({ open, onClose, name, price, url, qrUrl }: Props) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("购买链接已复制，可粘贴到手机打开");
    } catch {
      toast.error("复制失败，请手动选中链接复制");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${name} · ${price}`}
      eyebrow="SCAN & PAY"
      layer="danger"
      width={420}
      footerClassName="justify-end"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            复制购买链接
          </Button>
          <Button size="sm" onClick={copyLink}>
            用支付宝 App 打开
          </Button>
        </>
      }
    >
      {qrUrl ? (
        <div className="flex flex-col items-center gap-3">
          <Image
            src={qrUrl}
            alt={`${name} 付款二维码`}
            width={200}
            height={200}
            className="border border-bd-card bg-white p-2"
          />
          <p className="text-body-sm text-text-2">
            用手机支付宝扫码付款；付完会自动回到拾级。
          </p>
        </div>
      ) : (
        <p className="border border-bd-card bg-cream-light px-3 py-2 text-body-sm text-text-2">
          桌面浏览器无法唤起支付宝。请复制购买链接到手机打开，或改用手机访问拾级。
        </p>
      )}
    </Modal>
  );
}
