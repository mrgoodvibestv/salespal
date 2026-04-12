import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Service role client — bypasses RLS, required for webhook
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const rawBody = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("[webhook] signature verification failed:", err)
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true })
    }

    const userId      = session.metadata?.user_id
    const creditsStr  = session.metadata?.credits
    const creditsToAdd = creditsStr ? parseInt(creditsStr, 10) : 0

    if (!userId || !creditsToAdd) {
      console.error("[webhook] missing metadata — user_id or credits", session.metadata)
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
    }

    const { error } = await supabase.rpc("add_credits", {
      p_user_id:  userId,
      p_amount:   creditsToAdd,
      p_action:   "pack_purchase",
    })

    if (error) {
      console.error("[webhook] add_credits error:", error)
      return NextResponse.json({ error: "Failed to add credits" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
