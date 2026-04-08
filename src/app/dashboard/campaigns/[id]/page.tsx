import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CampaignDetailClient from "./CampaignDetailClient"

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch campaign (RLS enforces ownership)
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, name, status, angle_selected, icp_json, stats_result, sequence_json, created_at")
    .eq("id", params.id)
    .single()

  if (campaignError || !campaign) redirect("/dashboard")

  // Fetch existing leads with company info
  const { data: leadsRaw } = await supabase
    .from("leads")
    .select(`
      id,
      prospect_id,
      full_name,
      job_title,
      linkedin_url,
      email,
      phone,
      tier,
      unlocked,
      credits_charged,
      companies (
        id,
        name,
        domain
      )
    `)
    .eq("campaign_id", params.id)
    .order("tier", { ascending: true })
    .order("full_name")

  // Supabase returns companies as an array for the join; normalise to single object
  const leads = (leadsRaw ?? []).map((l) => ({
    ...l,
    companies: Array.isArray(l.companies) ? (l.companies[0] ?? null) : l.companies,
  }))

  // Fetch credit balance
  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  return (
    <CampaignDetailClient
      campaign={campaign}
      initialLeads={leads ?? []}
      initialCredits={userData?.credits_balance ?? 0}
      userEmail={user.email ?? ""}
    />
  )
}
