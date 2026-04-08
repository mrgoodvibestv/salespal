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

  // Fetch all unlocked leads with campaign info — RLS enforces user ownership
  const { data: leadsRaw } = await supabase
    .from("leads")
    .select(`
      id,
      full_name,
      job_title,
      linkedin_url,
      email,
      phone,
      tier,
      status,
      campaign_id,
      campaigns!inner(id, name, angle_selected)
    `)
    .eq("unlocked", true)
    .order("updated_at", { ascending: false })

  const contacts = (leadsRaw ?? []).map((l) => {
    const camp = Array.isArray(l.campaigns)
      ? (l.campaigns[0] ?? null)
      : l.campaigns
    return {
      id: l.id,
      full_name: l.full_name,
      job_title: l.job_title,
      linkedin_url: l.linkedin_url,
      email: l.email,
      phone: l.phone,
      tier: l.tier,
      status: (l.status as string) ?? "new",
      campaign_id: camp?.id ?? l.campaign_id,
      campaign_name: camp?.name ?? "",
      angle_selected: camp?.angle_selected ?? "",
    }
  })

  return (
    <ContactsContent
      contacts={contacts}
      credits={userData?.credits_balance ?? 0}
      userEmail={user.email ?? ""}
    />
  )
}
