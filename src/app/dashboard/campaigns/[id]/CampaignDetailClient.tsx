"use client"

import { useState } from "react"
import Link from "next/link"

// ── Types ──────────────────────────────────────────────────────────────────
interface Company {
  id: string
  name: string
  domain: string
}

interface Lead {
  id: string
  prospect_id: string
  full_name: string
  job_title: string
  linkedin_url: string | null
  email: string | null
  phone: string | null
  tier: "decision_maker" | "influencer" | "noise"
  unlocked: boolean
  credits_charged: number
  company_name?: string
  companies?: Company | null
}

interface Campaign {
  id: string
  name: string
  status: string
  angle_selected: string | null
  icp_json: Record<string, unknown> | null
  stats_result: { companies: number; estimated_contacts: number } | null
  created_at: string
}

// ── Tier config ────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  decision_maker: {
    label: "Decision Maker",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  influencer: {
    label: "Influencer",
    className: "bg-blue-50 text-blue-700 border border-blue-100",
  },
  noise: {
    label: "Noise",
    className: "bg-gray-100 text-gray-500",
  },
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active:            { label: "Active",          className: "bg-blue-50 text-blue-600 border border-blue-100" },
    fetching_companies:{ label: "Fetching leads…", className: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
    preview_ready:     { label: "Preview ready",   className: "bg-green-50 text-green-700 border border-green-200" },
    draft:             { label: "Draft",            className: "bg-gray-100 text-gray-500" },
    archived:          { label: "Archived",         className: "bg-gray-100 text-gray-500" },
  }
  const config = map[status] ?? { label: status, className: "bg-gray-100 text-gray-500" }
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// ── Blurred contact cell ───────────────────────────────────────────────────
function LockedCell() {
  return (
    <div className="flex items-center gap-1.5">
      <svg className="size-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span className="text-gray-300 text-xs select-none tracking-widest blur-[3px]">
        ••••••••••
      </span>
    </div>
  )
}

// ── Main client component ──────────────────────────────────────────────────
export default function CampaignDetailClient({
  campaign,
  initialLeads,
  initialCredits,
  userEmail,
}: {
  campaign: Campaign
  initialLeads: Lead[]
  initialCredits: number
  userEmail: string
}) {
  const [leads, setLeads]               = useState<Lead[]>(initialLeads)
  const [credits, setCredits]           = useState(initialCredits)
  const [status, setStatus]             = useState(campaign.status)
  const [fetching, setFetching]         = useState(false)
  const [fetchError, setFetchError]     = useState("")
  const [unlockingId, setUnlockingId]   = useState<string | null>(null)
  const [unlockErrors, setUnlockErrors] = useState<Record<string, string>>({})
  const [companiesFetched, setCompaniesFetched] = useState<number | null>(null)
  const [contactsFound, setContactsFound]       = useState<number | null>(null)

  const hasLeads = leads.length > 0
  const isFetching = fetching || status === "fetching_companies"

  // ── Find Leads ────────────────────────────────────────────────────────
  async function handleFindLeads() {
    setFetching(true)
    setFetchError("")
    setStatus("fetching_companies")

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/leads`, {
        method: "POST",
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setFetchError(`Not enough credits. You need at least 5 credits to run a search. Current balance: ${data.balance ?? credits}.`)
        } else {
          setFetchError(data.error ?? "Failed to fetch leads")
        }
        setStatus("active")
        return
      }

      const fetchedLeads = data.leads ?? []
      setLeads(fetchedLeads)
      setCompaniesFetched(data.companies_fetched ?? null)
      setContactsFound(fetchedLeads.length)
      setStatus("preview_ready")
      // Re-fetch authoritative credit balance from server
      fetch("/api/user/credits")
        .then((r) => r.json())
        .then((d) => { if (typeof d.credits === "number") setCredits(d.credits) })
        .catch(() => {/* optimistic fallback already applied */})
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Something went wrong")
      setStatus("active")
    } finally {
      setFetching(false)
    }
  }

  // ── Unlock contact ────────────────────────────────────────────────────
  async function handleUnlock(lead: Lead) {
    if (unlockingId) return
    setUnlockingId(lead.id)
    setUnlockErrors((e) => ({ ...e, [lead.id]: "" }))

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, prospect_id: lead.prospect_id }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setUnlockErrors((e) => ({ ...e, [lead.id]: "Not enough credits (2 required)" }))
        } else {
          setUnlockErrors((e) => ({ ...e, [lead.id]: data.error ?? "Unlock failed" }))
        }
        return
      }

      // Update lead in state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? { ...l, email: data.email, phone: data.phone, unlocked: true }
            : l
        )
      )
      if (!data.already_unlocked) {
        setCredits((c) => Math.max(0, c - 2))
      }
    } catch (err) {
      setUnlockErrors((e) => ({
        ...e,
        [lead.id]: err instanceof Error ? err.message : "Unlock failed",
      }))
    } finally {
      setUnlockingId(null)
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────
  const dmCount = leads.filter((l) => l.tier === "decision_maker").length
  const infCount = leads.filter((l) => l.tier === "influencer").length
  const unlockedCount = leads.filter((l) => l.unlocked).length

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight">
              <span className="text-black">Sales</span>
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}>
                Pal
              </span>
            </Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm text-gray-600 max-w-xs truncate">{campaign.name}</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
              <span className="size-2 rounded-full inline-block" style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }} />
              <span className="text-sm font-semibold text-black tabular-nums">{credits.toLocaleString()}</span>
              <span className="text-xs text-gray-500">credits</span>
            </div>
            <span className="text-sm text-gray-400 hidden sm:block">{userEmail}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-10 space-y-8">

        {/* Campaign header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-black">{campaign.name}</h1>
              <StatusBadge status={status} />
            </div>
            {campaign.angle_selected && (
              <p className="text-sm text-gray-500">
                Angle: <span className="font-medium text-black">{campaign.angle_selected}</span>
              </p>
            )}
            {(() => {
              const tagline = (campaign.icp_json?.angle_data as Record<string, unknown> | undefined)?.tagline as string | undefined
              return tagline ? (
                <p className="text-xs text-gray-400 italic">&ldquo;{tagline}&rdquo;</p>
              ) : null
            })()}
            {(contactsFound !== null || campaign.stats_result) && (
              <p className="text-xs text-gray-400">
                {contactsFound !== null
                  ? `~${contactsFound} contacts across ${companiesFetched ?? "?"} companies`
                  : `Market: ~${campaign.stats_result!.estimated_contacts?.toLocaleString()} contacts across ${campaign.stats_result!.companies?.toLocaleString()} companies`
                }
              </p>
            )}
          </div>

          {/* Find Leads button */}
          {!hasLeads && !isFetching && (
            <button
              onClick={handleFindLeads}
              disabled={credits < 5}
              className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
              title={credits < 5 ? "You need at least 5 credits to run a search" : undefined}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Leads
            </button>
          )}
          {hasLeads && (
            <button
              onClick={handleFindLeads}
              disabled={isFetching || credits < 5}
              className="shrink-0 px-5 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Refresh leads
            </button>
          )}
        </div>

        {/* ICP details */}
        {(() => {
          const ad = campaign.icp_json?.angle_data as {
            target_companies?: string
            target_titles?: string[]
            pitch_summary?: string
            why_now?: string
          } | undefined
          if (!ad) return null
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 text-sm">
              {ad.target_companies && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Target Companies</p>
                  <p className="text-gray-700">{ad.target_companies}</p>
                </div>
              )}
              {ad.target_titles && ad.target_titles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Target Titles</p>
                  <p className="text-gray-700">{ad.target_titles.join(" · ")}</p>
                </div>
              )}
              {ad.pitch_summary && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pitch</p>
                  <p className="text-gray-700">{ad.pitch_summary}</p>
                </div>
              )}
            </div>
          )
        })()}

        {fetchError && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <svg className="size-4 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        )}

        {/* Loading state */}
        {isFetching && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="relative size-14">
              <div className="absolute inset-0 rounded-full animate-spin" style={{ background: "conic-gradient(from 0deg, #4B6BF5, #7B4BF5, transparent)", mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black 0)", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black 0)" }} />
              <div className="absolute inset-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }} />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-black">Finding your leads…</p>
              <p className="text-sm text-gray-500">Scoring contacts and filtering decision makers</p>
            </div>
            <p className="text-xs text-gray-400">This usually takes 20–40 seconds</p>
          </div>
        )}

        {/* Empty state */}
        {!isFetching && !hasLeads && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="size-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}>
              <svg className="size-7 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-black">No leads yet</h2>
              <p className="text-sm text-gray-500 max-w-xs">
                Click <strong>Find Leads</strong> to fetch qualified contacts from your ICP. Costs 1 credit per company.
              </p>
            </div>
            {credits < 5 && (
              <p className="text-xs text-red-500">You need at least 5 credits to run a search.</p>
            )}
          </div>
        )}

        {/* Lead list */}
        {!isFetching && hasLeads && (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex items-center gap-6 px-5 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <Stat label="Decision Makers" value={dmCount} color="text-green-600" />
              <div className="h-5 w-px bg-gray-200" />
              <Stat label="Influencers" value={infCount} color="text-blue-600" />
              <div className="h-5 w-px bg-gray-200" />
              <Stat label="Unlocked" value={unlockedCount} color="text-purple-600" />
              <div className="h-5 w-px bg-gray-200" />
              <Stat label="Total" value={leads.length} color="text-black" />
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tier</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">LinkedIn</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unlock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.map((lead) => {
                      const companyName = lead.companies?.name ?? lead.company_name ?? ""
                      const tier = TIER_CONFIG[lead.tier] ?? TIER_CONFIG.influencer
                      const isUnlocking = unlockingId === lead.id
                      const unlockErr = unlockErrors[lead.id]

                      return (
                        <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-black whitespace-nowrap">
                            {lead.full_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {lead.job_title}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {companyName}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tier.className}`}>
                              {tier.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {lead.linkedin_url ? (
                              <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#0A66C2] hover:opacity-80 transition-opacity"
                                title={lead.full_name}
                              >
                                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lead.unlocked && lead.email ? (
                              <a href={`mailto:${lead.email}`} className="text-xs text-gray-700 hover:text-black transition-colors">
                                {lead.email}
                              </a>
                            ) : (
                              <LockedCell />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lead.unlocked && lead.phone ? (
                              <span className="text-xs text-gray-700">{lead.phone}</span>
                            ) : lead.unlocked ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : (
                              <LockedCell />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {lead.unlocked ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                <svg className="size-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Unlocked
                              </span>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => handleUnlock(lead)}
                                  disabled={!!unlockingId || credits < 2}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                  style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                                >
                                  {isUnlocking ? (
                                    <>
                                      <svg className="size-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                      Unlocking…
                                    </>
                                  ) : (
                                    <>
                                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                      </svg>
                                      Unlock · 2 credits
                                    </>
                                  )}
                                </button>
                                {unlockErr && (
                                  <span className="text-xs text-red-500">{unlockErr}</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              {leads.length} contacts shown · Decision Makers and Influencers only · Noise filtered out
            </p>

            {/* Run Full Campaign banner */}
            {status === "preview_ready" && campaign.stats_result && (
              <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-[#4B6BF5]/20 bg-gradient-to-r from-[#EEF1FE] to-[#F0EBFE]">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-black">
                    You&apos;re previewing {leads.length} of ~{campaign.stats_result.estimated_contacts?.toLocaleString()} available contacts.
                  </p>
                  <p className="text-xs text-gray-500">
                    Run full campaign to surface all decision makers across {campaign.stats_result.companies?.toLocaleString()} matching companies.
                    Estimated cost: <span className="font-medium text-black">{campaign.stats_result.companies} credits</span>.
                  </p>
                </div>
                <button
                  disabled
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white opacity-60 cursor-not-allowed whitespace-nowrap"
                  style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                  title="Coming soon"
                >
                  Run Full Campaign
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
