import { expect, test } from "@playwright/test";
import { quizQuestionSchema } from "../lib/schemas/content";
import { resetDemoCourse, setEditorCode, signIn, userClient } from "./support";

const BUGGY = "def sum_to(n):\n    total = 0\n    for i in range(1, n):\n        total += i\n    return total\n";
const FIXED = "def sum_to(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n";

test.describe.configure({ mode: "serial" });

let courseId = "";

test.beforeAll(async () => {
  courseId = await resetDemoCourse();
});

test("demo path: quiz -> plan v1 -> lesson -> checkpoint -> IDE fail then pass -> plan v2 -> out-of-scope", async ({ page }) => {
  await signIn(page);
  await page.goto(`/course/${courseId}`);

  // Topic map with page chips and exercises found
  await expect(page.getByRole("heading", { name: "Topic map" })).toBeVisible();
  await expect(page.getByText("Pages:").first()).toBeVisible();

  // Diagnostic quiz: answer the target topic's questions wrong, everything else right.
  await page.getByRole("button", { name: "Start diagnostic quiz" }).click();
  await expect(page.getByRole("radio").first()).toBeVisible();
  const { client } = await userClient();
  const { data: attempt } = await client
    .from("quiz_attempts")
    .select("questions")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const questions = quizQuestionSchema.array().parse(attempt!.questions);
  // The topic that owns the sum_to exercise is the one this student "doesn't understand".
  const { data: target } = await client
    .from("exercises")
    .select("topic_id")
    .eq("course_id", courseId)
    .ilike("prompt", "%sum_to%")
    .limit(1)
    .single();
  const { data: targetTopic } = await client.from("topics").select("id,name").eq("id", target!.topic_id).single();
  const loopTopics = new Set([targetTopic!.id]);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const wrong = loopTopics.has(q.topicId);
    const pick = wrong ? (q.correctIndex + 1) % 4 : q.correctIndex;
    await page.getByRole("radio").nth(pick).click();
    await expect(page.getByText("Groq").first()).toBeVisible(); // instant feedback badge
    await page.getByRole("button", { name: i === questions.length - 1 ? "Finish quiz" : "Next question" }).click();
  }

  // Plan v1 ranks a loop topic first
  await expect(page.getByText("You got")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Revision plan" })).toBeVisible();
  await expect(page.getByText("v1", { exact: true }).first()).toBeVisible();
  const firstItem = page.getByRole("region", { name: "Revision plan" }).getByRole("listitem").first();
  await expect(firstItem.getByText("weak").first()).toBeVisible();
  await expect(firstItem.getByRole("heading", { name: targetTopic!.name })).toBeVisible();

  // Lesson: play to the checkpoint and the IDE opens with the exercise
  await firstItem.getByRole("link", { name: "Open lesson" }).click();
  await page.waitForURL("**/learn/**");
  const timeline = page.locator('[role="list"] > button');
  await expect(timeline.first()).toBeVisible({ timeout: 180_000 });
  await expect(page.getByText("Source:").first()).toBeVisible();
  await timeline.last().click();
  await page.getByRole("button", { name: /play video/i }).first().click();
  await expect(page.getByRole("complementary", { name: "Code editor" })).toBeVisible({ timeout: 60_000 });

  // Buggy code fails
  await setEditorCode(page, BUGGY);
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByText(/exit \d/)).toBeVisible({ timeout: 120_000 });
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/\d of \d tests passed/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/^0 of \d+ tests passed$/)).toBeVisible();

  // Guru: hint ladder, then a grounded question with a page citation
  const guru = page.getByRole("region", { name: "Guru, your tutor" });
  await guru.getByRole("button", { name: /Hint 1\/3/ }).click();
  await expect(guru.getByText("Claude").first()).toBeVisible({ timeout: 90_000 });
  await guru.getByLabel("Ask Guru").fill("why does range stop before 5?");
  await guru.getByRole("button", { name: "Send" }).click();
  await expect(guru.getByRole("button", { name: /^p\. \d+$/ }).first()).toBeVisible({ timeout: 90_000 });

  // Fix it: all tests pass and a new plan version appears with a change banner
  await setEditorCode(page, FIXED);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/^(\d+) of \1 tests passed$/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Plan v2 is ready/)).toBeVisible({ timeout: 120_000 });
  await page.goto(`/course/${courseId}`);
  await expect(page.getByText("What changed in v2")).toBeVisible();

  // Out-of-scope question gets the amber banner
  await page.goto(`/learn/${(await client.from("topics").select("id").eq("course_id", courseId).order("position").limit(1).single()).data!.id}`);
  const guru2 = page.getByRole("region", { name: "Guru, your tutor" });
  await guru2.getByLabel("Ask Guru").fill("how do I use pandas?");
  await guru2.getByRole("button", { name: "Send" }).click();
  await expect(guru2.getByRole("note")).toContainText("Beyond your uploaded material", { timeout: 90_000 });
});

test("IDE runs HTML and C++ programs", async ({ page }) => {
  await signIn(page);
  await page.goto("/playground");

  await page.getByLabel("Language").selectOption("html");
  await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
  await expect(page.frameLocator('iframe[title="Live preview"]').getByRole("heading", { name: "Hello LearnMate" })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("Language").selectOption("cpp");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByText("Hello from C++ 0")).toBeVisible({ timeout: 90_000 });
});
