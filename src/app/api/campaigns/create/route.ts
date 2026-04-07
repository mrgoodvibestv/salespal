import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify user row exists and has credits (stats check is free — 0 credits needed here)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: "User account not found" }, { status: 404 })
  }

  const { name, icp_json, angle_selected, stats_result } = await request.json()

  if (!name || !angle_selected) {
    return NextResponse.json(
      { error: "name and angle_selected are required" },
      { status: 400 }
    )
  }

  const { data: campaign, error: insertError } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name,
      status: "active",
      icp_json: icp_json ?? null,
      angle_selected,
      stats_result: stats_result ?? null,
    })
    .select("id")
    .single()

  if (insertError || !campaign) {
    console.error("[campaigns/create]", insertError)
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    )
  }

  return NextResponse.json({ campaign_id: campaign.id })
}
