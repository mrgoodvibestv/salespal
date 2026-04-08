import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const VALID_STATUSES = ["new", "contacted", "replied", "converted"]

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: leadId } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { status } = await request.json()
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  // Verify lead belongs to a campaign owned by this user
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, campaign_id, campaigns!inner(user_id)")
    .eq("id", leadId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const campaign = lead.campaigns as unknown as { user_id: string }
  if (campaign.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)

  if (updateError) {
    console.error("[leads/status] update error:", updateError)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }

  return NextResponse.json({ status })
}
