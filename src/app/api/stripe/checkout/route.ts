import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const ALLOWED_PRICES: Record<string, number> = {
    [process.env.STRIPE_PRICE_STARTER!]: 100,
    [process.env.STRIPE_PRICE_GROWTH!]:  400,
    [process.env.STRIPE_PRICE_SCALE!]:   1000,
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { priceId } = await req.json()

  if (!priceId || !(priceId in ALLOWED_PRICES)) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 })
  }

  const credits = ALLOWED_PRICES[priceId]

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: "https://sp.goodvibesai.com/dashboard/credits?success=true",
    cancel_url:  "https://sp.goodvibesai.com/dashboard/credits?cancelled=true",
    customer_email: user.email,
    metadata: {
      user_id:  user.id,
      price_id: priceId,
      credits:  String(credits),
    },
  })

  return NextResponse.json({ url: session.url })
}
