import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });

/** Loads fixtures/python-loops-lists.md through the real ingest pipeline for the demo user. */
async function main() {
  const { ingestMaterial } = await import("../lib/ingest/pipeline");
  const { createUserClient, ensureUser } = await import("../lib/supabase/service");
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) throw new Error("Set E2E_USER_EMAIL and E2E_USER_PASSWORD in .env.local first.");

  await ensureUser(email, password);
  const { client, userId } = await createUserClient(email, password);

  const title = "Python Foundations: Loops and Lists";
  const { data: existing } = await client.from("courses").select("id").eq("title", title).limit(1);
  if (existing?.length && !process.argv.includes("--force")) {
    console.log(`Seed course already exists (${existing[0].id}). Pass --force to create another copy.`);
    return;
  }

  const text = await readFile(path.join(process.cwd(), "fixtures/python-loops-lists.md"), "utf8");
  const result = await ingestMaterial({
    supabase: client,
    userId,
    source: { kind: "text", text, title },
    onProgress: (_stage, message) => console.log(message),
  });
  console.log(`Seeded course ${result.courseId}: ${result.topicCount} topics, ${result.exerciseCount} exercises.`);
  result.warnings.forEach((w) => console.warn(w));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
