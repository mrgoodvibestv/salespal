import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { retryWithBackoff } from "@/lib/ai/retry"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Campaign ownership
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, user_id, angle_selected, icp_json")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const { context_override } = await request.json().catch(() => ({})) as { context_override?: string }

  // Fetch all existing leads for this campaign
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, prospect_id, full_name, job_title, tier")
    .eq("campaign_id", campaignId)

  if (leadsError || !leads?.length) {
    return NextResponse.json({ error: "No leads found for this campaign" }, { status: 404 })
  }

  // Build scoring input from stored lead data
  const toScore = leads.map((l) => ({
    id:      l.id,  // use DB id (not prospect_id) so we can update directly
    title:   l.job_title ?? "",
    level:   "",    // not stored — Claude infers from title
    company: "",
  }))

  const icpJson = campaign.icp_json as Record<string, unknown> | null
  const angleTitle = (campaign.angle_selected as string | null) ?? ""
  const pitch = ((icpJson?.angle_data as Record<string, unknown> | undefined)?.pitch_summary as string | null) ?? ""

  const contextBlock = context_override?.trim()
    ? `\nAdditional context from user: ${context_override.trim()}`
    : ""

  let raw = ""
  try {
    const message = await retryWithBackoff(
      () => anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `You re-score B2B sales prospects for a specific campaign. Tier definitions:
- decision_maker: CxO, VP, Director, Owner, Founder, President, Partner, Board Member — can sign or block a deal AND is a practical buyer for this product
- influencer: Senior Manager, Manager, Senior IC — can advocate internally but can't approve solo
- noise: Junior ICs, interns, freelancers — no buying authority. Also noise: Fortune 500 / global enterprise executives too senior/large to practically engage with this product.

Campaign: ${angleTitle}
Pitch: ${pitch}${contextBlock}

Return ONLY a JSON array, no markdown: [{"id":"...","tier":"decision_maker|influencer|noise"}]`,
        messages: [{
          role: "user",
          content: `Re-score these prospects:\n${JSON.stringify(toScore)}`,
        }],
      }),
      "scoreProspects"
    )
    raw = message.content[0].type === "text" ? message.content[0].text : "[]"
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
  } catch (err) {
    console.error("[score] Claude error:", err)
    return NextResponse.json({ error: "Scoring failed. Please try again." }, { status: 500 })
  }

  let scores: { id: string; tier: "decision_maker" | "influencer" | "noise" }[] = []
  try {
    scores = JSON.parse(raw)
  } catch {
    console.error("[score] JSON parse failed:", raw)
    return NextResponse.json({ error: "Scoring response invalid. Please try again." }, { status: 500 })
  }

  // Update each lead's tier in DB
  const updates = await Promise.all(
    scores.map(({ id, tier }) =>
      supabase.from("leads").update({ tier }).eq("id", id).eq("campaign_id", campaignId)
    )
  )
  const updateErrors = updates.filter((r) => r.error)
  if (updateErrors.length) {
    console.error("[score] some updates failed:", updateErrors.map((r) => r.error))
  }

  console.log("[score] re-scored", scores.length, "leads")
  return NextResponse.json({ leads: scores })
}
