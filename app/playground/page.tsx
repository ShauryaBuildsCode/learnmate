import { languageSchema } from "@/lib/schemas/exercise";
import { createClient } from "@/lib/supabase/server";
import { PlaygroundClient } from "./playground-client";

/** The scratch pad opens in the language of the student's most recent coding course. */
export default async function PlaygroundPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("language")
    .eq("kind", "programming")
    .not("language", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const language = languageSchema.safeParse(data?.language);
  return <PlaygroundClient defaultLanguage={language.success ? language.data : "python"} />;
}
