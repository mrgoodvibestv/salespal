import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { retryWithBackoff } from "@/lib/ai/retry"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXPLORIUM_BASE = "https://api.explorium.ai"
const EXPLORIUM_KEY = process.env.EXPLORIUM_API_KEY

// Valid enum values mirrored from Explorium filter schema
const VALID_COMPANY_SIZES = [
  "1-10", "11-50", "51-200", "201-500",
  "501-1000", "1001-5000", "5001-10000", "10001+",
]
const VALID_JOB_LEVELS = [
  "c-suite", "manager", "owner", "senior non-managerial", "partner",
  "freelancer", "junior", "director", "board member", "founder",
  "president", "senior manager", "advisor", "non-managerial", "vice president",
]
const VALID_JOB_DEPARTMENTS = [
  "administration", "healthcare", "partnerships", "c-suite", "design",
  "human resources", "engineering", "education", "strategy", "product",
  "sales", "r&d", "retail", "customer success", "security", "public service",
  "creative", "it", "support", "marketing", "trade", "legal", "operations",
  "real estate", "procurement", "data", "manufacturing", "logistics", "finance",
]

// ── Website content fetcher ────────────────────────────────────────────────
async function fetchWebsiteText(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SalesPal/1.0)" },
    })
    clearTimeout(timeout)
    if (!res.ok) return ""
    const html = await res.text()
    // Strip tags, collapse whitespace, truncate
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000)
  } catch {
    return ""
  }
}

// ── Claude ICP analysis ────────────────────────────────────────────────────
async function analyzeWithClaude(url: string, websiteText: string) {
  const siteContext = websiteText
    ? `Website content:\n${websiteText}`
    : `(Could not fetch website content — analyze based on the domain name and URL only)`

  const message = await retryWithBackoff(
    () => anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system: `You are an expert B2B sales strategist. Analyze the provided business and generate an ICP and two outbound campaign angles.
Return ONLY valid JSON — no markdown fences, no explanation. The JSON must exactly match the schema provided.`,
    messages: [
      {
        role: "user",
        content: `Business URL: ${url}
${siteContext}

Generate two campaign angles:
1. OBVIOUS ANGLE — the direct B2B campaign based on their stated offer
2. HIDDEN ANGLE — a higher-leverage B2B angle they likely haven't considered (e.g. a completely different buyer persona or use case)

Return this exact JSON structure:
{
  "campaign_name": "short descriptive campaign name",
  "icp": {
    "description": "1-2 sentence ICP summary",
    "geography": "target geography (e.g. North America, Ontario CA, United States)",
    "key_signals": ["signal1", "signal2", "signal3"]
  },
  "obvious_angle": {
    "name": "angle name (e.g. Enterprise SaaS Outbound)",
    "tagline": "one punchy line that frames the campaign",
    "target_titles": ["Title 1", "Title 2", "Title 3"],
    "target_companies": "short description of ideal target companies",
    "pitch_summary": "2-3 sentence pitch framed around their pain/outcome",
    "why_now": "1 sentence on timing or urgency",
    "explorium_filters": {
      "website_keywords": ["keyword1", "keyword2", "keyword3"],
      "company_size": ["51-200", "201-500"],
      "country_code": ["us", "ca"],
      "region_country_code": ["ca-on"],
      "job_level": ["c-suite", "director"],
      "job_department": ["engineering"]
    }
  },
  "hidden_angle": {
    "name": "angle name",
    "tagline": "one punchy line that frames the campaign",
    "target_titles": ["Title 1", "Title 2"],
    "target_companies": "short description of ideal target companies",
    "pitch_summary": "2-3 sentence pitch framed around their pain/outcome",
    "why_now": "1 sentence on timing or urgency",
    "explorium_filters": {
      "website_keywords": ["keyword1", "keyword2"],
      "company_size": ["51-200", "201-500", "501-1000"],
      "country_code": ["us"],
      "region_country_code": [],
      "job_level": ["director", "vice president"],
      "job_department": ["human resources"]
    }
  }
}

CONSTRAINTS — you MUST use only these values:
company_size: ${VALID_COMPANY_SIZES.join(", ")}
job_level: ${VALID_JOB_LEVELS.join(", ")}
job_department: ${VALID_JOB_DEPARTMENTS.join(", ")}
country_code: lowercase ISO Alpha-2 codes (e.g. "us", "ca", "gb", "au")
region_country_code: ISO 3166-2 subdivision codes in lowercase (e.g. "ca-on" for Ontario, "us-ny" for New York, "us-ca" for California, "gb-eng" for England). Use this when the business is local or regional — a Toronto wine festival targets "ca-on", a NYC agency targets "us-ny". Omit (empty array) for national or global campaigns. Note: when region_country_code is set, country_code is omitted — they are mutually exclusive. The leads pipeline uses include_operating_locations=false so only companies headquartered in the region are returned, not companies that merely have an office there.`,
      },
    ],
  }),
    "analyzeWithClaude"
  )

  const raw = message.content[0].type === "text" ? message.content[0].text : ""
  // Strip markdown fences if Claude wraps the response despite instructions
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
  return JSON.parse(text) as ClaudeAnalysis
}

// ── Explorium stats ────────────────────────────────────────────────────────
async function fetchExploriumStats(filters: ExploriumFilterInput): Promise<{ companies: number; estimated_contacts: number }> {
  try {
    const body: Record<string, unknown> = {
      filters: {
        ...(filters.website_keywords?.length && { website_keywords: { values: filters.website_keywords } }),
        ...(filters.company_size?.length     && { company_size:     { values: filters.company_size } }),
        ...(filters.country_code?.length     && { country_code:     { values: filters.country_code } }),
      },
    }

    const res = await fetch(`${EXPLORIUM_BASE}/v1/businesses/stats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        API_KEY: EXPLORIUM_KEY ?? "",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error("[explorium/stats] HTTP", res.status, await res.text())
      return { companies: 0, estimated_contacts: 0 }
    }

    const data = await res.json()
    // Explorium returns total_count or count depending on version
    const companies: number =
      data?.total_count ?? data?.count ?? data?.total ?? 0
    return { companies, estimated_contacts: companies * 3 }
  } catch (err) {
    console.error("[explorium/stats] error", err)
    return { companies: 0, estimated_contacts: 0 }
  }
}

// ── Types ──────────────────────────────────────────────────────────────────
interface ExploriumFilterInput {
  website_keywords?: string[]
  company_size?: string[]
  country_code?: string[]
  region_country_code?: string[]
  job_level?: string[]
  job_department?: string[]
}

interface CampaignAngle {
  name: string
  tagline: string
  target_titles: string[]
  target_companies: string
  pitch_summary: string
  why_now: string
  explorium_filters: ExploriumFilterInput
}

interface ClaudeAnalysis {
  campaign_name: string
  icp: { description: string; geography: string; key_signals: string[] }
  obvious_angle: CampaignAngle
  hidden_angle: CampaignAngle
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { url } = await request.json()
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 })
  }

  // Step 1: fetch website content in parallel with nothing yet
  const websiteText = await fetchWebsiteText(url)

  // Step 2: Claude ICP + angle analysis
  let analysis: ClaudeAnalysis
  try {
    analysis = await analyzeWithClaude(url, websiteText)
  } catch (err) {
    console.error("[analyze] Claude error", err)
    const overloaded = err instanceof Error && err.message === "AI_OVERLOADED"
    return NextResponse.json(
      { error: overloaded ? "AI_OVERLOADED" : "Failed to analyze website. Please try again." },
      { status: overloaded ? 503 : 500 }
    )
  }

  // Step 3: Explorium stats using obvious angle filters (company-level only)
  const stats = await fetchExploriumStats(
    analysis.obvious_angle.explorium_filters
  )

  return NextResponse.json({
    campaign_name: analysis.campaign_name,
    icp: analysis.icp,
    obvious_angle: analysis.obvious_angle,
    hidden_angle: analysis.hidden_angle,
    stats,
  })
}
