import { PaymentReturnPanel } from "@/components/membership/payment-return-panel";
import { WatchaReturnPanel } from "@/components/membership/watcha-return-panel";

export default async function PaymentReturnPage({ searchParams }: {
  searchParams: Promise<{ order?: string; sku?: string }>;
}) {
  const { order, sku } = await searchParams;
  if (sku === "pack10" || sku === "pack30") return <WatchaReturnPanel sku={sku} />;
  return <PaymentReturnPanel orderId={order ?? ""} />;
}
