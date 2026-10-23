import type { Page } from "@playwright/test";
import { createUserClient } from "../lib/supabase/service";

export const EMAIL = process.env.E2E_USER_EMAIL!;
export const PASSWORD = process.env.E2E_USER_PASSWORD!;

export async function userClient() {
  return createUserClient(EMAIL, PASSWORD);
}

/** Finds the seeded course and wipes this user's quiz/plan/run history so the demo path starts clean. */
export async function resetDemoCourse(): Promise<string> {
  const { client, userId } = await userClient();
  const { data: course } = await client.from("courses").select("id").ilike("title", "%Loops%").limit(1).maybeSingle();
  if (!course) throw new Error("Seed course not found. Run `npm run seed` first.");
  await client.from("plans").delete().eq("course_id", course.id);
  await client.from("quiz_attempts").delete().eq("course_id", course.id);
  await client.from("tutor_messages").delete().eq("course_id", course.id);
  const { data: exercises } = await client.from("exercises").select("id").eq("course_id", course.id);
  const ids = (exercises ?? []).map((e) => e.id);
  if (ids.length) {
    await client.from("exercise_runs").delete().in("exercise_id", ids);
    await client.from("hint_state").delete().in("exercise_id", ids).eq("user_id", userId);
  }
  return course.id;
}

export async function signIn(page: Page) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

/** Replaces the content of the active Monaco model (typing into Monaco fights auto-indent). */
export async function setEditorCode(page: Page, code: string) {
  await page.waitForFunction(() => (window as unknown as { monaco?: { editor: { getModels(): unknown[] } } }).monaco?.editor.getModels().length);
  await page.evaluate((value) => {
    const monaco = (window as unknown as { monaco: { editor: { getModels(): { setValue(v: string): void }[] } } }).monaco;
    monaco.editor.getModels()[0].setValue(value);
  }, code);
}
