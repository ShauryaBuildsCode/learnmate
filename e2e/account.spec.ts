import { expect, test } from "@playwright/test";
import { createServiceClient } from "../lib/supabase/service";

/** A brand-new user goes through the first-run welcome, the profile, settings, data export and account deletion. */
test("welcome, profile, settings, export and delete account", async ({ page }) => {
  const admin = createServiceClient();
  const email = `acct-${Date.now()}@example.com`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: {
      full_name: "Ravi Kumar",
      goal: "exam",
      level: "beginner",
      interests: "Biology",
    },
  });
  if (error) throw error;
  const id = created.user!.id;
  try {
    // The sign-up answers reached the profile through the database trigger, and the first visit is the welcome tour.
    const { data: profile } = await admin
      .from("profiles")
      .select("goal,level,interests,onboarded_at")
      .eq("id", id)
      .single();
    expect(profile).toMatchObject({
      goal: "exam",
      level: "beginner",
      interests: "Biology",
      onboarded_at: null,
    });
    await page.goto("/signin");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/welcome");
    await page.getByRole("button", { name: "Skip" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: /Ravi/ })).toBeVisible();

    // Profile: edit and save.
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Profile" }).click();
    await page.waitForURL("**/profile");
    await page.getByRole("button", { name: "Learn for a job or career" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    expect((await admin.from("profiles").select("goal").eq("id", id).single()).data?.goal).toBe(
      "job",
    );

    // Settings: password, export, delete.
    await page.goto("/settings");
    await page.getByLabel("New password", { exact: true }).fill("newpassword456");
    await page.getByLabel("Repeat new password").fill("newpassword456");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated.")).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download my data/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^learnmate-export-.*\.json$/);

    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByLabel("Your password").fill("wrong-password");
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Permanently delete" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("password isn't right");
    await page.getByLabel("Your password").fill("newpassword456");
    await page.getByRole("button", { name: "Permanently delete" }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
    expect((await admin.auth.admin.getUserById(id)).data.user).toBeNull();
  } finally {
    await admin.auth.admin.deleteUser(id).catch(() => undefined);
  }
});
