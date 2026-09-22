/* 真浏览器实测：溢出 / 裁切 / 字体 / 甘特对齐。跑法：在仓库根执行 `node output/design-preview/check.mjs` */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = 'D:/Develop/Gradus/output/design-preview';
/* `node check.mjs single` 校验内联后的单文件导出件 */
const SINGLE = process.argv[2] === 'single';
const TARGET = SINGLE ? 'D:/Develop/Gradus/output/拾级Gradus-设计预览.html' : `${ROOT}/index.html`;
const SHOTS = `${ROOT}/${SINGLE ? 'shots-single' : 'shots'}`;
mkdirSync(SHOTS, { recursive: true });

const VIEWS = ['brand', 'landing', 'app-today', 'app-detail', 'app-modal', 'notes'];
const out = [];

const measure = () => {
  const r = [];
  const de = document.documentElement;
  const active = document.querySelector('.view.is-active');
  r.push({ kind: 'page', view: active?.id, docScrollW: de.scrollWidth, docClientW: de.clientWidth });

  // 1. 文本溢出容器（叶级文本节点 vs 最近块级祖先内容盒）
  const walker = document.createTreeWalker(active, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el) || el.closest('.dock')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const tr = range.getBoundingClientRect();
    const pr = el.getBoundingClientRect();
    if (tr.width === 0 && tr.height === 0) continue;
    const overX = tr.right - (pr.right - parseFloat(cs.paddingRight || 0));
    const overY = tr.bottom - (pr.bottom - parseFloat(cs.paddingBottom || 0));
    if (overX > 2 || overY > 14) {
      seen.add(el);
      r.push({
        kind: 'text-overflow', el: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0],
        text: t.textContent.trim().slice(0, 26), overX: +overX.toFixed(1), overY: +overY.toFixed(1),
      });
    }
  }

  // 2. 1440×900 画板：主区是否内部滚动（内容超出 900 视口）
  active.querySelectorAll('.frame').forEach((f, i) => {
    const main = f.querySelector('.main');
    const slot = f.closest('.frame-slot');
    const s = parseFloat(getComputedStyle(slot).getPropertyValue('--s')) || 1;
    r.push({
      kind: 'frame', i, scale: s, frameH: f.getBoundingClientRect().height.toFixed(0),
      mainScrollH: main?.scrollHeight, mainClientH: main?.clientHeight,
      mainOverflow: (main?.scrollHeight ?? 0) - (main?.clientHeight ?? 0),
    });
    // 画板内是否有元素被 900px 高度裁掉
    if (main) {
      const fr = f.getBoundingClientRect();
      main.querySelectorAll('*').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.height && b.bottom > fr.bottom + 1 && el.children.length === 0) {
          r.push({ kind: 'frame-clip', el: el.tagName + '.' + (el.className || '').toString().split(' ')[0], over: +(b.bottom - fr.bottom).toFixed(1) });
        }
      });
    }
  });

  // 3. 弹层几何
  const modal = document.querySelector('#view-app-modal .modal');
  const veil = document.querySelector('#view-app-modal .veil');
  if (modal && veil && active?.id === 'view-app-modal') {
    const m = modal.getBoundingClientRect(), v = veil.getBoundingClientRect();
    r.push({
      kind: 'modal', w: m.width, h: m.height, fitsInVeil: m.top >= v.top - .5 && m.bottom <= v.bottom + .5,
      topGap: +(m.top - v.top).toFixed(1), botGap: +(v.bottom - m.bottom).toFixed(1),
      bodyOverflow: document.querySelector('.modal__body').scrollHeight - document.querySelector('.modal__body').clientHeight,
      veilOff: veil.classList.contains('is-off'),
    });
  }

  // 4. 甘特条是否落在正确的日列
  const cols = [...document.querySelectorAll('#view-app-detail .g__cols i')];
  if (cols.length && active?.id === 'view-app-detail') {
    document.querySelectorAll('#view-app-detail .g .bar').forEach(bar => {
      const s = +getComputedStyle(bar).getPropertyValue('--s');
      const c = +getComputedStyle(bar).getPropertyValue('--c');
      const b = bar.getBoundingClientRect(), a = cols[s - 1].getBoundingClientRect();
      const z = cols[Math.min(s + c - 1, 8) - 1].getBoundingClientRect();
      r.push({
        kind: 'gantt', label: bar.className.replace('bar ', ''), s, c,
        dLeft: +(b.left - a.left).toFixed(1), dRight: +(b.right - z.right).toFixed(1),
      });
    });
  }

  // 5. 侧边栏跨屏一致性（三屏宽度 / 导航项数必须一致）
  r.push({
    kind: 'shell',
    widths: [...document.querySelectorAll('.side')].map(x => x.getBoundingClientRect().width),
    navs: [...document.querySelectorAll('.side__nav')].map(x => x.children.length),
  });

  // 6. 对比度实测：文字色按其「真实合成背景」计算，而非所在色带的背景
  const parseC = s => { const m = s.match(/[\d.]+/g); if (!m) return null; return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  function bgOf(el) {
    const stack = []; let n = el;
    while (n) { const c = parseC(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } n = n.parentElement; }
    let out = [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) { const [rr, gg, bb, a] = stack[i]; out = [out[0] * (1 - a) + rr * a, out[1] * (1 - a) + gg * a, out[2] * (1 - a) + bb * a]; }
    return out;
  }
  function contrast(fg, bg) {
    const [rr, gg, bb, a] = fg;
    const mix = [bg[0] * (1 - a) + rr * a, bg[1] * (1 - a) + gg * a, bg[2] * (1 - a) + bb * a];
    const L1 = lum(mix), L2 = lum(bg);
    return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
  }
  const bad = new Map();
  active.querySelectorAll('*').forEach(el => {
    if (el.closest('.dock') || el.closest('[data-deco]')) return;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') return;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const fg = parseC(cs.color), bg = bgOf(el);
    const size = parseFloat(cs.fontSize), weight = parseFloat(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const got = contrast(fg, bg);
    if (got < need) {
      const key = el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0] + '|' + cs.color + '|on rgb(' + bg.map(x => Math.round(x)).join(',') + ')';
      const cur = bad.get(key);
      if (!cur || got < cur.got) bad.set(key, { got: +got.toFixed(2), need, sample: el.textContent.trim().slice(0, 20) });
    }
  });
  for (const [key, v] of bad) r.push({ kind: 'contrast', combo: key, ratio: v.got, need: v.need, sample: v.sample });
  return r;
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
p.on('console', m => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', e => errs.push(String(e)));

await p.goto(pathToFileURL(TARGET).href, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const fonts = await p.evaluate(() => ({
  sansBlack: document.fonts.check('900 64px "Noto Sans SC"'),
  sansBold: document.fonts.check('700 44px "Noto Sans SC"'),
  mono: document.fonts.check('500 11px "JetBrains Mono"'),
  loaded: document.fonts.size,
}));

for (const v of VIEWS) {
  await p.click(`.dock__btn[data-view="${v}"]`);
  await p.waitForTimeout(700);
  const rows = await p.evaluate(measure);
  rows.forEach(x => out.push({ view: v, ...x }));
  const target = v === 'landing' ? '#view-landing' : '.frame';
  const shot = { 'app-today': '02-app-today', 'app-detail': '03-app-detail', 'app-modal': '04-app-modal' }[v];
  if (v === 'landing') {
    await p.screenshot({ path: `${SHOTS}/00-landing-full.png`, fullPage: true });
    await p.evaluate(() => scrollTo(0, 0));
    await p.screenshot({ path: `${SHOTS}/01-landing-hero.png` });
  } else if (v === 'brand' || v === 'notes') {
    await p.screenshot({ path: `${SHOTS}/${v === 'brand' ? '05-brand' : '07-notes'}.png`, fullPage: true });
  } else {
    await p.screenshot({ path: `${SHOTS}/${shot}.png` });
  }
}

// 交互链路实测：屏一 chip → 输入框；开始规划 → 弹层流水线跑完
await p.click('.dock__btn[data-view="app-today"]');
await p.waitForTimeout(200);
await p.click('.chip[data-goal]');
const typed = await p.inputValue('#goalInput');
const before = await p.textContent('#statToday');
await p.click('#subList .sub .box');
const after = await p.textContent('#statToday');
await p.screenshot({ path: `${SHOTS}/08-tristate.png` });
await p.click('#planBtn');
await p.waitForTimeout(900);
const midPct = await p.textContent('#pct');
await p.waitForTimeout(4200);
const endPct = await p.textContent('#pct');
await p.screenshot({ path: `${SHOTS}/09-pipeline-end.png` });
await p.click('#modalApply');
await p.waitForTimeout(600);
const done = await p.evaluate(() => ({
  doneState: document.querySelector('.modal').classList.contains('modal--done'),
  toast: getComputedStyle(document.querySelector('#toast')).visibility,
}));
await p.screenshot({ path: `${SHOTS}/10-applied.png` });

// 屏二：点第 4 行 → 详情面板换内容
await p.click('.dock__btn[data-view="app-detail"]');
await p.waitForTimeout(250);
const t0 = await p.textContent('.panel__title');
await p.click('#detailList .sub[data-card="3"]');
await p.waitForTimeout(250);
const t1 = await p.textContent('.panel__title');
await p.screenshot({ path: `${SHOTS}/11-detail-panel.png` });

// 移动视口（390）：预览壳自身不得横向溢出
await p.setViewportSize({ width: 390, height: 844 });
const mob = [];
for (const v of VIEWS) {
  await p.click(`.dock__btn[data-view="${v}"]`);
  await p.waitForTimeout(400);
  mob.push(await p.evaluate(view => {
    const de = document.documentElement;
    return { view, scrollW: de.scrollWidth, clientW: de.clientWidth, scale: parseFloat(getComputedStyle(document.querySelector('.frame-wrap') || de).getPropertyValue('--s')) || null };
  }, v));
}
await p.screenshot({ path: `${SHOTS}/12-mobile-landing.png`, fullPage: false });

console.log(JSON.stringify({ fonts, typed, tristate: { before, after }, pipeline: { midPct, endPct, ...done }, panel: { t0, t1 }, mobile: mob, consoleErrors: errs, measures: out }, null, 1));
await b.close();
