import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import Sidebar from "@/components/Sidebar"

const STATUS_CONFIG = {
  preview_ready:      { label: "Preview ready",   className: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  fetching_companies: { label: "Fetching leads…", className: "bg-amber-50 text-amber-700 border border-amber-200",     dot: "bg-amber-400 animate-pulse" },
  active:             { label: "Active",           className: "bg-gray-100 text-gray-600 border border-gray-200",       dot: null },
  draft:              { label: "Draft",            className: "bg-gray-50 text-gray-400 border border-gray-200",        dot: null },
  archived:           { label: "Archived",         className: "bg-gray-50 text-gray-400 border border-gray-200",        dot: null },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap ${config.className}`}>
      {config.dot && <span className={`size-1.5 rounded-full shrink-0 ${config.dot}`} />}
      {config.label}
    </span>
  )
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
    <div className="flex min-h-screen bg-white overflow-x-hidden">
      <Sidebar credits={credits} userEmail={user.email ?? ""} />

      <main className="flex-1 min-w-0 ml-0 md:ml-64 px-4 sm:px-6 md:px-8 pt-[88px] md:pt-8 pb-8">
        <div className="max-w-6xl w-full">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-1">
              Outreach Intelligence
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Campaigns</h1>
            <p className="text-sm text-gray-400 mt-0.5">
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
              const date = new Date(c.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/campaigns/${c.id}`}
                  className="card-lift flex items-center justify-between gap-2 px-4 sm:px-5 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-[#4B6BF5]/20 transition-all group overflow-hidden"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="size-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
                    >
                      <svg className="size-4 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-black truncate text-sm group-hover:text-[#4B6BF5] transition-colors">
                        {c.name}
                      </p>
                      {c.angle_selected && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{c.angle_selected}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-gray-300 tabular-nums hidden sm:block">{date}</span>
                    <svg
                      className="size-4 text-gray-300 group-hover:text-[#4B6BF5] group-hover:translate-x-0.5 transition-all duration-150"
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
        </div>
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
      <div
        className="size-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
      >
        <svg className="size-8 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h2>
      <p className="text-sm text-gray-400 leading-relaxed mb-6">
        Paste your website URL and SalesPal will identify your best outbound angle and surface decision makers who need what you sell.
      </p>
      <Link
        href="/dashboard/campaigns/new"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Start your first campaign
      </Link>
      <p className="text-xs text-gray-300 mt-4">Uses 0 credits to analyze your website</p>
    </div>
  )
}
