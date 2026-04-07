import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { retryWithBackoff } from "@/lib/ai/retry"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const EXPLORIUM_BASE = "https://api.explorium.ai"
const EXPLORIUM_KEY = process.env.EXPLORIUM_API_KEY

const MAX_COMPANIES = 7
const MAX_PROSPECTS_PER_COMPANY = 3
const MIN_CREDITS_TO_RUN = 5

// ── Types ──────────────────────────────────────────────────────────────────
interface ExploriumBusiness {
  business_id?: string
  id?: string
  name: string
  website?: string
  domain?: string
  linkedin_url?: string
  employee_count?: number
  industry?: string
  [key: string]: unknown
}

interface ExploriumProspect {
  prospect_id?: string
  id?: string
  full_name?: string
  name?: string
  job_title?: string
  title?: string
  job_level?: string
  linkedin_url?: string
  business_id?: string
  company_id?: string
  [key: string]: unknown
}

interface ScoredProspect {
  prospect_id: string
  full_name: string
  job_title: string
  linkedin_url: string
  business_id: string
  tier: "decision_maker" | "influencer" | "noise"
}

// ── Explorium: fetch businesses ────────────────────────────────────────────
async function fetchBusinesses(
  filters: Record<string, unknown>
): Promise<ExploriumBusiness[]> {
  const ef = filters as {
    website_keywords?: string[]
    company_size?: string[]
    country_code?: string[]
  }

  const body: Record<string, unknown> = {
    mode: "full",
    page_size: MAX_COMPANIES,
    size: MAX_COMPANIES,
    page: 1,
    filters: {
      ...(ef.website_keywords?.length && { website_keywords: { values: ef.website_keywords } }),
      ...(ef.company_size?.length     && { company_size:     { values: ef.company_size } }),
      ...(ef.country_code?.length     && { country_code:     { values: ef.country_code } }),
    },
  }

  console.log("[leads/businesses] request:", JSON.stringify(body))

  const res = await fetch(`${EXPLORIUM_BASE}/v1/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", API_KEY: EXPLORIUM_KEY ?? "" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("[leads/businesses] HTTP", res.status, text)
    throw new Error(`Explorium businesses failed: ${res.status}`)
  }

  const data = await res.json()
  console.log("[leads/businesses] response keys:", Object.keys(data))

  // Handle common response shapes
  const list: ExploriumBusiness[] =
    data?.businesses ?? data?.data ?? data?.results ?? data?.items ?? []
  return list
}

// ── Explorium: fetch prospects for a set of business IDs ──────────────────
async function fetchProspects(
  businessIds: string[],
  filters: Record<string, unknown>
): Promise<ExploriumProspect[]> {
  const ef = filters as {
    job_level?: string[]
    job_department?: string[]
  }

  const body: Record<string, unknown> = {
    mode: "full",
    page_size: businessIds.length * MAX_PROSPECTS_PER_COMPANY,
    size: businessIds.length * MAX_PROSPECTS_PER_COMPANY,
    page: 1,
    max_per_company: MAX_PROSPECTS_PER_COMPANY,
    filters: {
      business_id: { values: businessIds },
      ...(ef.job_level?.length      && { job_level:      { values: ef.job_level } }),
      ...(ef.job_department?.length && { job_department: { values: ef.job_department } }),
    },
  }

  console.log("[leads/prospects] request business_ids:", businessIds)

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

  const list: ExploriumProspect[] =
    data?.prospects ?? data?.data ?? data?.results ?? data?.items ?? []
  return list
}

// ── Claude: score prospects ────────────────────────────────────────────────
async function scoreProspects(prospects: ExploriumProspect[]): Promise<ScoredProspect[]> {
  if (prospects.length === 0) return []

  const toScore = prospects.map((p) => ({
    id:    p.prospect_id ?? p.id ?? "",
    title: p.job_title   ?? p.title ?? "",
    level: p.job_level   ?? "",
  }))

  let raw = ""
  try {
    const message = await retryWithBackoff(
      () => anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `You score B2B sales prospects. For each prospect return their tier:
- decision_maker: CxO, VP, Director, Owner, Founder, President, Partner, Board Member — anyone who can sign or block a deal
- influencer: Senior Manager, Manager, Senior IC — can advocate internally but can't approve solo
- noise: Junior, non-managerial ICs, interns, freelancers — no buying authority

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
    // Rule-based fallback
    return prospects.map((p) => ({
      prospect_id: p.prospect_id ?? p.id ?? "",
      full_name:   p.full_name   ?? p.name ?? "Unknown",
      job_title:   p.job_title   ?? p.title ?? "",
      linkedin_url: p.linkedin_url ?? "",
      business_id:  p.business_id ?? p.company_id ?? "",
      tier: scoreTierByLevel(p.job_level ?? ""),
    }))
  }

  let scores: { id: string; tier: "decision_maker" | "influencer" | "noise" }[] = []
  try {
    scores = JSON.parse(raw)
  } catch {
    // Response may be truncated — extract all complete objects from the array
    // Match every {...} object that has both "id" and "tier" fields
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

  return prospects.map((p) => {
    const id = p.prospect_id ?? p.id ?? ""
    return {
      prospect_id:  id,
      full_name:    p.full_name  ?? p.name  ?? "Unknown",
      job_title:    p.job_title  ?? p.title ?? "",
      linkedin_url: p.linkedin_url ?? "",
      business_id:  p.business_id ?? p.company_id ?? "",
      tier: scoreMap.get(id) ?? scoreTierByLevel(p.job_level ?? ""),
    }
  })
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
  _request: NextRequest,
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

  // Extract filters from icp_json
  const icpJson = campaign.icp_json as Record<string, unknown> | null
  const angleFilters: Record<string, unknown> =
    ((icpJson?.angle_data as Record<string, unknown>)?.explorium_filters as Record<string, unknown>) ??
    (icpJson?.explorium_filters as Record<string, unknown>) ??
    {} as Record<string, unknown>

  console.log("[leads] campaign icp_json keys:", icpJson ? Object.keys(icpJson) : "null")
  console.log("[leads] extracted filters:", JSON.stringify(angleFilters))

  let businesses: ExploriumBusiness[] = []
  let prospects: ExploriumProspect[] = []
  let scoredProspects: ScoredProspect[] = []

  try {
    // ── Fetch companies ──────────────────────────────────────────────────
    businesses = await fetchBusinesses(angleFilters)
    console.log("[leads] businesses fetched:", businesses.length)

    if (businesses.length === 0) {
      await supabase.from("campaigns").update({ status: "active" }).eq("id", campaignId)
      return NextResponse.json({ leads: [], companies_fetched: 0, message: "No matching companies found. Try broadening your filters." })
    }

    // Normalise business IDs
    const businessIds = businesses
      .map((b) => b.business_id ?? b.id ?? "")
      .filter(Boolean)

    // ── Fetch prospects ──────────────────────────────────────────────────
    prospects = await fetchProspects(businessIds, angleFilters)
    console.log("[leads] prospects fetched:", prospects.length)
    if (prospects.length > 0) {
      console.log("[leads] first prospect keys:", Object.keys(prospects[0]))
      console.log("[leads] first prospect sample:", JSON.stringify(prospects[0]))
    }

    // ── Score with Claude ────────────────────────────────────────────────
    scoredProspects = await scoreProspects(prospects)
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
  const qualified = scoredProspects.filter((p) => p.tier !== "noise")

  // Build a map of Explorium business_id → DB company uuid
  const companyIdMap = new Map<string, string>()
  for (const biz of businesses) {
    const exploId = biz.business_id ?? biz.id ?? ""
    if (!exploId) continue
    const { data: companyRow } = await supabase
      .from("companies")
      .insert({
        campaign_id:     campaignId,
        business_id:     exploId,
        name:            biz.name,
        domain:          biz.website ?? biz.domain ?? "",
        qualified:       true,
        credits_charged: 1,
      })
      .select("id")
      .single()
    if (companyRow) companyIdMap.set(exploId, companyRow.id)
  }

  // Insert qualified leads
  const leadRows = qualified.map((p) => ({
    campaign_id:    campaignId,
    company_id:     companyIdMap.get(p.business_id) ?? null,
    prospect_id:    p.prospect_id,
    full_name:      p.full_name,
    job_title:      p.job_title,
    linkedin_url:   p.linkedin_url,
    email:          null,
    phone:          null,
    tier:           p.tier,
    unlocked:       false,
    credits_charged: 0,
  }))

  let insertedLeads: { id: string; full_name: string; job_title: string; linkedin_url: string; tier: string; unlocked: boolean; email: string | null; phone: string | null; company_id: string | null }[] = []
  if (leadRows.length > 0) {
    const { data, error: insertError } = await supabase
      .from("leads")
      .insert(leadRows)
      .select("id, full_name, job_title, linkedin_url, tier, unlocked, email, phone, company_id")
    if (insertError) console.error("[leads] insert error:", insertError)
    insertedLeads = data ?? []
  }

  // ── Deduct credits (1 per company fetched) ───────────────────────────────
  const creditsToDeduct = businesses.length
  const { error: deductError } = await supabase.rpc("deduct_credits", {
    p_user_id:       user.id,
    p_amount:        creditsToDeduct,
    p_action:        "company_fetch",
    p_explorium_cost: businesses.length * 0.04,
    p_reference_id:  campaignId,
  })
  if (deductError) console.error("[leads] deduct_credits error:", deductError)

  // ── Update campaign status ───────────────────────────────────────────────
  await supabase
    .from("campaigns")
    .update({ status: "preview_ready" })
    .eq("id", campaignId)

  // Enrich leads with company name for the response
  const companyNameMap = new Map(businesses.map((b) => [b.business_id ?? b.id ?? "", b.name]))
  const leadsWithCompany = insertedLeads.map((l) => {
    const exploId = businesses.find(
      (b) => companyIdMap.get(b.business_id ?? b.id ?? "") === l.company_id
    )
    return { ...l, company_name: exploId ? companyNameMap.get(exploId.business_id ?? exploId.id ?? "") ?? "" : "" }
  })

  return NextResponse.json({
    leads:             leadsWithCompany,
    companies_fetched: businesses.length,
    credits_deducted:  creditsToDeduct,
  })
}
