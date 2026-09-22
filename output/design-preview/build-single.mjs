/* 把 css/ + js/ 内联成单文件，产物可直接发给设计同学双击打开。
   跑法：在仓库根执行 `node output/design-preview/build-single.mjs` */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'D:/Develop/Gradus/output/design-preview';
const DEST = 'D:/Develop/Gradus/output/拾级Gradus-设计预览.html';

const read = p => readFileSync(`${SRC}/${p}`, 'utf8');
let html = read('index.html');

const CSS = ['css/base.css', 'css/landing.css', 'css/app.css'];
const LINK_RE = /^\s*<link rel="stylesheet" href="css\/[^"]+">\n/gm;
if ((html.match(LINK_RE) || []).length !== CSS.length) {
  throw new Error(`样式表占位数量对不上：期望 ${CSS.length}，实际 ${(html.match(LINK_RE) || []).length}`);
}
html = html.replace(LINK_RE, '');

const style = CSS.map(f => `/* ══ ${f} ══ */\n${read(f).trim()}`).join('\n\n');
if (/<\/style/i.test(style)) throw new Error('CSS 内含 </style>，无法内联');
/* 必须用函数形式回传：替换串里的 $$ 会被 String.replace 当成转义，
   而 preview.js 里的 `const $$` 正好会被压成 `const $` 造成重复声明 */
html = html.replace('</head>', () => `  <style>\n${style}\n  </style>\n</head>`);

const SCRIPT_RE = /^\s*<script src="js\/preview\.js"><\/script>\n/gm;
/* 注意：/g 正则的 .test() 会推进 lastIndex，这里只用 includes 判断再交给 replace */
if (!html.includes('<script src="js/preview.js"></script>')) throw new Error('未找到 js/preview.js 的 script 占位');
html = html.replace(SCRIPT_RE, '');
let js = read('js/preview.js').trim();
/* 内联后 </script> 会提前闭合标签，必须转义 */
js = js.replace(/<\/script/gi, '<\\/script');
html = html.replace('</body>', () => `  <script>\n${js}\n  </script>\n</body>`);

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
html = html.replace('<meta charset="UTF-8">', () =>
  `<meta charset="UTF-8">\n<!-- 单文件导出件，由 build-single.mjs 生成于 ${stamp} UTC。\n     改样式/交互请改 design-preview/ 源目录后重新构建，不要直接编辑本文件。\n     字体走 Google Fonts CDN；离线时回退 PingFang / 雅黑 + 系统等宽，版式不变。 -->`);

writeFileSync(DEST, html, 'utf8');

/* 回读校验：内联块必须与源文件逐字节一致，防止 $ 转义之类的静默改写 */
const back = readFileSync(DEST, 'utf8');
const got = back.slice(back.lastIndexOf('<script>') + 8, back.lastIndexOf('</script>')).trim();
if (got !== js) throw new Error(`内联 JS 与源文件不一致（源 ${js.length} 字符 / 实际 ${got.length}）——疑似 $ 转义被吃掉`);
for (const f of CSS) if (!back.includes(read(f).trim().slice(0, 200))) throw new Error(`${f} 未完整内联`);

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
const refs = [...html.matchAll(/(?:href|src)="(?!#|data:)([^"]+)"/g)].map(m => m[1]);
console.log(`✓ ${DEST}\n  ${kb} KB · 外链 ${refs.length ? refs.join(', ') : '无（仅字体 CDN）'}`);
