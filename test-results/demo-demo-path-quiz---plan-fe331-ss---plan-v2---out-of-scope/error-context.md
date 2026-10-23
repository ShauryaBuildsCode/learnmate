# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo.spec.ts >> demo path: quiz -> plan v1 -> lesson -> checkpoint -> IDE fail then pass -> plan v2 -> out-of-scope
- Location: e2e/demo.spec.ts:16:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[role="list"] > button').first()
Expected: visible
Timeout: 180000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[role="list"] > button').first() with timeout 180000ms
  - waiting for locator('[role="list"] > button').first()

```

```yaml
- alert
- banner:
  - 'link "Python Foundations: Loops and Lists"':
    - /url: /course/5e52b9da-41b1-41fd-814c-69ec02720546
  - heading "Introduction to Loops" [level=1]
  - button "Open editor"
  - button "Switch language to Hindi": हिन्दी
  - button "Toggle theme"
- region "Lesson":
  - alert:
    - paragraph: The AI's lesson wasn't usable. Please try again.
    - button "Try again"
  - heading "Practice" [level=2]
  - button "Exercise 1 · Python" [pressed]
- complementary "Code editor":
  - combobox "Language":
    - option "Python" [selected]
    - option "JavaScript"
    - option "HTML / CSS / JS"
    - option "React"
    - option "C"
    - option "C++"
    - option "Java"
    - option "Go"
    - option "Rust"
  - button "Run"
  - button "Check"
  - button "Reset"
  - button "Ask Guru"
  - paragraph: Write a function make_list(n) that returns a list of numbers from 0 up to n - 1 using a loop.
  - code:
    - textbox "Editor content"
  - tablist:
    - tab "Console" [selected]
    - tab "Tests"
    - tab "Input"
  - paragraph: Run your code to see output here. (Ctrl/Cmd + Enter)
- region "Guru, your tutor":
  - heading "Guru" [level=2]
  - paragraph: Your tutor. Sees your code, cites your pages.
  - button "Close Guru"
  - paragraph: Ask me anything about this lesson, or press Hint when you get stuck. I will ask questions before I give answers.
  - button "Hint 1/3"
  - button "Review my code"
  - textbox "Ask Guru":
    - /placeholder: Ask Guru…
  - button "Send" [disabled]
- alert
- alert
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { quizQuestionSchema } from "../lib/schemas/content";
  3   | import { resetDemoCourse, setEditorCode, signIn, userClient } from "./support";
  4   | 
  5   | const BUGGY = "def sum_to(n):\n    total = 0\n    for i in range(1, n):\n        total += i\n    return total\n";
  6   | const FIXED = "def sum_to(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n";
  7   | 
  8   | test.describe.configure({ mode: "serial" });
  9   | 
  10  | let courseId = "";
  11  | 
  12  | test.beforeAll(async () => {
  13  |   courseId = await resetDemoCourse();
  14  | });
  15  | 
  16  | test("demo path: quiz -> plan v1 -> lesson -> checkpoint -> IDE fail then pass -> plan v2 -> out-of-scope", async ({ page }) => {
  17  |   await signIn(page);
  18  |   await page.goto(`/course/${courseId}`);
  19  | 
  20  |   // Topic map with page chips and exercises found
  21  |   await expect(page.getByRole("heading", { name: "Topic map" })).toBeVisible();
  22  |   await expect(page.getByText("Pages:").first()).toBeVisible();
  23  | 
  24  |   // Diagnostic quiz: answer the first three topics (loops) wrong, everything else right.
  25  |   await page.getByRole("button", { name: "Start diagnostic quiz" }).click();
  26  |   await expect(page.getByRole("radio").first()).toBeVisible();
  27  |   const { client } = await userClient();
  28  |   const { data: attempt } = await client
  29  |     .from("quiz_attempts")
  30  |     .select("questions")
  31  |     .eq("course_id", courseId)
  32  |     .order("created_at", { ascending: false })
  33  |     .limit(1)
  34  |     .single();
  35  |   const questions = quizQuestionSchema.array().parse(attempt!.questions);
  36  |   const { data: topics } = await client.from("topics").select("id").eq("course_id", courseId).order("position");
  37  |   const loopTopics = new Set(topics!.slice(0, 3).map((t) => t.id));
  38  | 
  39  |   for (let i = 0; i < questions.length; i++) {
  40  |     const q = questions[i];
  41  |     const wrong = loopTopics.has(q.topicId);
  42  |     const pick = wrong ? (q.correctIndex + 1) % 4 : q.correctIndex;
  43  |     await page.getByRole("radio").nth(pick).click();
  44  |     await expect(page.getByText("Groq").first()).toBeVisible(); // instant feedback badge
  45  |     await page.getByRole("button", { name: i === questions.length - 1 ? "Finish quiz" : "Next question" }).click();
  46  |   }
  47  | 
  48  |   // Plan v1 ranks a loop topic first
  49  |   await expect(page.getByText("You got")).toBeVisible();
  50  |   await page.getByRole("button", { name: "Close" }).click();
  51  |   await expect(page.getByRole("heading", { name: "Revision plan" })).toBeVisible();
  52  |   await expect(page.getByText("v1", { exact: true }).first()).toBeVisible();
  53  |   const firstItem = page.getByRole("region", { name: "Revision plan" }).getByRole("listitem").first();
  54  |   await expect(firstItem.getByText("weak").first()).toBeVisible();
  55  | 
  56  |   // Lesson: play to the checkpoint and the IDE opens with the exercise
  57  |   await firstItem.getByRole("link", { name: "Open lesson" }).click();
  58  |   await page.waitForURL("**/learn/**");
  59  |   const timeline = page.locator('[role="list"] > button');
> 60  |   await expect(timeline.first()).toBeVisible({ timeout: 180_000 });
      |                                  ^ Error: expect(locator).toBeVisible() failed
  61  |   await expect(page.getByText("Source:").first()).toBeVisible();
  62  |   await timeline.last().click();
  63  |   await page.getByRole("button", { name: /play video/i }).first().click();
  64  |   await expect(page.getByRole("complementary", { name: "Code editor" })).toBeVisible({ timeout: 60_000 });
  65  | 
  66  |   // Buggy code fails
  67  |   await setEditorCode(page, BUGGY);
  68  |   await page.getByRole("button", { name: "Run" }).click();
  69  |   await expect(page.getByText(/exit \d/)).toBeVisible({ timeout: 120_000 });
  70  |   await page.getByRole("button", { name: "Check" }).click();
  71  |   await expect(page.getByText(/\d of \d tests passed/)).toBeVisible({ timeout: 60_000 });
  72  |   await expect(page.getByText("0 of 3 tests passed")).toBeVisible();
  73  | 
  74  |   // Guru: hint ladder, then a grounded question with a page citation
  75  |   const guru = page.getByRole("region", { name: "Guru, your tutor" });
  76  |   await guru.getByRole("button", { name: /Hint 1\/3/ }).click();
  77  |   await expect(guru.getByText("Claude").first()).toBeVisible({ timeout: 90_000 });
  78  |   await guru.getByLabel("Ask Guru").fill("why does range stop before 5?");
  79  |   await guru.getByRole("button", { name: "Send" }).click();
  80  |   await expect(guru.getByRole("button", { name: /^p\. \d+$/ }).first()).toBeVisible({ timeout: 90_000 });
  81  | 
  82  |   // Fix it: all tests pass and a new plan version appears with a change banner
  83  |   await setEditorCode(page, FIXED);
  84  |   await page.getByRole("button", { name: "Check" }).click();
  85  |   await expect(page.getByText("3 of 3 tests passed")).toBeVisible({ timeout: 60_000 });
  86  |   await expect(page.getByText(/Plan v2 is ready/)).toBeVisible({ timeout: 120_000 });
  87  |   await page.goto(`/course/${courseId}`);
  88  |   await expect(page.getByText("What changed in v2")).toBeVisible();
  89  | 
  90  |   // Out-of-scope question gets the amber banner
  91  |   await page.goto(`/learn/${(await client.from("topics").select("id").eq("course_id", courseId).order("position").limit(1).single()).data!.id}`);
  92  |   const guru2 = page.getByRole("region", { name: "Guru, your tutor" });
  93  |   await guru2.getByLabel("Ask Guru").fill("how do I use pandas?");
  94  |   await guru2.getByRole("button", { name: "Send" }).click();
  95  |   await expect(guru2.getByRole("note")).toContainText("Beyond your uploaded material", { timeout: 90_000 });
  96  | });
  97  | 
  98  | test("IDE runs HTML and C++ programs", async ({ page }) => {
  99  |   await signIn(page);
  100 |   await page.goto("/playground");
  101 | 
  102 |   await page.getByLabel("Language").selectOption("html");
  103 |   await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
  104 |   await expect(page.frameLocator('iframe[title="Live preview"]').getByRole("heading", { name: "Hello LearnMate" })).toBeVisible({ timeout: 30_000 });
  105 | 
  106 |   await page.getByLabel("Language").selectOption("cpp");
  107 |   await page.getByRole("button", { name: "Run" }).click();
  108 |   await expect(page.getByText("Hello from C++ 0")).toBeVisible({ timeout: 90_000 });
  109 | });
  110 | 
```