import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import NewCampaignContent from "./NewCampaignContent"

export default async function NewCampaignPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  const credits = userData?.credits_balance ?? 0

  return (
    <Suspense>
      <NewCampaignContent credits={credits} userEmail={user.email ?? ""} />
    </Suspense>
  )
}
