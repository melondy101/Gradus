import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Card, CardFooter } from "./card";

test("CardFooter stays inside its overflow-hidden Card", () => {
  const markup = renderToStaticMarkup(
    <Card size="sm">
      <CardFooter>底栏操作</CardFooter>
    </Card>,
  );

  expect(markup).not.toContain("-mb-");
});
