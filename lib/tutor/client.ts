import { readNdjson } from "@/lib/ndjson";
import { tutorFrameSchema, type TutorFrame } from "@/lib/schemas/tutor";

/** POSTs to a Guru route and calls `onFrame` for every NDJSON frame as it arrives. */
export async function streamGuru(
  url: string,
  body: unknown,
  onFrame: (frame: TutorFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    onFrame({ t: "error", message: data.error ?? "Guru couldn't answer just now. Please try again." });
    return;
  }
  await readNdjson(response, (line) => {
    const parsed = tutorFrameSchema.safeParse(line);
    if (parsed.success) onFrame(parsed.data);
  });
}
