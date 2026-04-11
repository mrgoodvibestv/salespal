import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const EXPLORIUM_BASE = "https://api.explorium.ai"
const EXPLORIUM_KEY = process.env.EXPLORIUM_API_KEY
const SEARCH_COST = 5
const PAGE_SIZE = 25

interface ExploriumProspect {
  prospect_id?: string
  id?: string
  full_name?: string
  name?: string
  job_title?: string
  title?: string
  job_level?: string
  job_level_main?: string
  linkedin_url?: string
  linkedin?: string
  linkedin_profile?: string
  linkedin_profile_url?: string
  profile_url?: string
  company_name?: string
  city?: string
  country_name?: string
  [key: string]: unknown
}

function extractLinkedinUrl(p: ExploriumProspect): string {
  const raw = p.linkedin ?? p.linkedin_url ?? p.linkedin_profile ?? p.linkedin_profile_url ?? p.profile_url ?? ""
  if (!raw) return ""
  if ((raw as string).startsWith("http")) return raw as string
  if ((raw as string).startsWith("linkedin.com")) return `https://${raw}`
  return raw as string
}

function scoreTierByLevel(level: string): "decision_maker" | "influencer" | "noise" {
  const l = level.toLowerCase()
  if (["c-suite", "owner", "founder", "president", "partner", "board member", "vice president", "director"].includes(l))
    return "decision_maker"
  if (["senior manager", "manager", "senior non-managerial", "advisor"].includes(l))
    return "influencer"
  return "noise"
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Credit check
  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  if (!userData || userData.credits_balance < SEARCH_COST) {
    return NextResponse.json(
      { error: "insufficient_credits", balance: userData?.credits_balance ?? 0 },
      { status: 402 }
    )
  }

  // Parse filters from body
  let filters: {
    job_level?: string[]
    job_department?: string[]
    company_size?: string[]
    country_code?: string[]
    linkedin_category?: string
    has_email?: boolean
    has_phone_number?: boolean
  } = {}
  let page = 1
  try {
    const body = await request.json()
    filters = body?.filters ?? {}
    page = typeof body?.page === "number" ? Math.max(1, body.page) : 1
  } catch { /* empty body */ }

  // Build Explorium request — only send filters that are populated
  const exploriumFilters: Record<string, unknown> = {}
  if (filters.country_code?.length)    exploriumFilters.country_code    = { values: filters.country_code }
  if (filters.company_size?.length)    exploriumFilters.company_size    = { values: filters.company_size }
  if (filters.job_level?.length)       exploriumFilters.job_level       = { values: filters.job_level }
  if (filters.job_department?.length)  exploriumFilters.job_department  = { values: filters.job_department }
  if (filters.linkedin_category)       exploriumFilters.linkedin_category = { values: [filters.linkedin_category] }
  if (filters.has_email)               exploriumFilters.has_email       = { value: true }
  if (filters.has_phone_number)        exploriumFilters.has_phone_number = { value: true }

  const body = {
    mode: "full",
    page_size: PAGE_SIZE,
    size: PAGE_SIZE,
    page: page,
    filters: exploriumFilters,
  }

  console.log("[search/prospects] request:", JSON.stringify(body))

  let prospects: ExploriumProspect[] = []
  try {
    const res = await fetch(`${EXPLORIUM_BASE}/v1/prospects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", API_KEY: EXPLORIUM_KEY ?? "" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[search/prospects] HTTP", res.status, text)
      return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 })
    }

    const data = await res.json()
    prospects = data?.prospects ?? data?.data ?? data?.results ?? data?.items ?? []
    console.log("[search/prospects] returned:", prospects.length)
  } catch (err) {
    console.error("[search/prospects] fetch error:", err)
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 })
  }

  // Deduct 5 credits flat
  const { error: deductError } = await supabase.rpc("deduct_credits", {
    p_user_id:        user.id,
    p_amount:         SEARCH_COST,
    p_action:         "company_fetch",
    p_explorium_cost: 0.20,
    p_reference_id:   `search_${Date.now()}`,
  })
  if (deductError) {
    console.error("[search/prospects] deduct_credits error:", deductError)
    if (deductError.message?.includes("insufficient_credits")) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 })
    }
    return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 })
  }

  // Shape results — rule-based tier scoring (no Claude for ad-hoc search)
  const results = prospects.map((p) => ({
    prospect_id:  p.prospect_id ?? p.id ?? "",
    full_name:    p.full_name ?? p.name ?? "Unknown",
    job_title:    p.job_title ?? p.title ?? "",
    company_name: p.company_name ?? "",
    geo_location: [(p.city ?? "").trim(), (p.country_name ?? "").trim()].filter(Boolean).join(", "),
    linkedin_url: extractLinkedinUrl(p),
    tier:         scoreTierByLevel(p.job_level_main ?? p.job_level ?? ""),
    unlocked:     false,
    email:        null as string | null,
    phone:        null as string | null,
  }))

  // Sort: decision_maker first, then influencer, then noise
  const tierOrder: Record<string, number> = { decision_maker: 0, influencer: 1, noise: 2 }
  results.sort((a, b) => (tierOrder[a.tier] ?? 2) - (tierOrder[b.tier] ?? 2))

  return NextResponse.json({ results, page, hasMore: results.length === PAGE_SIZE, credits_deducted: SEARCH_COST })
}
