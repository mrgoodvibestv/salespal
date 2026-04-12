import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const EXPLORIUM_BASE = "https://api.explorium.ai"
const EXPLORIUM_KEY = process.env.EXPLORIUM_API_KEY
const UNLOCK_COST = 2

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { lead_id, prospect_id } = await request.json()
  if (!lead_id || !prospect_id) {
    return NextResponse.json({ error: "lead_id and prospect_id are required" }, { status: 400 })
  }

  // Verify lead belongs to a campaign owned by this user
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, unlocked, campaign_id, campaigns!inner(user_id)")
    .eq("id", lead_id)
    .eq("campaign_id", campaignId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const campaign = lead.campaigns as unknown as { user_id: string }
  if (campaign.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Already unlocked — return early (idempotent)
  if (lead.unlocked) {
    const { data: existing } = await supabase
      .from("leads")
      .select("email, phone")
      .eq("id", lead_id)
      .single()
    return NextResponse.json({ email: existing?.email, phone: existing?.phone, already_unlocked: true })
  }

  // Credit check
  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  if (!userData || userData.credits_balance < UNLOCK_COST) {
    return NextResponse.json(
      { error: "insufficient_credits", balance: userData?.credits_balance ?? 0 },
      { status: 402 }
    )
  }

  // Call Explorium enrich
  // Docs: POST /v1/prospects/contacts_information/enrich
  // Body: { prospect_id: string, parameters: { contact_types: [...] } }
  // Response: { response_context, data: { professions_email, mobile_phone, emails: [...], phone_numbers: [...] } }
  const enrichRes = await fetch(
    `${EXPLORIUM_BASE}/v1/prospects/contacts_information/enrich`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", API_KEY: EXPLORIUM_KEY ?? "" },
      body: JSON.stringify({
        prospect_id,
        parameters: { contact_types: ["email", "phone"] },
      }),
    }
  )

  let email: string | null = null
  let phone: string | null = null

  if (!enrichRes.ok) {
    const text = await enrichRes.text()
    console.error("[unlock] Explorium enrich HTTP", enrichRes.status, text)
    // Don't block the unlock — deduct credits and mark unlocked even if enrich fails
  } else {
    const enrichData = await enrichRes.json()
    const d = enrichData?.data ?? {}

    // Primary fields (flat, confirmed by Explorium docs)
    email = d.professions_email ?? null
    phone = d.mobile_phone ?? null

    // Fallback: scan emails[] / phone_numbers[] arrays for any string value
    if (!email && Array.isArray(d.emails) && d.emails.length > 0) {
      const first = d.emails[0]
      email = typeof first === "string" ? first : (first?.email ?? first?.value ?? first?.address ?? null)
    }
    if (!phone && Array.isArray(d.phone_numbers) && d.phone_numbers.length > 0) {
      const first = d.phone_numbers[0]
      phone = typeof first === "string" ? first : (first?.phone ?? first?.value ?? first?.number ?? null)
    }

  }

  // Don't charge if enrichment returned nothing useful
  if (!email && !phone) {
    return NextResponse.json(
      {
        error: "Contact details not available for this prospect. You were not charged.",
        charged: false,
      },
      { status: 200 }
    )
  }

  // Deduct 2 credits atomically via deduct_credits RPC
  const { error: deductError } = await supabase.rpc("deduct_credits", {
    p_user_id:        user.id,
    p_amount:         UNLOCK_COST,
    p_action:         "contact_unlock",
    p_explorium_cost: 0.08, // $0.04 × 2 contacts_information cost
    p_reference_id:   campaignId,
  })

  if (deductError) {
    // If deduct_credits raises insufficient_credits, it throws
    console.error("[unlock] deduct_credits error:", deductError)
    if (deductError.message?.includes("insufficient_credits")) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 })
    }
    return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 })
  }

  // Update lead record
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      email,
      phone,
      unlocked:       true,
      credits_charged: UNLOCK_COST,
    })
    .eq("id", lead_id)

  if (updateError) {
    console.error("[unlock] lead update error:", updateError)
  }

  return NextResponse.json({ email, phone })
}
