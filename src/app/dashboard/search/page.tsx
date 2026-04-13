import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Sidebar from "@/components/Sidebar"
import SearchContent from "./SearchContent"

export default async function SearchPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  const credits = userData?.credits_balance ?? 0

  return (
    <div className="flex min-h-screen bg-white overflow-x-hidden">
      <Sidebar credits={credits} userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 ml-0 md:ml-64">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pt-[88px] md:pt-8 pb-8">
          <SearchContent credits={credits} userEmail={user.email ?? ""} />
        </div>
      </main>
    </div>
  )
}
