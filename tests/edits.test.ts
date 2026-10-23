import { describe, expect, it } from "vitest";
import {
  applyEdits,
  describeEdits,
  editsStillApply,
  fromToolInput,
  validateEdits,
} from "@/lib/ide/edits";

const files = {
  "main.py":
    "def sum_to(n):\n    total = 0\n    for i in range(1, n):\n        total += i\n    return total\n",
};
const fix = {
  file: "main.py",
  startLine: 3,
  endLine: 3,
  newText: "    for i in range(1, n + 1):",
  explanation: "Include n.",
};
const comment = {
  file: "main.py",
  startLine: 3,
  endLine: 2,
  newText: "    # Guru: check what range(1, n) includes",
  explanation: "A pointer.",
};

describe("validateEdits", () => {
  it("accepts a valid edit and records the lines it replaces", () => {
    const r = validateEdits([fix], files, true);
    expect(r.edits).toHaveLength(1);
    expect(r.edits[0].before).toEqual(["    for i in range(1, n):"]);
    expect(r.rejected).toEqual([]);
  });

  it("allows small non-solution edits before the solution is unlocked, and caps their size", () => {
    expect(validateEdits([comment], files, false).edits).toHaveLength(1);
    const big = { ...fix, startLine: 1, endLine: 5, newText: "a\nb\nc\nd\ne" };
    const r = validateEdits([big], files, false);
    expect(r.edits).toHaveLength(0);
    expect(r.rejected[0]).toContain("small");
  });

  it("never gates coding that isn't the exercise, but still gates the exercise itself", () => {
    const other = {
      ...fix,
      startLine: 6,
      endLine: 5,
      newText: "def is_even(n):\n    return n % 2 == 0\n\nprint(is_even(4))\nprint(is_even(5))",
      scope: "other" as const,
    };
    const gatedFix = { ...fix, newText: "a\nb\nc\nd", scope: "exercise" as const };
    const r = validateEdits([other, gatedFix], files, false);
    expect(r.edits.map((e) => e.scope)).toEqual(["other"]);
    expect(r.rejected.join(" ")).toContain("exercise");
  });

  it("drops the trailing newline models add, so no blank line is inserted", () => {
    const [e] = validateEdits([{ ...comment, newText: "    # a note\n" }], files, false).edits;
    expect(e.newText).toBe("    # a note");
    expect(applyEdits(files, [e])["main.py"].split("\n")).toHaveLength(
      files["main.py"].split("\n").length + 1,
    );
  });

  it("limits how many edits arrive at once while locked", () => {
    const r = validateEdits([comment, comment, comment], files, false);
    expect(r.edits.length).toBeLessThanOrEqual(2);
  });

  it("drops edits for missing files, out-of-range lines and malformed input", () => {
    expect(validateEdits([{ ...fix, file: "nope.py" }], files, true).edits).toHaveLength(0);
    expect(validateEdits([{ ...fix, startLine: 40, endLine: 40 }], files, true).edits).toHaveLength(
      0,
    );
    expect(validateEdits([{ file: "main.py" }, "junk", null], files, true).edits).toHaveLength(0);
  });
});

describe("applyEdits", () => {
  it("replaces, inserts and deletes lines", () => {
    const e = validateEdits([fix], files, true).edits;
    expect(applyEdits(files, e)["main.py"].split("\n")[2]).toBe("    for i in range(1, n + 1):");
    const ins = validateEdits([comment], files, false).edits;
    const lines = applyEdits(files, ins)["main.py"].split("\n");
    expect(lines[2]).toBe("    # Guru: check what range(1, n) includes");
    expect(lines[3]).toBe("    for i in range(1, n):");
    const del = validateEdits([{ ...fix, newText: "" }], files, true).edits;
    expect(applyEdits(files, del)["main.py"].split("\n")).toHaveLength(4 + 1);
  });

  it("applies several edits in one file without shifting each other's line numbers", () => {
    const two = validateEdits(
      [
        {
          file: "main.py",
          startLine: 2,
          endLine: 2,
          newText: "    total = 0  # start",
          explanation: "a",
        },
        {
          file: "main.py",
          startLine: 3,
          endLine: 3,
          newText: "    for i in range(1, n + 1):\n        pass",
          explanation: "b",
        },
      ],
      files,
      true,
    ).edits;
    const lines = applyEdits(files, two)["main.py"].split("\n");
    expect(lines[1]).toBe("    total = 0  # start");
    expect(lines[2]).toBe("    for i in range(1, n + 1):");
    expect(lines[3]).toBe("        pass");
  });
});

describe("staleness and preview", () => {
  it("detects that the student changed the code after the suggestion", () => {
    const edits = validateEdits([fix], files, true).edits;
    expect(editsStillApply(files, edits)).toBe(true);
    expect(
      editsStillApply({ "main.py": files["main.py"].replace("range(1, n)", "range(0, n)") }, edits),
    ).toBe(false);
  });

  it("describes what would change", () => {
    const [h] = describeEdits(validateEdits([fix], files, true).edits);
    expect(h.removed).toEqual(["    for i in range(1, n):"]);
    expect(h.added).toEqual(["    for i in range(1, n + 1):"]);
  });

  it("maps the tool's snake_case input", () => {
    expect(
      fromToolInput({ file: "a", start_line: 2, end_line: 3, new_text: "x", explanation: "y" }),
    ).toEqual({ file: "a", startLine: 2, endLine: 3, newText: "x", explanation: "y" });
  });
});
