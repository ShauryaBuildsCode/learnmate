# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo.spec.ts >> demo path: quiz -> plan v1 -> lesson -> checkpoint -> IDE fail then pass -> plan v2 -> out-of-scope
- Location: e2e/demo.spec.ts:16:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('region', { name: 'Guru, your tutor' }).getByRole('note')
Expected substring: "Beyond your uploaded material"
Timeout: 90000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('region', { name: 'Guru, your tutor' }).getByRole('note') with timeout 90000ms
  - waiting for getByRole('region', { name: 'Guru, your tutor' }).getByRole('note')

```

```yaml
- banner:
  - 'link "Python Foundations: Loops and Lists"':
    - /url: /course/5e52b9da-41b1-41fd-814c-69ec02720546
  - heading "Introduction to Loops" [level=1]
  - button "Open editor"
  - button "Switch language to Hindi": हिन्दी
  - button "Toggle theme"
- region "Lesson":
  - text: "Gemini · lesson script Introduction to Loops Topic Source: page 1 Introduction to Loops Repeat code easily without getting bored! Welcome to Python foundations! Today we will learn about loops and how they help us repeat instructions."
  - button "Play video":
    - img
  - button "Mute sound":
    - img
  - text: 0:00 / 1:01
  - button "Enter Fullscreen":
    - img
  - text: "Scene 1 of 6 · TitleCard Source:"
  - button "p. 1"
  - button "Narration on" [pressed]
  - list:
    - listitem "TitleCard (p. 1)"
    - listitem "KeyTerms (p. 1)"
    - listitem "RepeatBurst (p. 1)"
    - listitem "CodeReveal (p. 2)"
    - listitem "VariableTracker (p. 2)"
    - listitem "Checkpoint (p. 1)"
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
  - text: how do I use pandas? Claude
  - paragraph:
    - strong: "Beyond your uploaded material:"
    - text: pandas is a Python library for working with tables of data. It isn't covered in this chapter, so check with your instructor for that topic.
  - paragraph:
    - text: Let's finish
    - code: make_list
    - text: first, since you're close. Remember that
    - code: range(n)
    - text: stops before
    - code: "n"
    - button "p. 5"
    - text: . What could you create on line 2 to hold your numbers, and what would you do with it inside a loop?
  - group: What Guru looked at
  - button "Hint 1/3"
  - button "Review my code"
  - textbox "Ask Guru":
    - /placeholder: Ask Guru…
  - button "Send" [disabled]
- alert
- alert
- alert
```

# Test source

```ts
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
  24  |   // Diagnostic quiz: answer the target topic's questions wrong, everything else right.
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
  36  |   // The topic that owns the sum_to exercise is the one this student "doesn't understand".
  37  |   const { data: target } = await client
  38  |     .from("exercises")
  39  |     .select("topic_id")
  40  |     .eq("course_id", courseId)
  41  |     .ilike("prompt", "%sum_to%")
  42  |     .limit(1)
  43  |     .single();
  44  |   const { data: targetTopic } = await client.from("topics").select("id,name").eq("id", target!.topic_id).single();
  45  |   const loopTopics = new Set([targetTopic!.id]);
  46  | 
  47  |   for (let i = 0; i < questions.length; i++) {
  48  |     const q = questions[i];
  49  |     const wrong = loopTopics.has(q.topicId);
  50  |     const pick = wrong ? (q.correctIndex + 1) % 4 : q.correctIndex;
  51  |     await page.getByRole("radio").nth(pick).click();
  52  |     await expect(page.getByText("Groq").first()).toBeVisible(); // instant feedback badge
  53  |     await page.getByRole("button", { name: i === questions.length - 1 ? "Finish quiz" : "Next question" }).click();
  54  |   }
  55  | 
  56  |   // Plan v1 ranks a loop topic first
  57  |   await expect(page.getByText("You got")).toBeVisible();
  58  |   await page.getByRole("button", { name: "Close" }).click();
  59  |   await expect(page.getByRole("heading", { name: "Revision plan" })).toBeVisible();
  60  |   await expect(page.getByText("v1", { exact: true }).first()).toBeVisible();
  61  |   const firstItem = page.getByRole("region", { name: "Revision plan" }).getByRole("listitem").first();
  62  |   await expect(firstItem.getByText("weak").first()).toBeVisible();
  63  |   await expect(firstItem.getByRole("heading", { name: targetTopic!.name })).toBeVisible();
  64  | 
  65  |   // Lesson: play to the checkpoint and the IDE opens with the exercise
  66  |   await firstItem.getByRole("link", { name: "Open lesson" }).click();
  67  |   await page.waitForURL("**/learn/**");
  68  |   const timeline = page.locator('[role="list"] > button');
  69  |   await expect(timeline.first()).toBeVisible({ timeout: 180_000 });
  70  |   await expect(page.getByText("Source:").first()).toBeVisible();
  71  |   await timeline.last().click();
  72  |   await page.getByRole("button", { name: /play video/i }).first().click();
  73  |   await expect(page.getByRole("complementary", { name: "Code editor" })).toBeVisible({ timeout: 60_000 });
  74  | 
  75  |   // Buggy code fails
  76  |   await setEditorCode(page, BUGGY);
  77  |   await page.getByRole("button", { name: "Run" }).click();
  78  |   await expect(page.getByText(/exit \d/)).toBeVisible({ timeout: 120_000 });
  79  |   await page.getByRole("button", { name: "Check" }).click();
  80  |   await expect(page.getByText(/\d of \d tests passed/)).toBeVisible({ timeout: 60_000 });
  81  |   await expect(page.getByText(/^0 of \d+ tests passed$/)).toBeVisible();
  82  | 
  83  |   // Guru: hint ladder, then a grounded question with a page citation
  84  |   const guru = page.getByRole("region", { name: "Guru, your tutor" });
  85  |   await guru.getByRole("button", { name: /Hint 1\/3/ }).click();
  86  |   await expect(guru.getByText("Claude").first()).toBeVisible({ timeout: 90_000 });
  87  |   await guru.getByLabel("Ask Guru").fill("why does range stop before 5?");
  88  |   await guru.getByRole("button", { name: "Send" }).click();
  89  |   await expect(guru.getByRole("button", { name: /^p\. \d+$/ }).first()).toBeVisible({ timeout: 90_000 });
  90  | 
  91  |   // Fix it: all tests pass and a new plan version appears with a change banner
  92  |   await setEditorCode(page, FIXED);
  93  |   await page.getByRole("button", { name: "Check" }).click();
  94  |   await expect(page.getByText(/^(\d+) of \1 tests passed$/)).toBeVisible({ timeout: 60_000 });
  95  |   await expect(page.getByText(/Plan v2 is ready/)).toBeVisible({ timeout: 120_000 });
  96  |   await page.goto(`/course/${courseId}`);
  97  |   await expect(page.getByText("What changed in v2")).toBeVisible();
  98  | 
  99  |   // Out-of-scope question gets the amber banner
  100 |   await page.goto(`/learn/${(await client.from("topics").select("id").eq("course_id", courseId).order("position").limit(1).single()).data!.id}`);
  101 |   const guru2 = page.getByRole("region", { name: "Guru, your tutor" });
  102 |   await guru2.getByLabel("Ask Guru").fill("how do I use pandas?");
  103 |   await guru2.getByRole("button", { name: "Send" }).click();
> 104 |   await expect(guru2.getByRole("note")).toContainText("Beyond your uploaded material", { timeout: 90_000 });
      |                                         ^ Error: expect(locator).toContainText(expected) failed
  105 | });
  106 | 
  107 | test("IDE runs HTML and C++ programs", async ({ page }) => {
  108 |   await signIn(page);
  109 |   await page.goto("/playground");
  110 | 
  111 |   await page.getByLabel("Language").selectOption("html");
  112 |   await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
  113 |   await expect(page.frameLocator('iframe[title="Live preview"]').getByRole("heading", { name: "Hello LearnMate" })).toBeVisible({ timeout: 30_000 });
  114 | 
  115 |   await page.getByLabel("Language").selectOption("cpp");
  116 |   await page.getByRole("button", { name: "Run" }).click();
  117 |   await expect(page.getByText("Hello from C++ 0")).toBeVisible({ timeout: 90_000 });
  118 | });
  119 | 
```