import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import Sidebar from "@/components/Sidebar"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:             { label: "Active",           className: "bg-blue-50 text-blue-600 border border-blue-100" },
  fetching_companies: { label: "Fetching leads…",  className: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  preview_ready:      { label: "Preview ready",    className: "bg-green-50 text-green-700 border border-green-200" },
  draft:              { label: "Draft",             className: "bg-gray-100 text-gray-500" },
  archived:           { label: "Archived",          className: "bg-gray-100 text-gray-500" },
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: userData }, { data: campaigns }] = await Promise.all([
    supabase.from("users").select("credits_balance").eq("id", user.id).single(),
    supabase
      .from("campaigns")
      .select("id, name, status, angle_selected, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  const credits = userData?.credits_balance ?? 0
  const campaignList = campaigns ?? []

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar credits={credits} userEmail={user.email ?? ""} />

      <main className="flex-1 ml-0 md:ml-64 px-4 sm:px-6 md:px-8 py-8">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-black">Campaigns</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Your active outreach campaigns
            </p>
          </div>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </Link>
        </div>

        {campaignList.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {campaignList.map((c) => {
              const status = STATUS_CONFIG[c.status] ?? { label: c.status, className: "bg-gray-100 text-gray-500" }
              const date = new Date(c.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-gray-200 bg-white hover:border-[#4B6BF5]/30 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="size-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
                    >
                      <svg className="size-4 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-black truncate group-hover:text-[#4B6BF5] transition-colors">
                        {c.name}
                      </p>
                      {c.angle_selected && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{c.angle_selected}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">{date}</span>
                    <svg
                      className="size-4 text-gray-300 group-hover:text-[#4B6BF5] transition-colors"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="size-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
      >
        <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="url(#grad)" strokeWidth={1.5}>
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4B6BF5" />
              <stop offset="100%" stopColor="#7B4BF5" />
            </linearGradient>
          </defs>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-black mb-1">No campaigns yet</h2>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
        Start your first campaign to find qualified leads and generate personalized outreach.
      </p>
      <Link
        href="/dashboard/campaigns/new"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New Campaign
      </Link>
      <div className="mt-8 px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 max-w-sm text-left">
        <p className="text-xs font-semibold text-black mb-1">Your 10 free trial credits are ready</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Trial credits cover 10 company fetches with top 3 contacts each — enough to see real decision makers before you buy.
        </p>
      </div>
    </div>
  )
}
