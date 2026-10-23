import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServiceClient, createUserClient, ensureUser } from "@/lib/supabase/service";

const live =
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR-PROJECT");

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4");
const A = { email: `rls-a-${Date.now()}@example.com`, password: "rls-test-password-1" };
const B = { email: `rls-b-${Date.now()}@example.com`, password: "rls-test-password-2" };

/** Requires a real Supabase project with the migrations applied. Skipped otherwise. */
describe.skipIf(!live)("row level security", () => {
  let courseId = "";
  let attemptId = "";
  let messageId = "";
  let a: Awaited<ReturnType<typeof createUserClient>>;
  let b: Awaited<ReturnType<typeof createUserClient>>;

  beforeAll(async () => {
    if (!live) return;
    await ensureUser(A.email, A.password);
    await ensureUser(B.email, B.password);
    a = await createUserClient(A.email, A.password);
    b = await createUserClient(B.email, B.password);

    const course = await a.client
      .from("courses")
      .insert({
        user_id: a.userId,
        title: "Private",
        subject: "x",
        source_type: "text",
        page_count: 1,
      })
      .select("id")
      .single();
    courseId = course.data!.id;
    await a.client
      .from("course_pages")
      .insert({ course_id: courseId, page_no: 1, text: "secret page" });
    const attempt = await a.client
      .from("quiz_attempts")
      .insert({
        user_id: a.userId,
        course_id: courseId,
        kind: "diagnostic",
        questions: [],
        answers: [],
        per_topic: {},
      })
      .select("id")
      .single();
    attemptId = attempt.data!.id;
    const msg = await a.client
      .from("tutor_messages")
      .insert({
        user_id: a.userId,
        course_id: courseId,
        role: "user",
        content: "my private question",
      })
      .select("id")
      .single();
    messageId = msg.data!.id;
  });

  afterAll(async () => {
    if (!live) return;
    const admin = createServiceClient();
    if (courseId) await admin.from("courses").delete().eq("id", courseId);
    for (const id of [a?.userId, b?.userId]) if (id) await admin.auth.admin.deleteUser(id);
  });

  it("lets the owner read their own rows", async () => {
    expect((await a.client.from("courses").select("id").eq("id", courseId)).data).toHaveLength(1);
  });

  it("hides the course, its pages, attempts and tutor messages from another user", async () => {
    expect((await b.client.from("courses").select("id").eq("id", courseId)).data).toEqual([]);
    expect(
      (await b.client.from("course_pages").select("text").eq("course_id", courseId)).data,
    ).toEqual([]);
    expect((await b.client.from("quiz_attempts").select("id").eq("id", attemptId)).data).toEqual(
      [],
    );
    expect((await b.client.from("tutor_messages").select("id").eq("id", messageId)).data).toEqual(
      [],
    );
  });

  it("stops another user writing into someone else's course", async () => {
    const page = await b.client
      .from("course_pages")
      .insert({ course_id: courseId, page_no: 2, text: "injected" });
    expect(page.error).not.toBeNull();
    const forged = await b.client.from("quiz_attempts").insert({
      user_id: a.userId,
      course_id: courseId,
      kind: "diagnostic",
      questions: [],
      answers: [],
      per_topic: {},
    });
    expect(forged.error).not.toBeNull();
  });

  it("stops another user reading or writing the first user's storage folder", async () => {
    const path = `${a.userId}/test.pdf`;
    const upload = await b.client.storage
      .from("materials")
      .upload(path, PDF_BYTES, { contentType: "application/pdf" });
    expect(upload.error).not.toBeNull();
    const own = await a.client.storage
      .from("materials")
      .upload(path, PDF_BYTES, { contentType: "application/pdf" });
    expect(own.error).toBeNull();
    expect((await b.client.storage.from("materials").download(path)).error).not.toBeNull();
    await a.client.storage.from("materials").remove([path]);
  });

  it("keeps notes, mind maps, checklist items and study events private (migration 0003)", async () => {
    const own = await Promise.all([
      a.client
        .from("study_notes")
        .insert({ user_id: a.userId, course_id: courseId, notes: { topics: [] } }),
      a.client
        .from("mind_maps")
        .insert({ user_id: a.userId, course_id: courseId, graph: { nodes: [] } }),
      a.client
        .from("checklist_items")
        .insert({ user_id: a.userId, course_id: courseId, label: "private task" }),
      a.client
        .from("study_events")
        .insert({ user_id: a.userId, course_id: courseId, kind: "lesson" }),
    ]);
    own.forEach((r) => expect(r.error).toBeNull());
    for (const table of ["study_notes", "mind_maps", "checklist_items", "study_events"] as const) {
      expect((await b.client.from(table).select("id").eq("course_id", courseId)).data).toEqual([]);
    }
    const forged = await b.client
      .from("checklist_items")
      .insert({ user_id: a.userId, course_id: courseId, label: "forged" });
    expect(forged.error).not.toBeNull();
  });
});
