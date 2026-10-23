import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/ui/site-header";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  const { data: profile } = await supabase
    .from("profiles")
    .select("ui_lang")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            How LearnMate looks, sounds and keeps your account safe.
          </p>
        </div>
        <SettingsView userId={user.id} email={user.email ?? ""} uiLang={profile?.ui_lang ?? "en"} />
      </main>
    </>
  );
}
