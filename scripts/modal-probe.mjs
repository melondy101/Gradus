/**
 * 弹层对等实测 —— 把可无数据打开的弹层（新建目标对话框、⌘K 指令面板、会员中心、
 * 屏三 AI 规划弹层）在真浏览器里打开，逐量对比《品牌与产品设计说明》§3 弹层语言与 §1.4 按钮的硬指标：
 * 遮罩 45% 墨 + blur 2px、面板 radius 20 + 大投影、页头 h3 17/900、
 * 眉题 mono 9.5、底栏 cream-light + 上描边、主按钮药丸 38 高；
 * 屏三另加 .pnode 36 正圆三态与 .done-in__mark 78px 黄圈。
 *
 * 颜色一律「涂到白底上取像素」再比：Tailwind v4 会把 --color-ink 编译成
 * oklab(...)，字符串永远对不上 rgba(17,17,17,.45)，但两者是同一个色。
 *
 * 用法：node scripts/modal-probe.mjs [--base=http://localhost:3111]
 * 有硬偏差即非零退出，与 audit:design / audit:parity 一起构成交付闸门。
 */
import { chromium } from "playwright-core";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const h = argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.split("=").slice(1).join("=") : d;
};
const BASE = arg("base", "http://localhost:3111");

/** §3 `.veil`/`.modal` + §1.4 `.btn` 的设计真值（涂白后的 rgb 三元组） */
const WANT = {
  veilRGB: "148,148,148", // rgba(17,17,17,.45) over #fff
  veilBlur: "blur(2px)",
  panelRadius: "20px",
  panelRGB: "255,255,255",
  panelShadow: "rgba(14, 13, 11, 0.6) 0px 60px 120px -30px",
  headTitleSize: "17px",
  headTitleWeight: "900",
  eyebrowSize: "9.5px",
  footRGB: "250,248,243", // --cream-light
  footBorder: "1px solid 230,225,211", // --bd-card
  btnHeight: 38, // §1.4 .btn--sm
  btnRadius: "999px",
  btnPrimaryRGB: "17,17,17",
  btnPrimaryTextRGB: "245,242,234",
  doneMarkRGB: "253,246,218", // §3 .done-in__mark = rgba(245,197,24,.16) 涂白
  inkRGB: "17,17,17", // --ink 涂白
  accentRGB: "245,197,24", // --accent 涂白（本身就是不透明色）
  /**
   * §3 `.pnode i` 声明的是 1.5px，但闸门量的是渲染结果：Chrome 会把描边宽度抹到整
   * 设备像素，实测设计稿自身在 dpr=1 与 dpr=2 下 computed 都是 1px（同选择器对照量过），
   * 所以真值取渲染值 1px。实现侧用 globals.css 的 @utility hairline 忠实声明 1.5px，
   * 将来浏览器不再抹平时会在这里报红——那时该把这条改成与 design-parity 的双侧比对。
   */
  nodeBorder: "1px",
};

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

/** 注入页面：把任意 CSS 颜色涂到白底上读出实际 rgb（支持 oklab / color-mix） */
const HELPERS = `
  const ow = (v) => {
    if (!v) return undefined;
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1, 1);
    x.fillStyle = v; x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return d[3] === 0 ? 'transparent' : [d[0], d[1], d[2]].join(',');
  };
  const cs = (el) => (el ? getComputedStyle(el) : null);
`;

const OPENERS = [
  "#btn-mobile-new-task",
  "#btn-header-new-task",
  "#nav-btn-new-plan",
];

const browser = await chromium.launch();
let failures = 0;

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  // 新手指引会盖住首屏并吃掉点击，量弹层前先标记为已完成
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("gradus_onboarding_completed_v1", "true");
    } catch {
      /* ignore */
    }
  });
  const page = await ctx.newPage();
  await page
    .goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 90000 })
    .catch(() => {});
  await page.waitForTimeout(vp.name === "mobile" ? 2600 : 2200);

  // ① 新建目标对话框（三条出口任一）
  let openedBy = null;
  for (const sel of OPENERS) {
    const ok = await page
      .click(sel, { timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (ok) {
      openedBy = sel;
      break;
    }
  }
  if (!openedBy) {
    console.log(
      `\n── 新建目标对话框 @${vp.name}  ✗ 三条入口都点不开（${OPENERS.join(" / ")}）`,
    );
    failures++;
  } else {
    await page.waitForTimeout(500);
    const r = await page.evaluate(`(() => {${HELPERS}
      const panel = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (!panel) return { miss: 'no [role=dialog][aria-modal]' };
      const veil = panel.previousElementSibling;
      const head = panel.querySelector('h3');
      const eyebrow = panel.querySelector('.font-mono');
      const foot = panel.lastElementChild;
      const fs = cs(foot);
      const rect = panel.getBoundingClientRect();
      return {
        veilBg: ow(cs(veil)?.backgroundColor),
        veilBlur: cs(veil)?.backdropFilter,
        panelRadius: cs(panel).borderTopLeftRadius,
        panelBg: ow(cs(panel).backgroundColor),
        panelShadow: cs(panel).boxShadow,
        headSize: cs(head)?.fontSize,
        headWeight: cs(head)?.fontWeight,
        headText: head?.textContent?.trim(),
        eyebrowSize: cs(eyebrow)?.fontSize,
        eyebrowText: eyebrow?.textContent?.trim(),
        footBg: ow(fs?.backgroundColor),
        footBorder: fs ? fs.borderTopWidth + ' solid ' + ow(fs.borderTopColor) : undefined,
        buttons: [...(foot ? foot.querySelectorAll('button') : [])].map((b) => ({
          text: b.textContent.trim(),
          h: Math.round(b.getBoundingClientRect().height),
          radius: cs(b).borderTopLeftRadius,
          bg: ow(cs(b).backgroundColor),
          color: ow(cs(b).color),
        })),
        fitsViewport: rect.left >= -0.5 && rect.right <= innerWidth + 0.5,
        panelW: Math.round(rect.width),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);
    console.log(
      `\n── 新建目标对话框 @${vp.name}（${openedBy} → 面板 ${r.panelW}px，贴边 ${r.fitsViewport ? "OK" : "溢出"}）`,
    );
    if (r.miss) {
      console.log(`   ✗ ${r.miss}`);
      failures++;
    } else {
      const errs = [
        r.veilBg !== WANT.veilRGB &&
          `遮罩底色 ${r.veilBg} ≠ ${WANT.veilRGB}（§3 45% 墨）`,
        r.veilBlur !== WANT.veilBlur && `遮罩模糊 ${r.veilBlur} ≠ blur(2px)`,
        r.panelRadius !== WANT.panelRadius &&
          `面板圆角 ${r.panelRadius} ≠ 20px`,
        r.panelBg !== WANT.panelRGB && `面板底色 ${r.panelBg} ≠ 255,255,255`,
        !(r.panelShadow || "").includes(WANT.panelShadow) &&
          `面板投影缺 §3 大投影「${WANT.panelShadow}」`,
        r.headSize !== WANT.headTitleSize && `页头 h3 ${r.headSize} ≠ 17px`,
        r.headWeight !== WANT.headTitleWeight &&
          `页头 h3 字重 ${r.headWeight} ≠ 900`,
        r.eyebrowSize !== WANT.eyebrowSize && `眉题 ${r.eyebrowSize} ≠ 9.5px`,
        r.footBg !== WANT.footRGB && `底栏底色 ${r.footBg} ≠ cream-light`,
        r.footBorder !== WANT.footBorder &&
          `底栏描边 ${r.footBorder} ≠ 1px bd-card`,
        r.overflowX > 0 && `页面横向溢出 ${r.overflowX}px`,
        !r.fitsViewport && "面板超出视口",
      ].filter(Boolean);
      for (const b of r.buttons) {
        if (b.radius !== WANT.btnRadius)
          errs.push(
            `底栏按钮「${b.text}」圆角 ${b.radius} ≠ ${WANT.btnRadius}`,
          );
        if (b.h !== WANT.btnHeight)
          errs.push(`底栏按钮「${b.text}」高 ${b.h} ≠ 38`);
      }
      const prim = r.buttons.find((b) => b.bg === WANT.btnPrimaryRGB);
      if (!prim) errs.push("底栏缺墨色主按钮（§1.2 primary = 墨底奶油字）");
      else if (prim.color !== WANT.btnPrimaryTextRGB)
        errs.push(`主按钮字色 ${prim.color} ≠ cream 245,242,234`);
      console.log(
        `   页头「${r.headText}」/ 眉题「${r.eyebrowText}」/ 底栏 ${r.buttons.map((b) => `${b.text}=${b.h}h/${b.radius}`).join("  ")}`,
      );
      if (errs.length) {
        failures += errs.length;
        for (const e of errs) console.log(`   ✗ ${e}`);
      } else console.log("   ✓ 全部命中设计真值");
    }
  }

  // ② 指令面板：⌘K（自建遮罩，量它是否落在同一套弹层语言上）
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press(vp.name === "mobile" ? "Control+k" : "Meta+k");
  await page.waitForTimeout(500);
  const pal = await page.evaluate(`(() => {${HELPERS}
    const veil = [...document.querySelectorAll('div')].find(
      (d) => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).zIndex === '9999'
    );
    if (!veil) return { miss: '指令面板未打开' };
    const panel = veil.firstElementChild;
    const rect = panel ? panel.getBoundingClientRect() : null;
    return {
      veilBg: ow(getComputedStyle(veil).backgroundColor),
      veilBlur: getComputedStyle(veil).backdropFilter,
      panelRadius: panel ? getComputedStyle(panel).borderTopLeftRadius : undefined,
      fitsViewport: rect ? rect.left >= -0.5 && rect.right <= innerWidth + 0.5 : false,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  })()`);
  console.log(
    `\n── 指令面板 @${vp.name}  ${
      pal.miss
        ? `⚠ ${pal.miss}`
        : `遮罩 ${pal.veilBg}/${pal.veilBlur}，面板 radius ${pal.panelRadius}`
    }`,
  );
  if (pal.miss) {
    failures++;
  } else {
    const palErrs = [
      pal.veilBg !== WANT.veilRGB &&
        `遮罩底色 ${pal.veilBg} ≠ ${WANT.veilRGB}（§3 45% 墨）`,
      pal.veilBlur !== WANT.veilBlur && `遮罩模糊 ${pal.veilBlur} ≠ blur(2px)`,
      pal.panelRadius !== WANT.panelRadius &&
        `面板圆角 ${pal.panelRadius} ≠ 20px`,
      pal.overflowX > 0 && `页面横向溢出 ${pal.overflowX}px`,
      !pal.fitsViewport && "面板超出视口",
    ].filter(Boolean);
    if (palErrs.length) {
      failures += palErrs.length;
      for (const e of palErrs) console.log(`   ✗ ${e}`);
    } else console.log("   ✓ 与 <Modal> 同一套弹层语言");
  }

  // ③ 会员弹窗：侧栏入口，遮罩与面板自成一对（非 <Modal>），量它是否同一语言
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  let openedMem = false;
  for (const sel of ["#nav-btn-membership", '[aria-label="会员中心"]']) {
    openedMem = await page
      .click(sel, { timeout: 1500 })
      .then(() => true)
      .catch(() => false);
    if (openedMem) break;
  }
  if (!openedMem) {
    // 品牌改版后侧栏不再挂 #nav-btn-membership，会员入口搬进 ⌘K 指令面板
    // （command-palette.tsx 的 action-membership，唯一命中「配额」的命令标题）
    await page.keyboard.press("ControlOrMeta+k");
    await page.waitForTimeout(300);
    await page.keyboard.type("配额");
    await page.waitForTimeout(300);
    openedMem = await page.keyboard
      .press("Enter")
      .then(() => true)
      .catch(() => false);
  }
  await page.waitForTimeout(700);
  const mem = await page.evaluate(`(() => {${HELPERS}
    // 会员弹窗已迁到 <Modal>：面板即 [role=dialog]，遮罩是其前一个兄弟节点
    const panel = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (!panel) return { miss: '会员弹窗未打开' };
    const veil = panel.previousElementSibling;
    const rect = panel.getBoundingClientRect();
    const vs = getComputedStyle(veil);
    return {
      veilBg: ow(vs.backgroundColor),
      veilBlur: vs.backdropFilter,
      panelRadius: getComputedStyle(panel).borderTopLeftRadius,
      panelShadow: getComputedStyle(panel).boxShadow,
      panelW: Math.round(rect.width),
      fitsViewport: rect.left >= -0.5 && rect.right <= innerWidth + 0.5,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  })()`);
  if (!openedMem && mem.miss) {
    console.log(
      `\n── 会员弹窗 @${vp.name}  ⚠ #nav-btn-membership 点不开或弹窗未渲染（跳过）`,
    );
  } else {
    console.log(
      `\n── 会员弹窗 @${vp.name}  遮罩 ${mem.veilBg}/${mem.veilBlur}，面板 ${mem.panelW}px radius ${mem.panelRadius}`,
    );
    const memErrs = [
      mem.veilBg !== WANT.veilRGB &&
        `遮罩底色 ${mem.veilBg} ≠ ${WANT.veilRGB}（§3 45% 墨）`,
      mem.veilBlur !== WANT.veilBlur && `遮罩模糊 ${mem.veilBlur} ≠ blur(2px)`,
      mem.panelRadius !== WANT.panelRadius &&
        `面板圆角 ${mem.panelRadius} ≠ 20px`,
      !(mem.panelShadow || "").includes(WANT.panelShadow) && "面板缺 §3 大投影",
      mem.overflowX > 0 && `页面横向溢出 ${mem.overflowX}px`,
      !mem.fitsViewport && "面板超出视口",
    ].filter(Boolean);
    if (memErrs.length) {
      failures += memErrs.length;
      for (const e of memErrs) console.log(`   ✗ ${e}`);
    } else console.log("   ✓ 与 <Modal> 同一套弹层语言");
  }

  // ④ 屏三 AI 规划弹层：/task/parity-probe?ritual=<phase> 直接把纯展示组件压上来量
  for (const stage of ["plan", "done"]) {
    await page
      .goto(`${BASE}/task/parity-probe?ritual=${stage}`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      })
      .catch(() => {});
    await page.waitForTimeout(1200);

    const r3 = await page.evaluate(`(() => {${HELPERS}
      const panel = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (!panel) return { miss: 'no [role=dialog][aria-modal]' };
      const veil = panel.previousElementSibling;
      const rect = panel.getBoundingClientRect();
      const nodes = [...panel.querySelectorAll('i')].map((n) => {
        const s = cs(n);
        return {
          text: n.textContent.trim(),
          w: Math.round(n.getBoundingClientRect().width),
          h: Math.round(n.getBoundingClientRect().height),
          radius: s.borderTopLeftRadius,
          border: s.borderTopWidth,
          bg: ow(s.backgroundColor),
          color: ow(s.color),
          shadow: s.boxShadow || '',
        };
      });
      const head = panel.querySelector('h3');
      const foot = panel.lastElementChild;
      const mark = panel.querySelector('span.grid');
      const ms = cs(mark);
      return {
        veilBg: ow(cs(veil)?.backgroundColor),
        veilBlur: cs(veil)?.backdropFilter,
        panelRadius: cs(panel).borderTopLeftRadius,
        panelShadow: cs(panel).boxShadow,
        panelW: Math.round(rect.width),
        fitsViewport: rect.left >= -0.5 && rect.right <= innerWidth + 0.5,
        headSize: cs(head)?.fontSize,
        headWeight: cs(head)?.fontWeight,
        eyebrowSize: cs(panel.querySelector('.font-mono'))?.fontSize,
        footButtons: [...(foot ? foot.querySelectorAll('button') : [])].map((b) => ({
          text: b.textContent.trim(),
          h: Math.round(b.getBoundingClientRect().height),
          radius: cs(b).borderTopLeftRadius,
        })),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        doneMark: mark ? { w: Math.round(mark.getBoundingClientRect().width), radius: ms.borderTopLeftRadius, bg: ow(ms.backgroundColor) } : null,
        nodes,
      };
    })()`);

    const label = stage === "done" ? "完成态" : "进行中";
    console.log(
      `\n── 屏三 AI 弹层 · ${label} @${vp.name}  面板 ${r3.panelW ?? "?"}px${r3.fitsViewport ? "" : " ⚠ 超出视口"}`,
    );
    if (r3.miss) {
      console.log(`   ✗ ${r3.miss}`);
      failures++;
      continue;
    }
    const e3 = [
      r3.veilBg !== WANT.veilRGB && `遮罩底色 ${r3.veilBg} ≠ ${WANT.veilRGB}`,
      r3.veilBlur !== WANT.veilBlur && `遮罩模糊 ${r3.veilBlur} ≠ blur(2px)`,
      r3.panelRadius !== WANT.panelRadius &&
        `面板圆角 ${r3.panelRadius} ≠ 20px`,
      !(r3.panelShadow || "").includes(WANT.panelShadow) && "面板缺 §3 大投影",
      r3.headSize !== WANT.headTitleSize && `页头 h3 ${r3.headSize} ≠ 17px`,
      r3.headWeight !== WANT.headTitleWeight &&
        `页头 h3 字重 ${r3.headWeight} ≠ 900`,
      r3.eyebrowSize !== WANT.eyebrowSize && `眉题 ${r3.eyebrowSize} ≠ 9.5px`,
      r3.overflowX > 0 && `页面横向溢出 ${r3.overflowX}px`,
      !r3.fitsViewport && "面板超出视口",
      vp.name === "desktop" &&
        r3.panelW !== 720 &&
        `面板宽 ${r3.panelW}px ≠ §3 .modal 720px`,
    ].filter(Boolean);

    if (stage === "plan") {
      // §3 .pnode：36 正圆、等宽 13、done 墨底反白、live 黄底、idle 白底描边
      const want = [WANT.inkRGB, WANT.inkRGB, WANT.accentRGB, WANT.panelRGB];
      if (r3.nodes.length !== 4)
        e3.push(`流水线节点 ${r3.nodes.length} 个 ≠ 4`);
      r3.nodes.forEach((n, i) => {
        if (n.w !== 36 || n.h !== 36)
          e3.push(`节点${i + 1} ${n.w}×${n.h} ≠ 36×36`);
        if (n.border !== WANT.nodeBorder)
          e3.push(`节点${i + 1} 描边 ${n.border} ≠ ${WANT.nodeBorder}`);
        if (n.bg !== want[i])
          e3.push(`节点${i + 1} 底色 ${n.bg} ≠ ${want[i]}（§3 三态）`);
      });
      const live = r3.nodes[2];
      if (live && !live.shadow.includes("rgba(245, 197, 24, 0.2)"))
        e3.push(`进行中节点缺 5px 黄光晕（实测 ${live.shadow || "无投影"}）`);
      if (live && live.color !== WANT.btnPrimaryRGB)
        e3.push(`进行中节点字色 ${live.color} ≠ ink`);
    } else if (!r3.doneMark) {
      e3.push("完成态缺 78px 黄圈 <.done-in__mark>");
    } else {
      if (r3.doneMark.w !== 78) e3.push(`完成态黄圈 ${r3.doneMark.w}px ≠ 78px`);
      if (r3.doneMark.bg !== WANT.doneMarkRGB)
        e3.push(
          `完成态黄圈底色 ${r3.doneMark.bg} ≠ ${WANT.doneMarkRGB}（accent 16%）`,
        );
    }
    for (const b of r3.footButtons) {
      if (b.radius !== WANT.btnRadius)
        e3.push(`底栏按钮「${b.text}」圆角 ${b.radius} ≠ 999px`);
      if (b.h !== WANT.btnHeight)
        e3.push(`底栏按钮「${b.text}」高 ${b.h} ≠ 38`);
    }
    if (e3.length) {
      failures += e3.length;
      for (const e of e3) console.log(`   ✗ ${e}`);
    } else {
      console.log(
        `   ✓ ${stage === "done" ? "黄圈 78px + 弹层语言" : `四节点 ${r3.nodes.map((n) => n.bg).join(" / ")}`} 全部命中设计真值`,
      );
    }
  }

  // ⑤ 其余三个纯展示浮层：本轮才迁到 <Modal>，验证它们说的是同一套弹层语言
  for (const name of ["delete", "milestone", "congrats", "subtask"]) {
    await page
      .goto(`${BASE}/task/parity-probe?overlay=${name}`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      })
      .catch(() => {});
    await page.waitForTimeout(1200);

    const o = await page.evaluate(`(() => {${HELPERS}
      const panel = document.querySelector(
        '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'
      );
      if (!panel) return { miss: 'no [role=dialog|alertdialog][aria-modal]' };
      const veil = panel.previousElementSibling;
      const rect = panel.getBoundingClientRect();
      const foot = panel.lastElementChild;
      const head = panel.querySelector('h3, h2, h4');
      return {
        role: panel.getAttribute('role'),
        veilBg: ow(cs(veil)?.backgroundColor),
        veilBlur: cs(veil)?.backdropFilter,
        panelRadius: cs(panel).borderTopLeftRadius,
        panelShadow: cs(panel).boxShadow,
        panelW: Math.round(rect.width),
        fitsViewport: rect.left >= -0.5 && rect.right <= innerWidth + 0.5,
        headText: head?.textContent?.trim().slice(0, 18),
        footButtons: [...(foot ? foot.querySelectorAll('button') : [])].map((b) => ({
          text: b.textContent.trim().slice(0, 8),
          h: Math.round(b.getBoundingClientRect().height),
          radius: cs(b).borderTopLeftRadius,
        })),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);

    console.log(`\n── 浮层 ${name} @${vp.name}  面板 ${o.panelW ?? "?"}px`);
    if (o.miss) {
      console.log(`   ✗ ${o.miss}`);
      failures++;
      continue;
    }
    // 删除确认必须是 alertdialog（读屏要当警报播报），其余两个是普通 dialog
    const wantRole = name === "delete" ? "alertdialog" : "dialog";
    const oe = [
      o.role !== wantRole && `role="${o.role}" ≠ ${wantRole}`,
      o.veilBg !== WANT.veilRGB && `遮罩底色 ${o.veilBg} ≠ ${WANT.veilRGB}`,
      o.veilBlur !== WANT.veilBlur && `遮罩模糊 ${o.veilBlur} ≠ blur(2px)`,
      o.panelRadius !== WANT.panelRadius && `面板圆角 ${o.panelRadius} ≠ 20px`,
      !(o.panelShadow || "").includes(WANT.panelShadow) && "面板缺 §3 大投影",
      o.overflowX > 0 && `页面横向溢出 ${o.overflowX}px`,
      !o.fitsViewport && "面板超出视口",
    ].filter(Boolean);
    for (const b of o.footButtons) {
      if (b.radius !== WANT.btnRadius)
        oe.push(`底栏按钮「${b.text}」圆角 ${b.radius} ≠ 999px`);
      if (b.h !== WANT.btnHeight)
        oe.push(`底栏按钮「${b.text}」高 ${b.h} ≠ 38`);
    }
    if (oe.length) {
      failures += oe.length;
      for (const e of oe) console.log(`   ✗ ${e}`);
    } else {
      console.log(
        `   ✓ 「${o.headText}」与 <Modal> 同一套弹层语言（底栏 ${o.footButtons.length} 个按钮）`,
      );
    }
  }

  await ctx.close();
}

await browser.close();
console.log(
  `\n════ 弹层对等结论：${failures ? `${failures} 项偏差` : "全部通过"} ════`,
);
process.exit(failures ? 1 : 0);
