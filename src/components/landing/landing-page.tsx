import { LandingCapabilities } from "./capabilities";
import { LandingFinalCta } from "./final-cta";
import { LandingFooter } from "./footer";
import { LandingHero } from "./hero";
import { LandingHowItWorks } from "./how-it-works";
import { LandingNav } from "./nav";
import { LandingPrivacyBand } from "./privacy-band";
import { LandingWhatsNew } from "./whats-new";

/**
 * 拾级 Gradus 落地页 —— 《品牌与产品设计说明》§2 的 8 段结构。
 *
 * body 为 overflow:hidden，所以本容器自身就是滚动容器：h-full + overflow-y-auto
 * 撑满视口，flex-1 + min-h-0 让它作为 <body> 的 flex 子项不被内容顶出去；
 * 横向用 overflow-x:clip 而非 hidden —— hidden 会让本容器成为水平滚动容器，
 * 从而破坏 <LandingNav> 的 sticky（原 `.lp` 的同一条注释）。
 */
export function LandingPage() {
  return (
    <div className="min-h-0 flex-1 h-full overflow-y-auto overflow-x-clip overscroll-contain bg-cream [scrollbar-width:thin]">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingWhatsNew />
        <LandingHowItWorks />
        <LandingCapabilities />
        <LandingPrivacyBand />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
