import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { BLOOM_CHROMATIC } from "@/lib/design-tokens";

import { ChromaticTag } from "./chromatic-tag";
import { ChromaticTrack } from "./chromatic-track";

/** FB-19：暖纸底上的层级标记走时间色谱，而不是旧的统一黄 */
test("层级标签用该层级的色谱色并显示层级名", () => {
  const markup = renderToStaticMarkup(<ChromaticTag level={3} />);
  expect(markup).toContain("L3 应用");
  expect(markup).toContain(BLOOM_CHROMATIC[3]);
  expect(markup).not.toContain("#F5C518");
});

test("层级越界时夹到边界，不崩也不出色外颜色", () => {
  const high = renderToStaticMarkup(<ChromaticTag level={99} />);
  expect(high).toContain("L6 创造");
  expect(high).toContain(BLOOM_CHROMATIC[6]);

  const low = renderToStaticMarkup(<ChromaticTag level={0} />);
  expect(low).toContain("L1 识记");
  expect(low).toContain(BLOOM_CHROMATIC[1]);
});

test("色轨渲染六段，缺席层级降到低透明度", () => {
  const all = renderToStaticMarkup(<ChromaticTrack />);
  expect(all).toContain(BLOOM_CHROMATIC[1]);
  expect(all).toContain(BLOOM_CHROMATIC[6]);

  const partial = renderToStaticMarkup(<ChromaticTrack levels={[1, 2]} />);
  expect(partial).toContain("opacity:1");
  expect(partial).toContain("opacity:0.18");
});
