import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Outfit, DM_Sans, JetBrains_Mono, Lora } from "next/font/google";
import { EazoProvider } from "@/lib/eazo-shim";
import { GlobalAuthModal } from "@/components/auth/global-auth-modal";
import { GlobalMembershipModal } from "@/components/membership/global-membership-modal";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LocaleSyncEffect } from "@/components/i18n/locale-sync-effect";
import { getServerLocale } from "@/lib/i18n/server-preference";
import { getCurrentUser } from "@/lib/auth/current-user";
import { UserProvider } from "@/lib/auth/user-provider";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemePreviewModal } from "@/components/theme/theme-preview-modal";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const SITE_TITLE = process.env.NEXT_PUBLIC_APP_TITLE?.trim() || "Gradus - 拾级 | AI 学习任务规划器";
const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() ||
  "Gradus (拾级) — AI 学习任务规划器，将模糊目标拆解为带排期、资源与甘特图的可执行子任务";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: {
    default: SITE_TITLE,
    template: "%s | Gradus",
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Gradus",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  // RSC 阶段直接读 cookie 解出 user —— 首屏零闪烁
  // （详见 docs/plans/2026-08-14-multi-user-isolation.md §Phase 5）
  const user = await getCurrentUser();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("h-full antialiased", outfit.variable, dmSans.variable, jetbrainsMono.variable, lora.variable)}
    >
      <body className="h-full flex flex-col overflow-hidden">
        <I18nProvider>
          <ThemeProvider>
            <UserProvider user={user}>
              <EazoProvider>
                <LocaleSyncEffect />
                {children}
                <GlobalAuthModal />
                <GlobalMembershipModal />
                <ThemePreviewModal />
                <Toaster />
              </EazoProvider>
            </UserProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}