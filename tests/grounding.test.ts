import { describe, expect, it } from "vitest";
import { BEYOND_PREFIX, groundAnswer, verifyQuote } from "@/lib/grounding";

const PAGE =
  "The stop value is never included. range(5) stops before 5, so the last number is 4. A helpful picture is a row of five fence posts.";

describe("verifyQuote", () => {
  it("accepts an exact quote (case and spacing insensitive)", () => {
    expect(verifyQuote(PAGE, "The  stop value is NEVER included")).toBe(true);
  });

  it("accepts a fuzzy quote at exactly 90% (9 of 10 words in order)", () => {
    expect(verifyQuote(PAGE, "range 5 stops before 5 so the last digit is")).toBe(true);
  });

  it("rejects a fuzzy quote below 90% (7 of 10 words)", () => {
    expect(verifyQuote(PAGE, "range 5 stops before 5 so a final digit is")).toBe(false);
  });

  it("rejects a quote that is not on the page", () => {
    expect(verifyQuote(PAGE, "A while loop repeats as long as a condition stays true")).toBe(false);
  });

  it("rejects very short or empty quotes", () => {
    expect(verifyQuote(PAGE, "the")).toBe(false);
    expect(verifyQuote(PAGE, "")).toBe(false);
  });
});

describe("groundAnswer", () => {
  const pages = new Map([
    [5, PAGE],
    [6, "An off-by-one error runs one time too many or too few."],
  ]);

  it("keeps valid citations and does not flag the answer", () => {
    const r = groundAnswer(
      "range stops before the end value (p. 5). Off-by-one bugs live here (pp. 5-6).",
      pages,
    );
    expect(r.beyond).toBe(false);
    expect(r.citedPages).toEqual([5, 6]);
    expect(r.stripped).toBe(0);
  });

  it("strips a citation to a page that does not exist and flags the answer", () => {
    const r = groundAnswer("Loops repeat things (p. 99).", pages);
    expect(r.text).not.toContain("p. 99");
    expect(r.beyond).toBe(true);
    expect(r.text.startsWith(BEYOND_PREFIX)).toBe(true);
    expect(r.stripped).toBe(1);
  });

  it("strips a fabricated quote with its citation", () => {
    const r = groundAnswer(
      'As the book says, "loops are always faster than recursion in Python" (p. 5). Try it.',
      pages,
    );
    expect(r.text).not.toContain("always faster");
    expect(r.beyond).toBe(true);
  });

  it("keeps a verified quote", () => {
    const r = groundAnswer('The book says "the stop value is never included" (p. 5).', pages);
    expect(r.text).toContain("never included");
    expect(r.beyond).toBe(false);
  });

  it("accepts a markdown-bolded Beyond label and rewrites it to plain text", () => {
    const r = groundAnswer("**Beyond your uploaded material:** pandas is a data library.", pages);
    expect(r.beyond).toBe(true);
    expect(r.text).toBe("Beyond your uploaded material: pandas is a data library.");
    const r2 = groundAnswer("**Beyond your uploaded material**: pandas is a data library.", pages);
    expect(r2.beyond).toBe(true);
    expect(r2.text.startsWith("Beyond your uploaded material:")).toBe(true);
  });

  it("honours an explicit Beyond prefix from the model", () => {
    const r = groundAnswer(`${BEYOND_PREFIX} pandas is a data library.`, pages);
    expect(r.beyond).toBe(true);
    expect(r.text.match(/Beyond your uploaded material/g)).toHaveLength(1);
  });
});
