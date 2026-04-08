"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarProps {
  credits?: number
  userEmail?: string
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "text-white"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
      style={active ? { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" } : {}}
    >
      {icon}
      {label}
    </Link>
  )
}

export default function Sidebar({ credits, userEmail }: SidebarProps) {
  const pathname = usePathname()

  const isNewCampaign = pathname === "/dashboard/campaigns/new"
  const isCampaigns =
    pathname === "/dashboard" ||
    (pathname.startsWith("/dashboard/campaigns/") && !isNewCampaign)

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="inline-block">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-black">Sales</span>
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            >
              Pal
            </span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {/* CAMPAIGNS */}
        <p className="px-5 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Campaigns
        </p>
        <NavItem
          href="/dashboard"
          label="Campaigns"
          active={isCampaigns}
          icon={
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <NavItem
          href="/dashboard/campaigns/new"
          label="New Campaign"
          active={isNewCampaign}
          icon={
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        />

        {/* ACCOUNT */}
        <p className="px-5 pt-6 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Account
        </p>
        {credits !== undefined && (
          <div className="flex items-center gap-3 px-3 py-2 mx-2 text-sm text-gray-500 select-none">
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="tabular-nums font-medium text-black">{credits.toLocaleString()}</span>
            <span className="text-gray-400">credits</span>
          </div>
        )}
        {userEmail && (
          <div className="flex items-center gap-3 px-3 py-2 mx-2 min-w-0">
            <svg className="size-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-400 truncate">{userEmail}</span>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <button
          disabled
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-600 cursor-not-allowed opacity-70"
          title="Coming soon"
        >
          <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Buy Credits
        </button>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
