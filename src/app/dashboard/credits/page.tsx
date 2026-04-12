import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Sidebar from "@/components/Sidebar"
import CreditsContent from "./CreditsContent"

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: { success?: string; cancelled?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  const credits = userData?.credits_balance ?? 0

  const priceIds = {
    starter: process.env.STRIPE_PRICE_STARTER!,
    growth:  process.env.STRIPE_PRICE_GROWTH!,
    scale:   process.env.STRIPE_PRICE_SCALE!,
  }

  return (
    <div className="flex min-h-screen bg-white overflow-x-hidden">
      <Sidebar credits={credits} userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 ml-0 md:ml-64 px-4 sm:px-6 md:px-8 pt-[88px] md:pt-8 pb-8">
        <div className="max-w-6xl w-full">
          <CreditsContent
            credits={credits}
            priceIds={priceIds}
            success={searchParams.success === "true"}
            cancelled={searchParams.cancelled === "true"}
          />
        </div>
      </main>
    </div>
  )
}
