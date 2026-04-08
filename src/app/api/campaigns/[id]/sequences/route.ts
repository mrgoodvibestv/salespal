import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { retryWithBackoff } from "@/lib/ai/retry"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface EmailSequence {
  day: number
  subject: string
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
    .order("tier", { ascending: true }) // decision_maker sorts first alphabetically
    .limit(3)

  const leadsContext = (unlockedLeads ?? []).length > 0
    ? (unlockedLeads ?? [])
        .map((l) => `- ${l.full_name}, ${l.job_title}`)
        .join("\n")
    : "No unlocked leads yet — write to the target title persona."

  // Build prompt
  const systemPrompt = `You are an expert B2B cold email copywriter. Write punchy, human-sounding outreach — not corporate AI slop. Short sentences. No buzzwords. No "I hope this finds you well." Write a 3-email cold outreach sequence for this campaign.

Email 1 — Day 1: Cold intro. 3-4 sentences max. Lead with the problem or opportunity, not the product. End with a soft question.

Email 2 — Day 4: Follow-up. Reference Email 1. Add one concrete data point or insight. Different angle. 2-3 sentences + CTA.

Email 3 — Day 9: Breakup email. Short, direct, slightly cheeky. One sentence pitch + offer to share something useful.

Return ONLY valid JSON, no markdown:
{
  "emails": [
    {
      "day": 1,
      "subject": "...",
      "body": "...",
      "tone": "intro"
    },
    {
      "day": 4,
      "subject": "...",
      "body": "...",
      "tone": "followup"
    },
    {
      "day": 9,
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

Write the 3-email sequence targeting these decision makers.`

  let emails: EmailSequence[] = []

  try {
    const message = await retryWithBackoff(
      () => anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
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

  return NextResponse.json({ emails })
}
