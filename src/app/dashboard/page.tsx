import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch credit balance from public.users
  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance")
    .eq("id", user.id)
    .single()

  const credits = userData?.credits_balance ?? 0

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6">
            {/* Credit balance */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
              <span
                className="size-2 rounded-full inline-block"
                style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
              />
              <span className="text-sm font-semibold text-black tabular-nums">
                {credits.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">credits</span>
            </div>

            {/* User email */}
            <span className="text-sm text-gray-500 hidden sm:block">
              {user.email}
            </span>

            {/* Sign out */}
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-12">
        {/* Start new campaign — always prominent */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-black">Campaigns</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Each campaign targets a specific ICP and generates a full lead list.
            </p>
          </div>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
            }}
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Start New Campaign
          </Link>
        </div>

        {/* Empty state */}
        <EmptyState />
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
        <svg
          className="size-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="url(#grad)"
          strokeWidth={1.5}
        >
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4B6BF5" />
              <stop offset="100%" stopColor="#7B4BF5" />
            </linearGradient>
          </defs>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-black mb-1">
        No campaigns yet
      </h2>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
        Start your first campaign to find qualified leads and generate
        personalized outreach sequences.
      </p>
      <Link
        href="/dashboard/campaigns/new"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
        style={{
          background: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
        }}
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Start New Campaign
      </Link>

      {/* Trial credits callout */}
      <div className="mt-8 px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 max-w-sm text-left">
        <p className="text-xs font-semibold text-black mb-1">
          Your 10 free trial credits are ready
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Trial credits cover 10 company fetches with top 3 contacts each —
          enough to see real decision makers before you buy.
        </p>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <Link href="/dashboard" className="inline-block">
      <span className="text-xl font-bold tracking-tight">
        <span className="text-black">Sales</span>
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
          }}
        >
          Pal
        </span>
      </span>
    </Link>
  )
}

function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="text-sm text-gray-400 hover:text-black transition-colors"
      >
        Sign out
      </button>
    </form>
  )
}
