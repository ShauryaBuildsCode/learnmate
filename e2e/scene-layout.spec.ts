import { expect, test } from "@playwright/test";

/**
 * Renders every scene type with worst-case content (see app/scenes/qa) at a settled frame and checks the layout:
 * no text is cut off by the frame, nothing sits in the caption zone, and no two pieces of text overlap.
 */
test("scenes keep every word inside the frame, clear of the captions and of each other", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto("/scenes/qa");
  await page.waitForTimeout(1200);
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    for (const fig of Array.from(document.querySelectorAll("figure"))) {
      const name = fig.getAttribute("data-qa") ?? "?";
      const frame = fig.querySelector("div > div") as HTMLElement; // the clipped 640x360 viewport
      const box = frame.getBoundingClientRect();
      const caption = fig.querySelector("[data-caption]") as HTMLElement | null;
      const capBox = caption?.getBoundingClientRect();
      const texts: { el: Element; r: DOMRect; t: string }[] = [];
      const walker = document.createTreeWalker(fig, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = (n.textContent ?? "").trim();
        const el = n.parentElement;
        if (!t || !el || el.tagName === "FIGCAPTION" || el.closest("figcaption")) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        texts.push({ el, r, t });
      }
      for (const { el, r, t } of texts) {
        const inCaption = !!caption?.contains(el);
        if (
          r.left < box.left - 1 ||
          r.right > box.right + 1 ||
          r.top < box.top - 1 ||
          r.bottom > box.bottom + 1
        )
          out.push(`${name}: "${t.slice(0, 30)}" is cut off by the frame`);
        if (
          !inCaption &&
          capBox &&
          r.bottom > capBox.top + 2 &&
          r.top < capBox.bottom - 2 &&
          r.right > capBox.left &&
          r.left < capBox.right
        )
          out.push(`${name}: "${t.slice(0, 30)}" runs into the caption`);
      }
      const content = texts.filter((x) => !caption?.contains(x.el));
      for (let i = 0; i < content.length; i++)
        for (let j = i + 1; j < content.length; j++) {
          const a = content[i].r;
          const b = content[j].r;
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          // tight headings legitimately share a few pixels of line box; real collisions overlap by a third or more
          if (w > 3 && h > 3 && h > 0.35 * Math.min(a.height, b.height))
            out.push(
              `${name}: "${content[i].t.slice(0, 24)}" overlaps "${content[j].t.slice(0, 24)}"`,
            );
        }
    }
    return out;
  });
  expect(problems, problems.join("\n")).toEqual([]);
});
