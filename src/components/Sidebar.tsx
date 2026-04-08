"use client"

import { useState } from "react"
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
  soon,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
  soon?: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "text-white"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
      style={active ? { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" } : {}}
    >
      {icon}
      <span className="truncate">{label}</span>
      {soon && (
        <span className="text-[9px] text-gray-400 ml-auto shrink-0">soon</span>
      )}
    </Link>
  )
}

function LogoBadge() {
  return (
    <span className="text-xl font-bold tracking-tight">
      <span className="text-black">Sales</span>
      <span
        className="bg-clip-text text-transparent"
        style={{ backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
      >
        Pal
      </span>
    </span>
  )
}

function NavContent({
  credits,
  userEmail,
  isCampaigns,
  isNewCampaign,
  onNavClick,
}: {
  credits?: number
  userEmail?: string
  isCampaigns: boolean
  isNewCampaign: boolean
  onNavClick?: () => void
}) {
  return (
    <>
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {/* CAMPAIGNS */}
        <p className="px-5 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Campaigns
        </p>
        <NavItem
          href="/dashboard"
          label="My Campaigns"
          active={isCampaigns}
          onClick={onNavClick}
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
          onClick={onNavClick}
          icon={
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        />

        {/* OUTREACH */}
        <p className="px-5 pt-6 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Outreach
        </p>
        <NavItem
          href="#"
          label="Sequences"
          active={false}
          soon
          icon={
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        {/* CONTACTS */}
        <p className="px-5 pt-6 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Contacts
        </p>
        <NavItem
          href="#"
          label="Key Contacts"
          active={false}
          soon
          icon={
            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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
            <span className="text-gray-400 truncate">credits</span>
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
        {/* AI Agent teaser */}
        <div className="mx-3 mb-3 p-3 rounded-xl border border-dashed border-gray-200 cursor-not-allowed">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">AI Agent Mode</p>
            <span className="text-[8px] font-semibold tracking-wider uppercase bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
              Soon
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
            Automated outreach on autopilot
          </p>
        </div>

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
    </>
  )
}

export default function Sidebar({ credits, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isNewCampaign = pathname === "/dashboard/campaigns/new"
  const isCampaigns =
    pathname === "/dashboard" ||
    (pathname.startsWith("/dashboard/campaigns/") && !isNewCampaign)

  return (
    <>
      {/* ── Mobile header bar (hidden on md+) ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 h-14 px-4 flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-2">
          <LogoBadge />
          <span className="text-[9px] font-semibold tracking-wider uppercase text-[#4B6BF5] border border-[#4B6BF5]/30 px-1.5 py-0.5 rounded-md opacity-60">
            BETA
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Open navigation"
        >
          <svg className="size-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-xl flex flex-col">
            {/* Drawer header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <LogoBadge />
                <span className="text-[9px] font-semibold tracking-wider uppercase text-[#4B6BF5] border border-[#4B6BF5]/30 px-1.5 py-0.5 rounded-md opacity-60">
                  BETA
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Close navigation"
              >
                <svg className="size-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <NavContent
              credits={credits}
              userEmail={userEmail}
              isCampaigns={isCampaigns}
              isNewCampaign={isNewCampaign}
              onNavClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar (hidden below md) ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex-col z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 shrink-0">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <LogoBadge />
            <span className="text-[9px] font-semibold tracking-wider uppercase text-[#4B6BF5] border border-[#4B6BF5]/30 px-1.5 py-0.5 rounded-md opacity-60">
              BETA
            </span>
          </Link>
        </div>

        <NavContent
          credits={credits}
          userEmail={userEmail}
          isCampaigns={isCampaigns}
          isNewCampaign={isNewCampaign}
        />
      </aside>
    </>
  )
}
