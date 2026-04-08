import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ContactsContent from "./ContactsContent"

export default async function ContactsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  // Step 1: get user's campaigns (RLS scopes to this user automatically)
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, angle_selected")
    .eq("user_id", user.id)

  const campaignIds = campaigns?.map((c) => c.id) ?? []

  // Step 2: get unlocked leads for those campaigns
  const leadsData = campaignIds.length > 0
    ? (await supabase
        .from("leads")
        .select("id, full_name, job_title, linkedin_url, email, phone, tier, status, campaign_id")
        .in("campaign_id", campaignIds)
        .eq("unlocked", true)
        .order("created_at", { ascending: false })).data
    : []

  // Step 3: merge campaign info onto each lead
  const contacts = (leadsData ?? []).map((lead) => ({
    id: lead.id,
    full_name: lead.full_name,
    job_title: lead.job_title,
    linkedin_url: lead.linkedin_url,
    email: lead.email,
    phone: lead.phone,
    tier: lead.tier as "decision_maker" | "influencer" | "noise",
    status: (lead.status as string) ?? "new",
    campaign_id: lead.campaign_id,
    campaign_name: campaigns?.find((c) => c.id === lead.campaign_id)?.name ?? "",
    angle_selected: campaigns?.find((c) => c.id === lead.campaign_id)?.angle_selected ?? "",
  }))

  return (
    <ContactsContent
      contacts={contacts}
      credits={userData?.credits_balance ?? 0}
      userEmail={user.email ?? ""}
    />
  )
}
