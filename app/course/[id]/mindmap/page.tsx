import { notFound } from "next/navigation";
import { storedMindMapSchema } from "@/lib/schemas/study";
import { createClient } from "@/lib/supabase/server";
import { MindMapView } from "./mindmap-view";

export default async function MindMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase
    .from("profiles")
    .select("ui_lang")
    .eq("id", user.id)
    .maybeSingle();
  const uiLang = profile?.ui_lang ?? "en";
  const { data: row } = await supabase
    .from("mind_maps")
    .select("graph")
    .eq("course_id", id)
    .eq("ui_lang", uiLang)
    .maybeSingle();
  const stored = storedMindMapSchema.safeParse(row?.graph);
  return (
    <MindMapView courseId={id} uiLang={uiLang} initial={stored.success ? stored.data : null} />
  );
}
