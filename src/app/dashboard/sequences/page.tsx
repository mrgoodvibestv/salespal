import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SequencesContent from "./SequencesContent"

export default async function SequencesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  // All campaigns with a saved sequence
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, angle_selected, sequence_json")
    .eq("user_id", user.id)
    .not("sequence_json", "is", null)
    .order("created_at", { ascending: false })

  const sequences = (campaigns ?? []).map((c) => ({
    campaign_id:    c.id,
    campaign_name:  c.name,
    angle_selected: c.angle_selected ?? "",
    emails: (c.sequence_json as { emails: unknown[] } | null)?.emails ?? [],
  }))

  return (
    <SequencesContent
      sequences={sequences}
      credits={userData?.credits_balance ?? 0}
      userEmail={user.email ?? ""}
    />
  )
}
