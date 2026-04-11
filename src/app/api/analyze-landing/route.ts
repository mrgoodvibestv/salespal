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
    max_tokens: 1200,
    system: `You are a B2B sales strategist. Analyze the provided website and return ONLY valid JSON with no markdown, no explanation, no code fences — just the raw JSON object.`,
    messages: [{
      role: "user",
      content: `${contextBlock}

Based on this website, return ONLY valid JSON:
{
  "company_name": "inferred name",
  "what_they_sell": "one concise sentence",
  "ideal_customer_profile": {
    "company_type": "description of target companies",
    "company_size": "e.g. 50-500 employees",
    "industries": ["industry1", "industry2", "industry3"]
  },
  "target_titles": ["Primary Title", "Secondary Title", "Third Title", "Fourth Title"],
  "campaign_angles": [
    {
      "angle": "Short angle name",
      "pitch": "One sharp sentence — the core value prop for this angle",
      "why_now": "One sentence on why this angle is timely or urgent",
      "hook": "A cold outreach opening line for this angle"
    },
    {
      "angle": "Short angle name",
      "pitch": "One sharp sentence — the core value prop for this angle",
      "why_now": "One sentence on why this angle is timely or urgent",
      "hook": "A cold outreach opening line for this angle"
    },
    {
      "angle": "Short angle name",
      "pitch": "One sharp sentence — the core value prop for this angle",
      "why_now": "One sentence on why this angle is timely or urgent",
      "hook": "A cold outreach opening line for this angle"
    }
  ],
  "tagline": "A punchy one-liner outbound tagline"
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
