import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { retryWithBackoff } from "@/lib/ai/retry"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Touch {
  day: number
  channel: "email" | "linkedin"
  type: "connection_request" | "cold_intro" | "linkedin_followup" | "email_followup" | "breakup"
  subject: string | null
  body: string
  tone: "intro" | "followup" | "breakup"
}

export async function POST(
  _request: NextRequest,
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
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  // Determine if this is a regeneration (sequence already exists)
  const isRegeneration = !!campaign.sequence_json

  if (isRegeneration) {
    const REGEN_COST = 2
    const { error: deductError } = await supabase.rpc("deduct_credits", {
      p_user_id:        user.id,
      p_amount:         REGEN_COST,
      p_action:         "sequence_regeneration",
      p_explorium_cost: 0,
      p_reference_id:   campaignId,
    })

    if (deductError) {
      if (deductError.message?.includes("insufficient_credits")) {
        return NextResponse.json(
          { error: "You need 2 credits to regenerate a sequence" },
          { status: 402 }
        )
      }
      return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 })
    }
  }

  // Read campaign context from icp_json
  const icpJson = campaign.icp_json as Record<string, unknown> | null
  const angleData = icpJson?.angle_data as Record<string, unknown> | undefined
  const pitchSummary = (angleData?.pitch_summary as string) ?? ""
  const angleName = (campaign.angle_selected as string | null) ?? (angleData?.name as string) ?? ""
  const targetTitles = (angleData?.target_titles as string[]) ?? []
  const description = (icpJson?.description as string) ?? ""

  // Top 3 unlocked leads for personalization context
  const { data: unlockedLeads } = await supabase
    .from("leads")
    .select("full_name, job_title, email")
    .eq("campaign_id", campaignId)
    .eq("unlocked", true)
    .order("tier", { ascending: true })
    .limit(3)

  const leadsContext = (unlockedLeads ?? []).length > 0
    ? (unlockedLeads ?? []).map((l) => `- ${l.full_name}, ${l.job_title}`).join("\n")
    : "No unlocked leads yet — write to the target title persona."

  const systemPrompt = `You are an expert B2B outreach copywriter. Write punchy, human-sounding copy — not corporate AI slop. Short sentences. No buzzwords. No "I hope this finds you well."

Generate a 5-touch multi-channel outreach sequence:

Touch 1 — Day 1 — LinkedIn connection request:
Max 300 characters. Conversational, no pitch. End with a soft hook that makes them curious. Do NOT mention products or services directly.

Touch 2 — Day 3 — Cold email intro:
3-4 sentences. Lead with the problem or opportunity, not the product. End with a soft question.

Touch 3 — Day 6 — LinkedIn follow-up message:
2-3 sentences. Reference something relevant about their role or company. Direct CTA.

Touch 4 — Day 10 — Email follow-up:
New angle, one concrete data point or insight. 2-3 sentences + CTA.

Touch 5 — Day 14 — Breakup email:
Short, slightly cheeky. One sentence pitch + offer to share something useful.

Return ONLY valid JSON, no markdown:
{
  "emails": [
    {
      "day": 1,
      "channel": "linkedin",
      "type": "connection_request",
      "subject": null,
      "body": "...",
      "tone": "intro"
    },
    {
      "day": 3,
      "channel": "email",
      "type": "cold_intro",
      "subject": "...",
      "body": "...",
      "tone": "intro"
    },
    {
      "day": 6,
      "channel": "linkedin",
      "type": "linkedin_followup",
      "subject": null,
      "body": "...",
      "tone": "followup"
    },
    {
      "day": 10,
      "channel": "email",
      "type": "email_followup",
      "subject": "...",
      "body": "...",
      "tone": "followup"
    },
    {
      "day": 14,
      "channel": "email",
      "type": "breakup",
      "subject": "...",
      "body": "...",
      "tone": "breakup"
    }
  ]
}`

  const userMessage = `Campaign angle: ${angleName}
Pitch: ${pitchSummary}
${description ? `Business description: ${description}` : ""}
Target titles: ${targetTitles.length ? targetTitles.join(", ") : "Senior decision makers"}

Sample contacts from this campaign:
${leadsContext}

Write the 5-touch sequence targeting these decision makers.`

  let emails: Touch[] = []

  try {
    const message = await retryWithBackoff(
      () => anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      "sequences"
    )

    const raw = message.content[0].type === "text" ? message.content[0].text : ""
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
    const parsed = JSON.parse(cleaned)
    emails = parsed.emails ?? []
  } catch (err) {
    console.error("[sequences] Claude error:", err)
    if (err instanceof Error && err.message === "AI_OVERLOADED") {
      return NextResponse.json({ error: "AI_OVERLOADED" }, { status: 503 })
    }
    return NextResponse.json({ error: "Failed to generate sequence" }, { status: 500 })
  }

  // Store on campaign
  const { error: updateError } = await supabase
    .from("campaigns")
    .update({ sequence_json: { emails } })
    .eq("id", campaignId)

  if (updateError) {
    console.error("[sequences] update error:", updateError)
  }

  // Return updated credit balance so client can sync sidebar
  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  return NextResponse.json({ emails, credits_remaining: userData?.credits_balance ?? null })
}
