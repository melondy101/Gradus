/* ═══════════════════════════════════════════════════════════
   拾级 Gradus · preview.js
   纯前端演示交互 —— 不含任何真实业务逻辑，全部数据均为占位。
   ═══════════════════════════════════════════════════════════ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── 1 · 预览外壳：1440 画板按窗口宽度等比缩放 ────────── */
const FRAME_W = 1440;
function fitFrames() {
  const avail = document.documentElement.clientWidth - 56;
  const s = Math.min(1, Math.max(0.2, avail / FRAME_W));
  $$('.frame-wrap').forEach(w => w.style.setProperty('--s', s.toFixed(4)));
}
addEventListener('resize', fitFrames, { passive: true });

/* ── 2 · 视图切换 ─────────────────────────────────────── */
function showView(name, { scroll = true } = {}) {
  $$('.view').forEach(v => v.classList.toggle('is-active', v.id === `view-${name}`));
  $$('.dock__btn').forEach(b => b.classList.toggle('is-active', b.dataset.view === name));
  if (scroll) scrollTo({ top: 0, behavior: 'instant' });
}
$$('.dock__btn').forEach(b => b.addEventListener('click', () => {
  closePipeline(false);
  showView(b.dataset.view);
  /* 屏三的设计稿本身就是「屏一 + 弹层」，直接进入时恢复静态态 */
  if (b.dataset.view === 'app-modal') openVeilStatic();
}));

/* ── 3 · Landing：吸顶阴影 / 锚点高亮 / 订阅 ──────────── */
const lpNav = $('#lpNav');
const navLinks = $$('.lp-nav__links a');
const sections = navLinks
  .map(a => document.getElementById(a.getAttribute('href').slice(1)))
  .filter(Boolean);

function onScroll() {
  if (lpNav) lpNav.classList.toggle('is-stuck', scrollY > 8);
  const y = scrollY + 140;
  let here = null;
  sections.forEach(s => { if (s.offsetTop <= y) here = s.id; });
  navLinks.forEach(a => a.classList.toggle('is-here', a.getAttribute('href') === `#${here}`));
}
addEventListener('scroll', onScroll, { passive: true });

$$('a[href^="#sec-"]').forEach(a => a.addEventListener('click', e => {
  const t = document.getElementById(a.getAttribute('href').slice(1));
  if (!t) return;
  e.preventDefault();
  scrollTo({ top: t.offsetTop - 92, behavior: 'smooth' });
}));

const subForm = $('#subscribe');
if (subForm) subForm.addEventListener('submit', e => {
  e.preventDefault();
  const input = $('.subscribe__input', subForm);
  const hint = $('#subHint');
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
  subForm.classList.toggle('shake', !ok);
  setTimeout(() => subForm.classList.remove('shake'), 400);
  hint.textContent = ok ? '演示状态：已订阅，实际项目将写入你的库。' : '演示状态：邮箱格式不正确。';
  hint.classList.toggle('is-ok', ok);
  if (ok) input.value = '';
});

/* ── 4 · 屏一：复选框三态 + 统计联动（纯视觉） ────────── */
const STATE_CYCLE = { todo: 'done', done: 'live', live: 'todo' };
const statToday = $('#statToday');

function refreshTodayCount() {
  const rows = $$('#subList .sub');
  if (!rows.length || !statToday) return;
  statToday.textContent = rows.filter(r => r.dataset.state !== 'done').length;
}
const subList = $('#subList');
if (subList) subList.addEventListener('click', e => {
  const box = e.target.closest('.box');
  if (!box) return;
  const row = box.closest('.sub');
  const next = STATE_CYCLE[row.dataset.state || 'todo'];
  row.dataset.state = next;
  row.classList.toggle('is-done', next === 'done');
  row.classList.toggle('is-live', next === 'live');
  const line = $('.sub__c p', row);
  if (line) line.textContent = next === 'done' ? '已完成 · 刚刚'
    : next === 'live' ? '进行中 · 预计今天 21:00 前'
    : '待开始 · 09-21 20:30';
  refreshTodayCount();
});

$$('.chip[data-goal]').forEach(c => c.addEventListener('click', () => {
  const input = $('#goalInput');
  input.value = c.dataset.goal;
  input.focus();
}));

const planBtn = $('#planBtn');
if (planBtn) planBtn.addEventListener('click', () => {
  showView('app-modal');
  runPipeline();
});

/* ── 5 · 屏三：AI 规划流水线（模拟节奏，无真实请求） ──── */
const veil = $('#veil');
const modal = veil && $('.modal', veil);
const stageBar = $('#stageBar');
const pct = $('#pct');
const nodes = $$('#pipe .pnode');
const lines = $$('#pipe .pline');
const STAGES = [
  { name: '意图解析', desc: '解析目标语义、 topic 分类、紧急度与既有基础，估计总投入工时。', bar: 100 },
  { name: '资源检索', desc: '由 8 条搜索意图经白名单域名检索真实链接，并做存活 / 权威 / 新鲜度三维校验。', bar: 100 },
  { name: '计划生成', desc: '依据意图与已校验资源生成 4～8 个子任务，按 Bloom 层级排序并逐条寻找可用日期槽位。', bar: 62 },
  { name: '核查修订', desc: 'VALIDATE 段对层级跨度与资源可达性打分，未达阈值则自动重排一版。', bar: 100 },
];
let timers = [];

function clearTimers() { timers.forEach(clearTimeout); timers = []; }
function paintStage(i, partial) {
  if (!nodes.length) return;
  nodes.forEach((n, k) => {
    n.classList.toggle('is-done', k < i);
    n.classList.toggle('is-live', k === i);
  });
  lines.forEach((l, k) => {
    l.classList.toggle('is-done', k < i);
    l.classList.toggle('is-live', k === i);
  });
  const head = $('.stage-card .eyebrow');
  if (head) head.textContent = `Stage ${i + 1} · ${STAGES[i].name}`;
  const desc = $('.stage-card__desc');
  if (desc) desc.textContent = STAGES[i].desc;
  if (stageBar) stageBar.style.width = `${partial}%`;
  if (pct) pct.textContent = `${Math.round(partial)}%`;
}
function resetPipeline() {
  if (!modal) return;
  modal.classList.remove('modal--done');
  paintStage(2, 62);
}
function openVeilStatic() {
  if (!veil) return;
  clearTimers();
  veil.classList.remove('is-off');
  resetPipeline();
}
function runPipeline() {
  if (!veil) return;
  clearTimers();
  veil.classList.remove('is-off');
  modal.classList.remove('modal--done');
  [0, 1, 2, 3].forEach(i => {
    timers.push(setTimeout(() => paintStage(i, 18 + i * 26), 320 + i * 1150));
  });
  timers.push(setTimeout(() => {
    const head = $('.stage-card .eyebrow');
    if (head) head.textContent = 'Stage 4 · 核查完成';
    const desc = $('.stage-card__desc');
    if (desc) desc.textContent = 'VALIDATE 评分 88 / 100，Bloom 层级跨度检查通过 5 / 5，无需重排。计划已就绪，可应用至日程。';
    if (stageBar) stageBar.style.width = '100%';
    if (pct) pct.textContent = '100%';
    nodes.forEach(n => { n.classList.add('is-done'); n.classList.remove('is-live'); });
    lines.forEach(l => { l.classList.add('is-done'); l.classList.remove('is-live'); });
  }, 320 + 4 * 1150));
}
function closePipeline(animate = true) {
  clearTimers();
  if (!veil) return;
  veil.classList.add('is-off');
  if (animate) setTimeout(resetPipeline, 260);
}
if (veil) {
  veil.addEventListener('click', e => { if (e.target === veil) closePipeline(); });
  $('#modalX').addEventListener('click', () => closePipeline());
  $('#modalCancel').addEventListener('click', () => closePipeline());
  $('#modalApply').addEventListener('click', () => {
    clearTimers();
    modal.classList.add('modal--done');
    const toast = $('#toast');
    toast.classList.add('is-on');
    timers.push(setTimeout(() => { toast.classList.remove('is-on'); }, 2600));
    timers.push(setTimeout(() => { closePipeline(); resetPipeline(); }, 3400));
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && !veil.classList.contains('is-off')) closePipeline();
  });
}

/* ── 6 · 屏二：子任务清单 ↔ 详情面板（占位数据） ──────── */
const CARDS = [
  {
    badge: '已完成 · L2', cls: 'badge--done', title: '假名与发音定型',
    level: 'Bloom L2 理解', hours: '4.0 小时', range: '09.10 – 09.13', prio: '中',
    desc: '清音、浊音、半浊音与促音/长音的辨认与朗读，建立发音肌肉记忆。收尾标准：看到假名能在 1 秒内读出，听写 46 音错 ≤ 2。',
    res: [['五十音图与发音要点 · 第 1 讲', 'ok', 'VERIFIED', 'jp-nihongo.edu.cn · 权威 0.91'],
          ['假名书写笔顺动画合集', 'search', 'SEARCH ONLY', '未配 TAVILY_API_KEY · 跳转搜索自选']],
    acts: ['跟读 46 音三遍并录音回听', '听写测试错 ≤ 2 即通过', '整理易混假名（し/つ、ぬ/め）对照卡'],
  },
  {
    badge: '进行中 · L4', cls: 'badge--live', title: 'N4 语法收尾：助词与被动表达',
    level: 'Bloom L4 分析', hours: '3.5 小时', range: '09.19 – 09.21', prio: '高',
    desc: '把は/が、に/で、を的边界一次理清，并把被动、使役、使役被动四种形态做成对照表。收尾标准：能在 30 分钟内把 20 个主动句改写为被动与使役句且不错。',
    res: [['日本語文法概説 · 第 4 章 受身形', 'ok', 'VERIFIED', 'tokyo-term-learner.jp · 权威 0.86'],
          ['使役受身の使い方 · 例文 60 本', 'search', 'SEARCH ONLY', '未配 TAVILY_API_KEY · 跳转搜索自选']],
    acts: ['整理 は/が 各 8 条例句并标注语义差异', '做被动 ↔ 使役 ↔ 使役被动转换表 20 行', '计时改写 20 句，错 ≤ 2 即通过'],
  },
  {
    badge: '计划中 · L4', cls: 'badge--plan', title: '敬语与书面表达入门',
    level: 'Bloom L4 分析', hours: '5.0 小时', range: '09.22 – 09.25', prio: '中',
    desc: '尊敬语、谦让语、丁宁语三分法与切换场景，重点练邮件与问卷两类书面语料。排期落在深工作槽位 20:30，避开上午的低密度时段。',
    res: [['敬语的三种形态与使用边界', 'ok', 'VERIFIED', 'keigo-guide.or.jp · 权威 0.78'],
          ['N3 语法 · 敬语专项 120 题', 'ok', 'VERIFIED', 'jlpt-prep.jp · 权威 0.83']],
    acts: ['把 10 句普通体改写为丁宁体并互查', '写一封 200 字日语请假邮件', '完成敬语专项 120 题，正确率 ≥ 80%'],
  },
  {
    badge: '计划中 · L5', cls: 'badge--plan', title: 'N3 真题模考与复盘',
    level: 'Bloom L5 评价', hours: '8.0 小时', range: '09.26 – 09.29', prio: '高',
    desc: '两套完整真题限时模考，按词汇/语法/阅读/听力分项打分，定位失分模式并回写到后续子任务。这是本阶段的认知顶点，前置层级未过不建议开始。',
    res: [['N3 历年真题与官方解析（PDF）', 'ok', 'VERIFIED', 'jlpt.go.jp · 权威 0.97'],
          ['听力 · 即时问题语速适应训练', 'search', 'SEARCH ONLY', '未配 TAVILY_API_KEY · 跳转搜索自选']],
    acts: ['限时完成模考 A 卷并记录分项分', '把错题按语法点归类成清单', '针对最低分项追加一个 2 天子任务'],
  },
];

function renderPanel(i) {
  const d = CARDS[i];
  const panel = $('#panel');
  if (!d || !panel) return;
  panel.innerHTML = `
    <div class="badge ${d.cls}">${d.badge}</div>
    <h3 class="panel__title">${d.title}</h3>
    <div class="meta2">
      <div><p class="label-mono">认知层级</p><b>${d.level}</b></div>
      <div><p class="label-mono">深工作时长</p><b>${d.hours}</b></div>
      <div><p class="label-mono">排期</p><b>${d.range}</b></div>
      <div><p class="label-mono">优先级</p><b>${d.prio}</b></div>
    </div>
    <p class="panel__p">${d.desc}</p>
    <p class="label-mono">学习资源 · ${d.res.length}</p>
    ${d.res.map(r => `<a class="res" href="#"><span class="res__t">${r[0]}</span>
      <span class="res__m mono"><i class="${r[1]}">${r[2]}</i>${r[3]}</span></a>`).join('')}
    <p class="label-mono">行动项 · ${d.acts.length}</p>
    <ol class="acts">${d.acts.map(a => `<li>${a}</li>`).join('')}</ol>
    <div class="panel__foot">
      <button class="btn btn--app btn--full" data-complete="${i}">${d.cls === 'badge--done' ? '已完成此项' : '完成此项'}</button>
      <button class="btn btn--ghost btn--full">稍后</button>
    </div>`;
}

const detailList = $('#detailList');
if (detailList) {
  $$('#detailList .sub').forEach((li, k) => li.addEventListener('click', () => {
    $$('#detailList .sub').forEach(x => x.classList.remove('is-sel'));
    li.classList.add('is-sel');
    renderPanel(+li.dataset.card);
  }));
  detailList.addEventListener('click', e => {
    const btn = e.target.closest('[data-complete]');
    if (!btn) return;
    const row = $$('#detailList .sub')[+btn.dataset.complete];
    row.classList.remove('is-live');
    row.classList.add('is-done');
    $('.mk', row).className = 'mk mk--done';
    $('.mk', row).textContent = '✓';
    $('.sub__c p', row).textContent = '已完成 · 刚刚';
    renderPanel(+btn.dataset.complete);
  });
}

/* ── 7 · boot ─────────────────────────────────────────── */
fitFrames();
onScroll();
refreshTodayCount();
resetPipeline();
$$('#detailList .sub')[1]?.classList.add('is-sel');
