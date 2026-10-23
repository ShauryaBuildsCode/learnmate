import { redirect } from "next/navigation";
import { Logo } from "@/components/design/logo";
import { OnboardingPlayer } from "@/components/onboarding/onboarding-player";
import { createClient } from "@/lib/supabase/server";

const CODEY =
  /python|javascript|java|react|c\+\+|\bc\b|go|rust|html|css|code|coding|program|data structure|algorithm|web|app|software/i;

/** The first-time welcome: a short animated tour, personalised from what the learner told us at sign-up. */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ replay?: string }>;
}) {
  const { replay } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,goal,level,interests,daily_minutes,onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.onboarded_at && !replay) redirect("/dashboard");

  const interests = profile?.interests ?? "";
  const name = (profile?.display_name ?? "there").split(/\s+/)[0];
  return (
    <main className="bg-dots flex flex-1 flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <Logo />
      <OnboardingPlayer
        userId={user.id}
        profile={{
          name,
          goal: profile?.goal ?? null,
          level: profile?.level ?? null,
          interests,
          minutes: profile?.daily_minutes ?? null,
          codey: interests ? CODEY.test(interests) : true,
          web: /javascript|react|web|html|css|node/i.test(interests),
        }}
      />
    </main>
  );
}
