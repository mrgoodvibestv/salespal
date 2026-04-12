import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const EXPLORIUM_BASE = "https://api.explorium.ai"
const EXPLORIUM_KEY = process.env.EXPLORIUM_API_KEY
const UNLOCK_COST = 2

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prospect_id } = await request.json()
  if (!prospect_id) {
    return NextResponse.json({ error: "prospect_id is required" }, { status: 400 })
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
    console.error("[search/unlock] Explorium enrich HTTP", enrichRes.status, text)
    // Don't block — deduct and return nulls
  } else {
    const enrichData = await enrichRes.json()
    const d = enrichData?.data ?? {}

    email = d.professions_email ?? null
    phone = d.mobile_phone ?? null

    if (!email && Array.isArray(d.emails) && d.emails.length > 0) {
      const first = d.emails[0]
      email = typeof first === "string" ? first : (first?.email ?? first?.value ?? first?.address ?? null)
    }
    if (!phone && Array.isArray(d.phone_numbers) && d.phone_numbers.length > 0) {
      const first = d.phone_numbers[0]
      phone = typeof first === "string" ? first : (first?.phone ?? first?.value ?? first?.number ?? null)
    }

  }

  // Don't charge if enrichment returned nothing
  if (!email && !phone) {
    return NextResponse.json(
      {
        error: "Contact details not available for this prospect. You were not charged.",
        charged: false,
      },
      { status: 200 }
    )
  }

  // Deduct 2 credits
  const { error: deductError } = await supabase.rpc("deduct_credits", {
    p_user_id:        user.id,
    p_amount:         UNLOCK_COST,
    p_action:         "contact_unlock",
    p_explorium_cost: 0.08,
    p_reference_id:   prospect_id,
  })

  if (deductError) {
    console.error("[search/unlock] deduct_credits error:", deductError)
    if (deductError.message?.includes("insufficient_credits")) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 })
    }
    return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 })
  }

  return NextResponse.json({ email, phone })
}
