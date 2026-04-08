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
  decision_maker: { label: "Decision Maker", className: "bg-green-50 text-green-700 border border-green-200" },
  influencer:     { label: "Influencer",     className: "bg-blue-50 text-blue-700 border border-blue-100" },
  noise:          { label: "Noise",          className: "bg-gray-100 text-gray-400" },
}

const STATUS_OPTIONS = [
  { value: "new",       label: "New",       className: "bg-gray-100 text-gray-500" },
  { value: "contacted", label: "Contacted", className: "bg-blue-50 text-blue-600" },
  { value: "replied",   label: "Replied",   className: "bg-yellow-50 text-yellow-700" },
  { value: "converted", label: "Converted", className: "bg-green-50 text-green-700" },
]

function StatusDropdown({
  leadId,
  currentStatus,
}: {
  leadId: string
  currentStatus: string
}) {
  const [status, setStatus]   = useState(currentStatus)
  const [saving, setSaving]   = useState(false)

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
      // Best-effort — status already updated optimistically
    } finally {
      setSaving(false)
    }
  }

  const cfg = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0]

  return (
    <div className="relative">
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4B6BF5]/20 disabled:opacity-60 ${cfg.className}`}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
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
  const totalContacts   = contacts.length
  const campaignIds     = new Set(contacts.map((c) => c.campaign_id))
  const withEmail       = contacts.filter((c) => c.email).length
  const withPhone       = contacts.filter((c) => c.phone).length

  return (
    <div className="flex min-h-screen bg-white overflow-x-hidden">
      <Sidebar credits={credits} userEmail={userEmail} />

      <main className="flex-1 min-w-0 ml-0 md:ml-64 px-4 sm:px-6 md:px-8 pt-[88px] md:pt-8 pb-8">
        <div className="max-w-6xl w-full">

          {/* Page header */}
          <div className="mb-8">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1">
              Contacts
            </p>
            <h1 className="text-2xl font-bold text-black">Key Contacts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              All unlocked decision makers across your campaigns
            </p>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-black tabular-nums">{totalContacts}</span>
              <span className="text-xs text-gray-500">Total contacts</span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-gray-200 self-center" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-purple-600 tabular-nums">{campaignIds.size}</span>
              <span className="text-xs text-gray-500">Campaigns</span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-gray-200 self-center" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-600 tabular-nums">{withEmail}</span>
              <span className="text-xs text-gray-500">With email</span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-gray-200 self-center" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-green-600 tabular-nums">{withPhone}</span>
              <span className="text-xs text-gray-500">With phone</span>
            </div>
          </div>

          {/* Empty state */}
          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <div
                className="size-14 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
              >
                <svg className="size-7 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-black">No unlocked contacts yet</h2>
                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                  Unlock contacts from your campaign lead lists to see them here.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
              >
                Go to Campaigns
              </Link>
            </div>
          )}

          {/* Contact cards grid */}
          {contacts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {contacts.map((contact) => {
                const tier = TIER_CONFIG[contact.tier] ?? TIER_CONFIG.influencer

                return (
                  <div
                    key={contact.id}
                    className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    {/* Name + tier */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <InitialsAvatar name={contact.full_name} />
                        <div className="min-w-0">
                          <p className="font-semibold text-black truncate">{contact.full_name}</p>
                          <p className="text-sm text-gray-500 truncate mt-0.5">{contact.job_title}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${tier.className}`}>
                        {tier.label}
                      </span>
                    </div>

                    {/* Campaign pill */}
                    <div>
                      <Link
                        href={`/dashboard/campaigns/${contact.campaign_id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEF1FE] text-[#4B6BF5] hover:bg-[#E0E5FD] transition-colors"
                      >
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        {contact.campaign_name}
                      </Link>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1.5 pt-1">
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <svg className="size-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-xs text-gray-700 hover:text-black truncate"
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <svg className="size-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-xs text-gray-700">{contact.phone}</span>
                        </div>
                      )}
                      {contact.linkedin_url && (
                        <div className="flex items-center gap-2">
                          <svg className="size-3.5 text-[#0A66C2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#0A66C2] hover:opacity-80 truncate"
                          >
                            LinkedIn profile
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Status dropdown */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">Status</span>
                      <StatusDropdown leadId={contact.id} currentStatus={contact.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
