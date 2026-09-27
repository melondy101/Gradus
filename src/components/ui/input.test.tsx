import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Textarea } from "./input";

test("Textarea onDark preserves readable dark-panel focus styling", () => {
  const markup = renderToStaticMarkup(<Textarea onDark />);

  expect(markup).toContain("text-on-dark");
  expect(markup).toContain("placeholder:text-on-dark-3");
  expect(markup).toContain("focus:border-accent");
});
