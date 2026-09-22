/**
 * 品牌还原实测闸门 —— 无头 chromium 自跑，不占用交互式浏览器。
 * 用法：node scripts/design-audit.mjs [--base=http://localhost:3111] [--only=/,/app]
 * 退出码非 0 = 有硬失败（横向溢出 / 字体未加载 / 令牌未生效 / 页面报错）。
 */
import { chromium } from "playwright-core";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const hit = argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split("=").slice(1).join("=") : d;
};
const BASE = arg("base", "http://localhost:3111");
const ROUTES = arg("only", "/,/app,/history,/task/parity-probe").split(",");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// 品牌硬断言（《品牌与产品设计说明》§1.2 / §1.3）
const EXPECT = {
  bodyBg: "rgb(245, 242, 234)",
  bodyColor: "rgb(17, 17, 17)",
  accent: "#f5c518",
  dark: "#0e0d0b",
};

const PROBE = () => {
  const de = document.documentElement;
  const cs = getComputedStyle(document.body);
  const root = getComputedStyle(de);
  const scroller =
    [...document.querySelectorAll("*")]
      .filter(
        (e) =>
          e.scrollHeight > e.clientHeight + 40 &&
          ["auto", "scroll"].includes(getComputedStyle(e).overflowY)
      )
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || de;

  // 文字溢出：叶级文本节点 vs 最近块级祖先内容盒
  const over = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") continue;
    const rng = document.createRange();
    rng.selectNodeContents(el);
    const tr = rng.getBoundingClientRect();
    const pr = el.getBoundingClientRect();
    if (!tr.width && !tr.height) continue;
    const overX = tr.right - (pr.right - parseFloat(s.paddingRight || 0));
    const overY = tr.bottom - (pr.bottom - parseFloat(s.paddingBottom || 0));
    if (overX > 2 || overY > 14) {
      seen.add(el);
      over.push({
        el: el.tagName.toLowerCase() + "." + String(el.className || "").split(" ")[0],
        text: t.textContent.trim().slice(0, 24),
        overX: +overX.toFixed(1),
      });
    }
  }

  // 对比度：可见文字 vs 实际合成背景
  const parse = (s) => {
    const m = s.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1] : null;
  };
  const lum = (c) => {
    const f = (v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0.5) return c.slice(0, 3);
      n = n.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
  };
  const low = [];
  const done = new Set();
  document.querySelectorAll("body *").forEach((el) => {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || +s.opacity < 0.15) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight * 3) return;
    const fg = parse(s.color);
    if (!fg || fg[3] < 0.6) return;
    const bg = bgOf(el);
    const [l1, l2] = [lum(fg.slice(0, 3)), lum(bg)];
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(s.fontSize);
    const need = size >= 24 || (+s.fontWeight >= 700 && size >= 18.66) ? 3 : 4.5;
    if (ratio < need) {
      const key = `${el.tagName}.${String(el.className).split(" ")[0]}|${s.color}`;
      if (!done.has(key)) {
        done.add(key);
        const path = [];
        for (let n = el; n && n !== document.body && path.length < 3; n = n.parentElement) {
          path.push(`${n.tagName.toLowerCase()}${n.id ? "#" + n.id : "." + String(n.className || "").split(" ").filter(Boolean).slice(0, 2).join("_")}`);
        }
        low.push({ key, ratio: +ratio.toFixed(2), need, px: size, text: el.textContent.trim().slice(0, 20), path: path.join("<"), inline: (el.getAttribute("style") || "").slice(0, 70) });
      }
    }
  });

  return {
    docScrollW: de.scrollWidth,
    docClientW: de.clientWidth,
    hOverflow: de.scrollWidth > de.clientWidth + 1,
    scroller: {
      tag: scroller.tagName + "." + String(scroller.className || "").slice(0, 24),
      scrollH: scroller.scrollHeight,
      clientH: scroller.clientHeight,
    },
    bodyBg: cs.backgroundColor,
    // 真正铺满视口的画布元素（brand-page-shell / app 外壳）；底色必须是 --cream，
    // cream-light 只给卡内次级面，整页用它就低了一档。
    canvasBg: (() => {
      const el = document.querySelector('[data-slot="page-canvas"]');
      return el ? getComputedStyle(el).backgroundColor : null;
    })(),
    bodyColor: cs.color,
    bodyFont: cs.fontFamily.split(",")[0].replace(/"/g, ""),
    accent: root.getPropertyValue("--accent").trim(),
    rPill: root.getPropertyValue("--r-pill").trim(),
    fonts: {
      sansBlack: document.fonts.check("900 64px 'Noto Sans SC'"),
      sansBold: document.fonts.check("700 44px 'Noto Sans SC'"),
      mono: document.fonts.check("500 11px 'JetBrains Mono'"),
    },
    counts: {
      sections: document.querySelectorAll("section").forEach ? document.querySelectorAll("section").length : 0,
      buttons: document.querySelectorAll("button,a[class]").length,
      imgs: document.querySelectorAll("img").length,
    },
    // 保真检查：main 下每个顶层 section 的实际渲染高度（0 = 迁移时把内容搬走留下的空壳）
    sections: [...document.querySelectorAll("main > section")].map((s) => ({
      label:
        s.id ||
        (s.querySelector("h1,h2,h3")?.textContent || "").trim().slice(0, 14) ||
        `${s.parentElement?.tagName.toLowerCase()}>section.${String(s.className).split(" ").slice(0, 3).join("_")}`,
      h: Math.round(s.getBoundingClientRect().height),
    })),
    // §1.4 主按钮：44px 高 / 26×13 内边距。取首屏（hero）内最高的可点元素
    heroButtons: (() => {
      const hero = document.querySelector("main section");
      if (!hero) return [];
      return [...hero.querySelectorAll("a,button")]
        .map((b) => {
          const r = b.getBoundingClientRect();
          const s = getComputedStyle(b);
          return {
            text: (b.textContent || "").trim().slice(0, 10),
            h: Math.round(r.height),
            pad: `${Math.round(parseFloat(s.paddingTop))}x${Math.round(parseFloat(s.paddingRight))}`,
          };
        })
        .filter((b) => b.h > 0);
    })(),
    overflow: over.slice(0, 6),
    lowContrast: low.sort((a, b) => a.ratio - b.ratio).slice(0, 8),
  };
};

const browser = await chromium.launch();
const fails = [];
const rows = [];

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    // 新手指引的遮罩层（z 10000+）会吃掉所有点击，切视图前先标记为已完成
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("gradus_onboarding_completed_v1", "true");
      } catch {
        /* ignore */
      }
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 120)));
    page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text().slice(0, 120)));
    let m = null;
    try {
      await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      m = await page.evaluate(PROBE);
    } catch (e) {
      fails.push(`${route} @${vp.name}: 导航失败 ${String(e).slice(0, 90)}`);
      rows.push({ route, vp: vp.name, fatal: true });
      await ctx.close();
      continue;
    }

    const assert = (m, tag) => {
    if (m.hOverflow) fails.push(`${tag}: 横向溢出 ${m.docScrollW}>${m.docClientW}`);
    if (m.bodyBg !== EXPECT.bodyBg) fails.push(`${tag}: 底色 ${m.bodyBg} ≠ 奶油 ${EXPECT.bodyBg}`);
    if (m.bodyColor !== EXPECT.bodyColor) fails.push(`${tag}: 字色 ${m.bodyColor} ≠ 墨 ${EXPECT.bodyColor}`);
    if (m.accent.toLowerCase() !== EXPECT.accent) fails.push(`${tag}: --accent=${m.accent}`);
    if (m.canvasBg && m.canvasBg !== EXPECT.bodyBg)
      fails.push(`${tag}: 画布底色 ${m.canvasBg} ≠ 奶油 ${EXPECT.bodyBg}（§1.3 body 底，cream-light 只给卡内）`);
    if (!m.fonts.sansBlack) fails.push(`${tag}: Noto Sans SC 900 未加载`);
    if (!m.fonts.mono) fails.push(`${tag}: JetBrains Mono 未加载`);
    if (m.overflow.length) fails.push(`${tag}: ${m.overflow.length} 处文字溢出容器`);
    if (m.lowContrast.length) fails.push(`${tag}: ${m.lowContrast.length} 处对比度不达标`);
    for (const x of m.lowContrast)
      console.log(
        `  ${tag} 低对比 ${x.ratio}:1(需${x.need}) ${x.px}px ${x.key}  «${x.text}»\n    路径 ${x.path}\n    内联 ${x.inline || "—"}`
      );
    // §2 落地页保真：8 段结构不允许留空壳；§1.4 主按钮 44px 高
    if (route === "/") {
      const empty = m.sections.filter((s) => s.h === 0);
      if (empty.length) fails.push(`${tag}: ${empty.length} 个 section 高度为 0 → ${empty.map((s) => s.label).join("、")}`);
      const tallest = m.heroButtons.reduce((a, b) => (b.h > a.h ? b : a), { h: 0, text: "—" });
      if (tallest.h < 44) fails.push(`${tag}: Hero 主按钮 «${tallest.text}» 高 ${tallest.h}px < §1.4 要求 44px`);
    }
    };

    const tag = `${route} @${vp.name}`;
    assert(m, tag);
    // 屏一之外的三个视图（任务 / 天梯 / 甘特）靠图标栏或底部 tab 切换，
    // 空数据下仍有版式可量：不点进去就永远看不见它们的溢出与对比度。
    if (route === "/app") {
      for (const [id, label, mobileText] of [
        ["nav-item-plans", "任务", "任务"],
        ["nav-item-steps", "天梯", "天梯"],
        ["nav-item-timeline", "甘特", "甘特"],
      ]) {
        const sel = vp.name === "mobile" ? `text="${mobileText}"` : `#${id}`;
        const alt = vp.name === "mobile" ? `#${id}` : `text="${mobileText}"`;
        const ok = await page
          .click(sel, { timeout: 3000 })
          .then(() => true)
          .catch(() => page.click(alt, { timeout: 2000 }).then(() => true).catch(() => false));
        if (!ok) {
          fails.push(`${tag}: 切不到视图「${label}」（${sel} / ${alt} 都点不开）`);
          continue;
        }
        await page.waitForTimeout(700);
        assert(await page.evaluate(PROBE), `${tag} · 视图「${label}」`);
      }
    }
    errs.slice(0, 3).forEach((e) => fails.push(`${tag}: ${e}`));

    rows.push({ route, vp: vp.name, ...m });
    console.log(
      `\n── ${tag} ──\n` +
        `  底色 ${m.bodyBg} / 字色 ${m.bodyColor} / 字体 ${m.bodyFont} / --accent ${m.accent} / --r-pill ${m.rPill}\n` +
        `  滚动容器 ${m.scroller.tag} ${m.scroller.scrollH}px > ${m.scroller.clientH}px；横向溢出 ${m.hOverflow ? "有" : "无"}\n` +
        `  字体 900/700/mono: ${m.fonts.sansBlack}/${m.fonts.sansBold}/${m.fonts.mono}；section ${m.counts.sections}，可点 ${m.counts.buttons}\n` +
        `  section 高度: ${m.sections.map((s) => `${s.label}=${s.h}`).join("  ")}\n` +
        (m.heroButtons.length ? `  Hero 可点: ${m.heroButtons.map((b) => `${b.text}=${b.h}px/${b.pad}`).join("  ")}\n` : "") +
        (m.overflow.length ? `  溢出: ${JSON.stringify(m.overflow)}\n` : "") +
        (m.lowContrast.length
          ? m.lowContrast
              .map(
                (x) =>
                  `  低对比 ${x.ratio}:1(需${x.need}) ${x.px}px ${x.key}  «${x.text}»\n    路径 ${x.path}\n    内联 ${x.inline || "—"}`
              )
              .join("\n") + "\n"
          : "") +
        (errs.length ? `  报错: ${errs.slice(0, 3).join(" || ")}\n` : "")
    );
    await ctx.close();
  }
}
await browser.close();

console.log(`\n════ 实测结论：${fails.length ? `${fails.length} 项失败` : "全部通过"} ════`);
fails.forEach((f) => console.log("  ✗ " + f));
process.exit(fails.length ? 1 : 0);
