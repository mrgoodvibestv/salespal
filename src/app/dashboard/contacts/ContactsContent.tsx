"use client"

import { useState } from "react"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"

interface Contact {
  id: string
  full_name: string
  job_title: string
  linkedin_url: string | null
  email: string | null
  phone: string | null
  tier: "decision_maker" | "influencer" | "noise"
  status: string
  campaign_id: string
  campaign_name: string
  angle_selected: string
}

function InitialsAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  const colors = [
    "bg-purple-100 text-purple-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  const sizeClass = size === "sm" ? "size-8 text-xs" : "size-10 text-sm"
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  )
}

const TIER_CONFIG = {
  decision_maker: { label: "Decision Maker", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  influencer:     { label: "Influencer",     className: "bg-violet-50 text-violet-700 border border-violet-200" },
  noise:          { label: "Noise",          className: "bg-gray-50 text-gray-400 border border-gray-100" },
}

const STATUS_STYLES: Record<string, string> = {
  new:       "bg-gray-100 text-gray-600 border-gray-200",
  contacted: "bg-blue-50 text-blue-700 border-blue-200",
  replied:   "bg-amber-50 text-amber-700 border-amber-200",
  converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

function StatusDropdown({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setSaving(true)
    setStatus(next)
    try {
      await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
    } catch {
      // optimistic — ignore errors
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className={`text-[11px] font-semibold pl-2.5 pr-7 py-1 rounded-full border appearance-none cursor-pointer focus:outline-none transition-colors duration-150 disabled:opacity-60 ${STATUS_STYLES[status] ?? STATUS_STYLES.new}`}
      >
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="replied">Replied</option>
        <option value="converted">Converted</option>
      </select>
      <svg
        className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 pointer-events-none opacity-50"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export default function ContactsContent({
  contacts,
  credits,
  userEmail,
}: {
  contacts: Contact[]
  credits: number
  userEmail: string
}) {
  const [campaignFilter, setCampaignFilter] = useState("all")

  // Unique campaigns from the contacts list
  const campaignOptions = Array.from(
    new Map(contacts.map((c) => [c.campaign_id, { id: c.campaign_id, name: c.campaign_name }])).values()
  )

  const filtered = campaignFilter === "all"
    ? contacts
    : contacts.filter((c) => c.campaign_id === campaignFilter)

  // Group filtered contacts by campaign
  const groups: { campaign_id: string; campaign_name: string; angle_selected: string; contacts: Contact[] }[] = []
  filtered.forEach((c) => {
    const existing = groups.find((g) => g.campaign_id === c.campaign_id)
    if (existing) {
      existing.contacts.push(c)
    } else {
      groups.push({ campaign_id: c.campaign_id, campaign_name: c.campaign_name, angle_selected: c.angle_selected, contacts: [c] })
    }
  })

  const totalContacts = contacts.length
  const campaignCount = new Set(contacts.map((c) => c.campaign_id)).size
  const withEmail     = contacts.filter((c) => c.email).length
  const withPhone     = contacts.filter((c) => c.phone).length

  return (
    <div className="flex min-h-screen bg-white overflow-x-hidden">
      <Sidebar credits={credits} userEmail={userEmail} />

      <main className="flex-1 min-w-0 ml-0 md:ml-64 px-4 sm:px-6 md:px-8 pt-[88px] md:pt-8 pb-8">
        <div className="max-w-6xl w-full">

          {/* Page header */}
          <div className="mb-8">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-1">
              Contacts
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Key Contacts</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              All unlocked decision makers across your campaigns
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-stretch gap-2 mb-6 overflow-x-auto pb-0.5">
            <div className="flex flex-col items-start pl-3 pr-5 py-3 rounded-xl border-l-2 border-gray-300 bg-gray-50 shrink-0 min-w-[80px] lg:flex-1">
              <span className="text-3xl font-bold text-gray-900 tabular-nums leading-none tracking-tight">{totalContacts}</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.1em] mt-1.5 whitespace-nowrap">Contacts</span>
            </div>
            <div className="flex flex-col items-start pl-3 pr-5 py-3 rounded-xl border-l-2 border-violet-400 bg-violet-50/60 shrink-0 min-w-[80px] lg:flex-1">
              <span className="text-3xl font-bold text-violet-700 tabular-nums leading-none tracking-tight">{campaignCount}</span>
              <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-[0.1em] mt-1.5 whitespace-nowrap">Campaigns</span>
            </div>
            <div className="flex flex-col items-start pl-3 pr-5 py-3 rounded-xl border-l-2 border-blue-400 bg-blue-50/60 shrink-0 min-w-[80px] lg:flex-1">
              <span className="text-3xl font-bold text-blue-700 tabular-nums leading-none tracking-tight">{withEmail}</span>
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-[0.1em] mt-1.5 whitespace-nowrap">With Email</span>
            </div>
            <div className="flex flex-col items-start pl-3 pr-5 py-3 rounded-xl border-l-2 border-emerald-400 bg-emerald-50/60 shrink-0 min-w-[80px] lg:flex-1">
              <span className="text-3xl font-bold text-emerald-700 tabular-nums leading-none tracking-tight">{withPhone}</span>
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-[0.1em] mt-1.5 whitespace-nowrap">With Phone</span>
            </div>
          </div>

          {/* Empty state */}
          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
              <div
                className="size-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
              >
                <svg className="size-8 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No unlocked contacts yet</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                When you unlock a lead inside a campaign, their verified email, phone, and LinkedIn appear here — ready to outreach.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
              >
                Go to campaigns
              </Link>
              <p className="text-xs text-gray-300 mt-4">2 credits per contact unlock</p>
            </div>
          )}

          {contacts.length > 0 && (
            <div className="space-y-8">

              {/* Filter bar — full width on mobile */}
              {campaignOptions.length > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs text-gray-400">Campaign</span>
                  <div className="relative w-full sm:w-auto">
                    <select
                      value={campaignFilter}
                      onChange={(e) => setCampaignFilter(e.target.value)}
                      className="w-full sm:w-auto text-sm font-medium pl-3 pr-10 py-1.5 rounded-lg border border-gray-200 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4B6BF5]/20 text-gray-700"
                    >
                      <option value="all">All campaigns</option>
                      {campaignOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Grouped contact sections */}
              {groups.map((group) => (
                <div key={group.campaign_id}>
                  {/* Section header — truncate on mobile, angle pill hidden on mobile */}
                  <div className="flex items-center gap-2 mb-3 min-w-0">
                    <Link
                      href={`/dashboard/campaigns/${group.campaign_id}`}
                      className="font-semibold text-black hover:text-[#4B6BF5] transition-colors duration-150 text-sm truncate max-w-[200px] sm:max-w-none"
                    >
                      {group.campaign_name}
                    </Link>
                    {group.angle_selected && (
                      <span className="hidden sm:inline-flex shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-[#EEF1FE] text-[#4B6BF5]">
                        {group.angle_selected}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto shrink-0">
                      {group.contacts.length} contact{group.contacts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Contact list */}
                  <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-sm">
                    {group.contacts.map((contact) => {
                      const tier = TIER_CONFIG[contact.tier] ?? TIER_CONFIG.influencer
                      return (
                        <div key={contact.id} className="flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-[#EEF1FE]/20 transition-colors duration-150">
                          {/* Avatar */}
                          <InitialsAvatar name={contact.full_name} size="sm" />

                          {/* Name + title + mobile email */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm truncate">{contact.full_name}</span>
                              <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${tier.className}`}>
                                {tier.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{contact.job_title}</p>
                            {/* Email shown inline on mobile (hidden on sm+) */}
                            {contact.email && (
                              <p className="text-xs text-gray-400 truncate mt-0.5 sm:hidden">{contact.email}</p>
                            )}
                          </div>

                          {/* Contact links — hidden on mobile */}
                          <div className="hidden sm:flex items-center gap-3 shrink-0">
                            {contact.email ? (
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-xs text-gray-600 hover:text-black truncate max-w-[200px]"
                              >
                                {contact.email}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                            {contact.linkedin_url && (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0A66C2] hover:opacity-70 transition-opacity shrink-0"
                              >
                                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                              </a>
                            )}
                          </div>

                          {/* Status dropdown */}
                          <div className="shrink-0">
                            <StatusDropdown leadId={contact.id} currentStatus={contact.status} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
