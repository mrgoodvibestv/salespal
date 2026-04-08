import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { retryWithBackoff } from "@/lib/ai/retry"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const EXPLORIUM_BASE = "https://api.explorium.ai"
const EXPLORIUM_KEY = process.env.EXPLORIUM_API_KEY

// page_size for direct prospect query — no company intermediary
const PAGE_SIZE_LOCAL    = 25
const PAGE_SIZE_NATIONAL = 15
const MIN_CREDITS_TO_RUN = 5

// ── Types ──────────────────────────────────────────────────────────────────
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
  business_id?: string
  company_id?: string
  company_name?: string
  company_website?: string
  region_name?: string
  city?: string
  country_name?: string
  [key: string]: unknown
}

interface ScoredProspect {
  prospect_id: string
  full_name: string
  job_title: string
  linkedin_url: string
  company_name: string
  tier: "decision_maker" | "influencer" | "noise"
  geo_location: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
function extractLinkedinUrl(p: ExploriumProspect): string {
  return (
    p.linkedin ??
    p.linkedin_url ??
    p.linkedin_profile ??
    p.linkedin_profile_url ??
    p.profile_url ??
    ""
  )
}

function normalizeLinkedinUrl(raw: string): string {
  if (!raw) return ""
  if (raw.startsWith("http")) return raw
  if (raw.startsWith("linkedin.com")) return `https://${raw}`
  return raw
}

// ── Explorium: direct prospect fetch (no business_id) ─────────────────────
// Confirmed working: region_country_code filter works on /v1/prospects ONLY
// when business_id is absent. Never send both together.
async function fetchProspectsDirect(
  filters: Record<string, unknown>,
  geoScope: string | undefined,
  geoRegionCode: string | undefined
): Promise<ExploriumProspect[]> {
  const ef = filters as {
    country_code?: string[]
    company_size?: string[]
    job_level?: string[]
    job_department?: string[]
  }

  const isLocal = geoScope === "local" && !!geoRegionCode
  const pageSize = isLocal ? PAGE_SIZE_LOCAL : PAGE_SIZE_NATIONAL

  // Geo filter: region_country_code XOR country_code — never both
  const geoFilter: Record<string, unknown> = isLocal
    ? { region_country_code: { values: [geoRegionCode!.toUpperCase()] } }
    : ef.country_code?.length
      ? { country_code: { values: ef.country_code } }
      : {}

  // Confirmed valid filters for /v1/prospects direct (no business_id):
  // region_country_code / country_code, company_size, job_level, job_department.
  // website_keywords is a company-level filter — rejected as extra fields.
  const body: Record<string, unknown> = {
    mode: "full",
    page_size: pageSize,
    size: pageSize,
    page: 1,
    filters: {
      ...geoFilter,
      ...(ef.company_size?.length   && { company_size:   { values: ef.company_size } }),
      ...(ef.job_level?.length      && { job_level:      { values: ef.job_level } }),
      ...(ef.job_department?.length && { job_department: { values: ef.job_department } }),
    },
  }

  console.log("[leads/prospects] direct fetch request:", JSON.stringify(body))

  const res = await fetch(`${EXPLORIUM_BASE}/v1/prospects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", API_KEY: EXPLORIUM_KEY ?? "" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("[leads/prospects] HTTP", res.status, text)
    throw new Error(`Explorium prospects failed: ${res.status}`)
  }

  const data = await res.json()
  console.log("[leads/prospects] response keys:", Object.keys(data))
  console.log("[leads/prospects] total_results:", data?.total_results ?? "unknown")

  const list: ExploriumProspect[] =
    data?.prospects ?? data?.data ?? data?.results ?? data?.items ?? []

  // Diagnostic: log company size distribution to check if filter is working
  console.log("[leads/prospects] company sizes:",
    list.map((p) => (p as Record<string, unknown>).company_size ?? (p as Record<string, unknown>).number_of_employees ?? "unknown"))

  return list
}

// ── Claude: score prospects ────────────────────────────────────────────────
async function scoreProspects(
  prospects: ExploriumProspect[],
  campaignContext: { angleTitle: string; pitch: string }
): Promise<ScoredProspect[]> {
  if (prospects.length === 0) return []

  const toScore = prospects.map((p) => ({
    id:      p.prospect_id ?? p.id ?? "",
    title:   p.job_title   ?? p.title ?? "",
    level:   p.job_level_main ?? p.job_level ?? "",
    company: p.company_name ?? "",
  }))

  let raw = ""
  try {
    const message = await retryWithBackoff(
      () => anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `You score B2B sales prospects for a specific campaign. For each prospect return their tier:
- decision_maker: CxO, VP, Director, Owner, Founder, President, Partner, Board Member — can sign or block a deal AND is a practical buyer for this product
- influencer: Senior Manager, Manager, Senior IC — can advocate internally but can't approve solo
- noise: Junior ICs, interns, freelancers — no buying authority. Also noise: Fortune 500 / global enterprise executives who are too senior/large to practically engage with this product.

Campaign: ${campaignContext.angleTitle}
Pitch: ${campaignContext.pitch}

Use the campaign context to judge fit. A CEO of a 50,000-person company is noise for a local events product. An HR Director at a 200-person company is a decision maker for corporate group ticket sales.

Return ONLY a JSON array, no markdown: [{"id":"...","tier":"decision_maker|influencer|noise"}]`,
        messages: [{
          role: "user",
          content: `Score these prospects:\n${JSON.stringify(toScore)}`,
        }],
      }),
      "scoreProspects"
    )

    raw = message.content[0].type === "text" ? message.content[0].text : "[]"
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
  } catch (err) {
    console.error("[leads/score] Claude error, falling back to rule-based:", err)
    return prospects.map((p) => ({
      prospect_id:  p.prospect_id ?? p.id ?? "",
      full_name:    p.full_name   ?? p.name ?? "Unknown",
      job_title:    p.job_title   ?? p.title ?? "",
      linkedin_url: normalizeLinkedinUrl(extractLinkedinUrl(p)),
      company_name: p.company_name ?? "",
      tier: scoreTierByLevel(p.job_level_main ?? p.job_level ?? ""),
      geo_location: [(p.city ?? "").trim(), (p.country_name ?? "").trim()].filter(Boolean).join(", "),
    }))
  }

  let scores: { id: string; tier: "decision_maker" | "influencer" | "noise" }[] = []
  try {
    scores = JSON.parse(raw)
  } catch {
    const objectMatches = raw.match(/\{[^{}]*"id"\s*:\s*"[^"]*"[^{}]*"tier"\s*:\s*"[^"]*"[^{}]*\}/g)
      ?? raw.match(/\{[^{}]*"tier"\s*:\s*"[^"]*"[^{}]*"id"\s*:\s*"[^"]*"[^{}]*\}/g)
      ?? []
    if (objectMatches.length > 0) {
      try {
        scores = JSON.parse(`[${objectMatches.join(",")}]`)
        console.warn(`[leads/score] Recovered ${scores.length} entries from truncated response`)
      } catch {
        console.error("[leads/score] JSON recovery failed, falling back to rule-based")
      }
    } else {
      console.error("[leads/score] No recoverable JSON objects, falling back to rule-based")
    }
  }
  const scoreMap = new Map(scores.map((s) => [s.id, s.tier]))

  return prospects.map((p) => ({
    prospect_id:  p.prospect_id ?? p.id ?? "",
    full_name:    p.full_name   ?? p.name  ?? "Unknown",
    job_title:    p.job_title   ?? p.title ?? "",
    linkedin_url: normalizeLinkedinUrl(extractLinkedinUrl(p)),
    company_name: p.company_name ?? "",
    tier: scoreMap.get(p.prospect_id ?? p.id ?? "") ?? scoreTierByLevel(p.job_level_main ?? p.job_level ?? ""),
    geo_location: [(p.city ?? "").trim(), (p.country_name ?? "").trim()].filter(Boolean).join(", "),
  }))
}

function scoreTierByLevel(level: string): "decision_maker" | "influencer" | "noise" {
  const l = level.toLowerCase()
  if (["c-suite","owner","founder","president","partner","board member","vice president","director"].includes(l))
    return "decision_maker"
  if (["senior manager","manager","senior non-managerial","advisor"].includes(l))
    return "influencer"
  return "noise"
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params
  console.log("[leads] EXPLORIUM_API_KEY defined:", !!process.env.EXPLORIUM_API_KEY)
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Campaign ownership
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  // Credit check
  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  if (!userData || userData.credits_balance < MIN_CREDITS_TO_RUN) {
    return NextResponse.json(
      { error: "insufficient_credits", balance: userData?.credits_balance ?? 0 },
      { status: 402 }
    )
  }

  // Mark campaign as fetching
  await supabase
    .from("campaigns")
    .update({ status: "fetching_companies" })
    .eq("id", campaignId)

  // Read optional override params from request body
  let overrides: { company_size?: string[]; job_level?: string[]; city_focus?: string } = {}
  try {
    const body = await request.json()
    overrides = body?.overrides ?? {}
  } catch { /* no body — fresh run */ }

  // Extract filters and geo from icp_json
  const icpJson = campaign.icp_json as Record<string, unknown> | null
  const baseFilters: Record<string, unknown> =
    ((icpJson?.angle_data as Record<string, unknown>)?.explorium_filters as Record<string, unknown>) ??
    (icpJson?.explorium_filters as Record<string, unknown>) ??
    {}

  // Merge overrides — caller values win
  const angleFilters: Record<string, unknown> = {
    ...baseFilters,
    ...(overrides.company_size?.length && { company_size: overrides.company_size }),
    ...(overrides.job_level?.length    && { job_level:    overrides.job_level }),
  }

  const geoObj         = icpJson?.geo as Record<string, unknown> | undefined
  const geoScope       = geoObj?.geo_scope      as string | undefined
  const geoRegionCode  = geoObj?.geo_region_code as string | undefined
  const cityFocus      = overrides.city_focus?.trim() ?? ""

  console.log("[leads] icp_json keys:", icpJson ? Object.keys(icpJson) : "null")
  console.log("[leads] angleFilters:", JSON.stringify(angleFilters))
  console.log("[leads] geo_scope:", geoScope ?? "none", "geo_region_code:", geoRegionCode ?? "none")
  if (cityFocus) console.log("[leads] city_focus override:", cityFocus)

  let prospects: ExploriumProspect[] = []
  let scoredProspects: ScoredProspect[] = []

  try {
    // ── Direct prospect fetch ────────────────────────────────────────────
    prospects = await fetchProspectsDirect(angleFilters, geoScope, geoRegionCode)
    console.log("[leads] prospects fetched:", prospects.length)
    if (prospects.length > 0) {
      console.log("[leads] first prospect keys:", Object.keys(prospects[0]))
      console.log("[leads] first prospect:", JSON.stringify(prospects[0]))
    }

    // ── Optional city post-filter ────────────────────────────────────────
    if (cityFocus) {
      const cf = cityFocus.toLowerCase()
      const before = prospects.length
      prospects = prospects.filter((p) => (p.city ?? "").toLowerCase().includes(cf))
      console.log(`[leads/city] "${cityFocus}": ${prospects.length}/${before} kept`)
    }

    // ── Score with Claude ────────────────────────────────────────────────
    const angleTitle = (campaign.angle_selected as string | null) ?? ""
    const pitch = ((icpJson?.angle_data as Record<string, unknown> | undefined)?.pitch_summary as string | null) ?? ""
    scoredProspects = await scoreProspects(prospects, { angleTitle, pitch })
    console.log("[leads] scored:", scoredProspects.map((p) => `${p.job_title}→${p.tier}`))

  } catch (err) {
    console.error("[leads] pipeline error:", err)
    await supabase.from("campaigns").update({ status: "active" }).eq("id", campaignId)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch leads" },
      { status: 500 }
    )
  }

  // ── Persist to DB ────────────────────────────────────────────────────────
  // Delete existing leads before re-inserting (supports re-fetch / refine)
  await supabase.from("leads").delete().eq("campaign_id", campaignId)

  // Insert ALL prospects (noise included) — noise hidden by default in UI
  const tierOrder: Record<string, number> = { decision_maker: 0, influencer: 1, noise: 2 }
  const allSorted = scoredProspects
    .sort((a, b) => (tierOrder[a.tier] ?? 2) - (tierOrder[b.tier] ?? 2))

  const leadRows = allSorted.map((p) => ({
    campaign_id:     campaignId,
    company_id:      null,
    prospect_id:     p.prospect_id,
    full_name:       p.full_name,
    job_title:       p.job_title,
    linkedin_url:    p.linkedin_url,
    email:           null,
    phone:           null,
    tier:            p.tier,
    unlocked:        false,
    credits_charged: 0,
  }))

  let insertedLeads: {
    id: string
    prospect_id: string
    full_name: string
    job_title: string
    linkedin_url: string
    tier: string
    unlocked: boolean
    email: string | null
    phone: string | null
    company_id: string | null
  }[] = []

  if (leadRows.length > 0) {
    const { data, error: insertError } = await supabase
      .from("leads")
      .insert(leadRows)
      .select("id, prospect_id, full_name, job_title, linkedin_url, tier, unlocked, email, phone, company_id")
    if (insertError) console.error("[leads] insert error:", insertError)
    insertedLeads = data ?? []
  }

  // ── Deduct credits (based on actual prospects returned) ─────────────────
  const creditsToDeduct = Math.max(1, prospects.length)
  const { error: deductError } = await supabase.rpc("deduct_credits", {
    p_user_id:        user.id,
    p_amount:         creditsToDeduct,
    p_action:         "company_fetch",
    p_explorium_cost: prospects.length * 0.04,
    p_reference_id:   campaignId,
  })
  if (deductError) console.error("[leads] deduct_credits error:", deductError)

  // ── Update campaign status ───────────────────────────────────────────────
  await supabase
    .from("campaigns")
    .update({ status: "preview_ready" })
    .eq("id", campaignId)

  // Build a map of prospect_id → scored data for response
  const scoredMap = new Map(allSorted.map((p) => [p.prospect_id, p]))

  const leadsWithCompany = insertedLeads.map((l) => {
    const scored = scoredMap.get(l.prospect_id)
    return {
      ...l,
      company_name: scored?.company_name ?? "",
      geo_location: scored?.geo_location ?? "",
    }
  })

  return NextResponse.json({
    leads:             leadsWithCompany,
    companies_fetched: prospects.length,  // repurposed: total prospects fetched
    credits_deducted:  creditsToDeduct,
  })
}
