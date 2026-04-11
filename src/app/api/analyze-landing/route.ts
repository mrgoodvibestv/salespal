import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ipCooldowns = new Map<string, number>()
const COOLDOWN_MS = 60 * 1000 // 60 seconds

export async function POST(request: NextRequest) {
  const { url } = await request.json().catch(() => ({})) as { url?: string }

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 })
  }

  // Extract IP
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "anonymous"

  // Check cooldown
  const lastCall = ipCooldowns.get(ip)
  const now = Date.now()
  if (lastCall && now - lastCall < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - lastCall)) / 1000)
    return NextResponse.json({ error: "rate_limited", retryAfter }, { status: 429 })
  }

  // Record this call
  ipCooldowns.set(ip, now)

  // Clean up old entries every ~500 requests to prevent memory growth
  if (ipCooldowns.size > 500) {
    const cutoff = now - COOLDOWN_MS
    ipCooldowns.forEach((ts, key) => {
      if (ts < cutoff) ipCooldowns.delete(key)
    })
  }

  // Try to fetch the page HTML — fall back to URL-only if it fails
  let siteContent = ""
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; SalesPal/1.0)" } })
    clearTimeout(timeout)
    if (res.ok) {
      const html = await res.text()
      // Strip tags, collapse whitespace, cap at 5000 chars
      siteContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000)
    }
  } catch {
    // Silently fall back to URL-only analysis
  }

  const contextBlock = siteContent
    ? `Website URL: ${url}\n\nPage content (truncated):\n${siteContent}`
    : `Website URL: ${url}`

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system: `You are an elite B2B outbound sales strategist. Your job is to analyze a company's website and generate non-obvious, high-converting B2B campaign angles that most salespeople would miss. Return ONLY valid JSON with no markdown, no explanation, no code fences — just the raw JSON object.`,
    messages: [{
      role: "user",
      content: `${contextBlock}

CRITICAL THINKING RULES:
1. Identify what this company SELLS or OFFERS
2. Then ask: who has a BUDGET to buy access to what this company provides — not just the obvious buyer, but the adjacent ones
3. For events/venues/experiences: always consider corporate buyers — HR leaders, People & Culture teams, Client Relations, Sales leadership — who have team experience, client entertainment, or employee appreciation budgets
4. For media/content: consider B2B sponsors, advertisers, and distribution partners
5. For marketplaces/platforms: consider both supply-side and demand-side B2B plays
6. Always surface at least one NON-OBVIOUS angle that targets a buyer most people wouldn't think of
7. Target titles should reflect WHO HAS THE BUDGET and SIGNS THE CHECK — not just who uses the product

Return ONLY valid JSON:
{
  "company_name": "inferred company name",
  "what_they_sell": "one sharp sentence",
  "ideal_customer_profile": {
    "company_type": "specific description of target company type for the PRIMARY angle",
    "company_size": "e.g. 100-2,000 employees",
    "industries": ["industry1", "industry2", "industry3"]
  },
  "target_titles": [
    "Most direct budget holder",
    "Secondary decision maker",
    "Third title",
    "Fourth title"
  ],
  "campaign_angles": [
    {
      "angle": "Short descriptive angle name",
      "pitch": "One sharp sentence — the core value prop for this buyer",
      "why_now": "One sentence on urgency or timeliness",
      "hook": "A specific cold outreach opening line — personalized, not generic"
    },
    {
      "angle": "Non-obvious angle name — the one most people miss",
      "pitch": "Value prop for this lateral buyer",
      "why_now": "Why this angle is timely",
      "hook": "Cold outreach opening line"
    },
    {
      "angle": "Third angle name",
      "pitch": "Value prop",
      "why_now": "Urgency",
      "hook": "Opening line"
    }
  ],
  "tagline": "Punchy one-liner outbound tagline"
}`,
    }],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
  }
}
