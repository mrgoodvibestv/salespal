"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import SequencesTab from "./SequencesTab"

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
  geo_location?: string
}

interface EmailSequence {
  day: number
  channel?: "email" | "linkedin"
  type?: string
  subject: string | null
  body: string
  tone: "intro" | "followup" | "breakup"
}

interface Campaign {
  id: string
  name: string
  status: string
  angle_selected: string | null
  icp_json: Record<string, unknown> | null
  stats_result: { companies: number; estimated_contacts: number } | null
  sequence_json: { emails: EmailSequence[] } | null
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-md ${className ?? ""}`} />
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

// ── Constants ──────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  decision_maker: { label: "Decision Maker", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  influencer:     { label: "Influencer",     className: "bg-violet-50 text-violet-700 border border-violet-200" },
  noise:          { label: "Noise",          className: "bg-gray-50 text-gray-400 border border-gray-100" },
}

const COMPANY_SIZE_OPTIONS = [
  { label: "SMB (1–200)",        value: "smb",        sizes: ["1-10", "11-50", "51-200"] },
  { label: "Mid-market (201–1k)",value: "mid",        sizes: ["201-500", "501-1000"] },
  { label: "Enterprise (1k+)",   value: "enterprise", sizes: ["1001-5000", "5001-10000", "10001+"] },
]

const SENIORITY_OPTIONS = [
  { label: "Director",  value: "director",       level: "director" },
  { label: "VP",        value: "vp",             level: "vice president" },
  { label: "C-Suite",   value: "csuite",         level: "c-suite" },
]

// Dept keyword matching against job_title text
const DEPT_KEYWORDS: Record<string, string[]> = {
  hr:         ["hr", "human resources", "people", "talent", "recrui", "workforce", "culture"],
  operations: ["operat", "coo", "ops", "logistics", "supply chain"],
  sales:      ["sales", "revenue", "business development", "account exec", "account manager", "bdr", "sdr"],
  marketing:  ["market", "growth", "brand", "communicat", "content", "demand gen"],
  finance:    ["financ", "cfo", "controller", "accounti", "treasury", "budget"],
}

function matchesDept(title: string, dept: string): boolean {
  const t = title.toLowerCase()
  return (DEPT_KEYWORDS[dept] ?? []).some((k) => t.includes(k))
}

// ── Sub-components ─────────────────────────────────────────────────────────
const STATUS_BADGE_CONFIG = {
  preview_ready:      { label: "Preview ready",   className: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  fetching_companies: { label: "Fetching leads…", className: "bg-amber-50 text-amber-700 border border-amber-200",     dot: "bg-amber-400 animate-pulse" },
  active:             { label: "Active",           className: "bg-gray-100 text-gray-600 border border-gray-200",       dot: null },
  draft:              { label: "Draft",            className: "bg-gray-50 text-gray-400 border border-gray-200",        dot: null },
  archived:           { label: "Archived",         className: "bg-gray-50 text-gray-400 border border-gray-200",        dot: null },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE_CONFIG[status as keyof typeof STATUS_BADGE_CONFIG] ?? STATUS_BADGE_CONFIG.active
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap ${cfg.className}`}>
      {cfg.dot && <span className={`size-1.5 rounded-full shrink-0 ${cfg.dot}`} />}
      {cfg.label}
    </span>
  )
}

function LockedCell() {
  return (
    <div className="flex items-center gap-1.5">
      <svg className="size-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span className="text-gray-300 text-xs select-none tracking-widest blur-[3px]">••••••••••</span>
    </div>
  )
}

function Pill({
  active, onClick, children, activeClassName,
}: { active: boolean; onClick: () => void; children: React.ReactNode; activeClassName?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
        active
          ? activeClassName ?? "bg-[#4B6BF5] text-white border-transparent"
          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
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
  const [contactsFound, setContactsFound] = useState<number | null>(null)
  const [activeTab, setActiveTab]       = useState<"leads" | "sequences">("leads")

  // ── Filter state ──────────────────────────────────────────────────────
  const [tierFilter, setTierFilter]   = useState<"all" | "decision_maker" | "influencer">("all")
  const [deptFilter, setDeptFilter]   = useState("all")
  const [showNoise, setShowNoise]     = useState(false)

  // ── Refine panel state ────────────────────────────────────────────────
  const [refineOpen, setRefineOpen]   = useState(false)
  const [selectedSizes, setSelectedSizes]       = useState<string[]>([])
  const [selectedSeniorities, setSelectedSeniorities] = useState<string[]>([])
  const [cityFocusInput, setCityFocusInput]     = useState("")
  const [confirmRefetch, setConfirmRefetch]     = useState(false)

  // ── Re-score state ────────────────────────────────────────────────────
  const [rescoreOpen, setRescoreOpen]   = useState(false)
  const [rescoreContext, setRescoreContext] = useState("")
  const [rescoring, setRescoring]       = useState(false)
  const [rescoreError, setRescoreError] = useState("")

  const hasLeads  = leads.length > 0
  const isFetching = fetching || status === "fetching_companies"

  // ── Filtered leads (client-side, no API) ─────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (!showNoise && lead.tier === "noise") return false
      if (tierFilter !== "all" && lead.tier !== tierFilter) return false
      if (deptFilter !== "all" && !matchesDept(lead.job_title, deptFilter)) return false
      return true
    })
  }, [leads, tierFilter, deptFilter, showNoise])

  // ── Find / re-fetch leads ─────────────────────────────────────────────
  async function handleFindLeads(overrides?: {
    company_size?: string[]
    job_level?: string[]
    city_focus?: string
  }) {
    setFetching(true)
    setFetchError("")
    setStatus("fetching_companies")
    setConfirmRefetch(false)

    try {
      const body = overrides ? JSON.stringify({ overrides }) : undefined
      const res = await fetch(`/api/campaigns/${campaign.id}/leads`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setFetchError(`Not enough credits. You need at least 5 credits. Current balance: ${data.balance ?? credits}.`)
        } else {
          setFetchError(data.error ?? "Failed to fetch leads")
        }
        setStatus("active")
        return
      }

      const fetchedLeads = data.leads ?? []
      setLeads(fetchedLeads)
      setContactsFound(fetchedLeads.length)
      setStatus("preview_ready")
      fetch("/api/user/credits")
        .then((r) => r.json())
        .then((d) => { if (typeof d.credits === "number") setCredits(d.credits) })
        .catch(() => {})
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Something went wrong")
      setStatus("active")
    } finally {
      setFetching(false)
    }
  }

  // ── Refine re-fetch ───────────────────────────────────────────────────
  function handleRefineRefetch() {
    const companySizeValues = selectedSizes.flatMap(
      (v) => COMPANY_SIZE_OPTIONS.find((o) => o.value === v)?.sizes ?? []
    )
    const jobLevelValues = selectedSeniorities
      .map((v) => SENIORITY_OPTIONS.find((o) => o.value === v)?.level ?? "")
      .filter(Boolean)

    handleFindLeads({
      ...(companySizeValues.length && { company_size: companySizeValues }),
      ...(jobLevelValues.length    && { job_level:    jobLevelValues }),
      ...(cityFocusInput.trim()    && { city_focus:   cityFocusInput.trim() }),
    })
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
        setUnlockErrors((e) => ({
          ...e,
          [lead.id]: res.status === 402 ? "Not enough credits (2 required)" : (data.error ?? "Unlock failed"),
        }))
        return
      }

      setLeads((prev) =>
        prev.map((l) => l.id === lead.id ? { ...l, email: data.email, phone: data.phone, unlocked: true } : l)
      )
      if (!data.already_unlocked) setCredits((c) => Math.max(0, c - 2))
    } catch (err) {
      setUnlockErrors((e) => ({ ...e, [lead.id]: err instanceof Error ? err.message : "Unlock failed" }))
    } finally {
      setUnlockingId(null)
    }
  }

  // ── Re-score ──────────────────────────────────────────────────────────
  async function handleRescore() {
    setRescoring(true)
    setRescoreError("")
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context_override: rescoreContext }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRescoreError(data.error ?? "Re-scoring failed")
        return
      }
      // Merge updated tiers into lead state
      const tierMap = new Map<string, Lead["tier"]>(
        (data.leads ?? []).map((l: { id: string; tier: Lead["tier"] }) => [l.id, l.tier])
      )
      setLeads((prev) => prev.map((l) => {
        const newTier = tierMap.get(l.id)
        return newTier ? { ...l, tier: newTier } : l
      }))
      setRescoreOpen(false)
      setRescoreContext("")
    } catch (err) {
      setRescoreError(err instanceof Error ? err.message : "Re-scoring failed")
    } finally {
      setRescoring(false)
    }
  }

  // ── Stats (from filtered leads) ───────────────────────────────────────
  const dmCount       = filteredLeads.filter((l) => l.tier === "decision_maker").length
  const infCount      = filteredLeads.filter((l) => l.tier === "influencer").length
  const noiseCount    = filteredLeads.filter((l) => l.tier === "noise").length
  const unlockedCount = filteredLeads.filter((l) => l.unlocked).length

  // Credit cost estimate for refine modal
  const geoScope = (campaign.icp_json?.geo as Record<string, unknown> | undefined)?.geo_scope as string | undefined
  const estimatedCredits = geoScope === "local" ? 25 : 15

  return (
    <div className="flex min-h-screen bg-white overflow-x-hidden">
      <Sidebar credits={credits} userEmail={userEmail} />

      <main className="flex-1 min-w-0 ml-0 md:ml-64 px-4 sm:px-6 md:px-8 pt-[88px] md:pt-8 pb-8">
        <div className="max-w-7xl w-full space-y-6 sm:space-y-8">

        {/* Campaign header */}
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
              Campaign
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 truncate max-w-[280px] sm:max-w-md">{campaign.name}</h1>
              <StatusBadge status={status} />
            </div>
            {campaign.angle_selected && (
              <p className="text-sm text-gray-500">
                Angle: <span className="font-medium text-black">{campaign.angle_selected}</span>
              </p>
            )}
            {(() => {
              const tagline = (campaign.icp_json?.angle_data as Record<string, unknown> | undefined)?.tagline as string | undefined
              return tagline ? <p className="text-xs text-gray-400 italic">&ldquo;{tagline}&rdquo;</p> : null
            })()}
            {(contactsFound !== null || campaign.stats_result) && (
              <p className="text-xs text-gray-400">
                {contactsFound !== null
                  ? `~${contactsFound} contacts fetched`
                  : `Market: ~${campaign.stats_result!.estimated_contacts?.toLocaleString()} contacts across ${campaign.stats_result!.companies?.toLocaleString()} companies`
                }
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
            {!hasLeads && !isFetching && (
              <button
                onClick={() => handleFindLeads()}
                disabled={credits < 5}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                title={credits < 5 ? "You need at least 5 credits" : undefined}
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Leads
              </button>
            )}
            {hasLeads && (
              <button
                onClick={() => handleFindLeads()}
                disabled={isFetching || credits < 5}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={credits < 5 ? "You need at least 5 credits" : undefined}
              >
                Refresh leads
              </button>
            )}
          </div>
        </div>

        {/* ICP details */}
        {(() => {
          const ad = campaign.icp_json?.angle_data as {
            target_companies?: string; target_titles?: string[]; pitch_summary?: string
          } | undefined
          if (!ad) return null
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm text-sm">
              {ad.target_companies && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Target Companies</p>
                  <p className="text-gray-700">{ad.target_companies}</p>
                </div>
              )}
              {ad.target_titles?.length && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Target Titles</p>
                  <p className="text-gray-700">{ad.target_titles.join(" · ")}</p>
                </div>
              )}
              {ad.pitch_summary && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Pitch</p>
                  <p className="text-gray-700">{ad.pitch_summary}</p>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 border-b border-gray-200 pb-0">
          {(["leads", "sequences"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold transition-all relative capitalize ${
                activeTab === tab
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Sequences tab content ── */}
        {activeTab === "sequences" && (
          <SequencesTab
            campaignId={campaign.id}
            initialSequence={campaign.sequence_json?.emails ?? null}
          />
        )}

        {/* ── Leads tab content ── */}
        {activeTab === "leads" && <>

        {fetchError && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <svg className="size-4 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isFetching && (
          <div className="space-y-4">
            {/* Skeleton stats bar */}
            <div className="flex items-center gap-6 px-1 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>

            {/* Desktop table skeleton */}
            <div className="hidden sm:block rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-6">
                {[80, 120, 100, 80, 70].map((w, i) => (
                  <Skeleton key={i} className={`h-2.5 w-[${w}px]`} />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 px-4 py-3 border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}
                >
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-24 rounded-full ml-auto" />
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              ))}
            </div>

            {/* Mobile card skeleton */}
            <div className="sm:hidden space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="size-8 rounded-full shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex justify-end pt-1">
                    <Skeleton className="h-8 w-20 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isFetching && !hasLeads && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
            <div
              className="size-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
            >
              <svg className="size-8 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Ready to find your buyers</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              SalesPal will surface VP-level and Director-level decision makers at companies that match your ICP. Costs 10 credits per fetch.
            </p>
            <button
              onClick={() => handleFindLeads()}
              disabled={credits < 5}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Find decision makers
            </button>
            {credits < 5 && (
              <p className="text-xs text-red-400 mt-3">You need at least 5 credits to run a search</p>
            )}
            {credits >= 5 && (
              <p className="text-xs text-gray-300 mt-4">{credits} credits available · 10 credits per fetch</p>
            )}
          </div>
        )}

        {/* Lead list */}
        {!isFetching && hasLeads && (
          <div className="space-y-4">

            {/* ── Filter controls ── */}
            <div className="space-y-2.5 pb-2">
              {/* Tier pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 w-20 shrink-0">Tier</span>
                <Pill active={tierFilter === "all"} onClick={() => setTierFilter("all")}>All</Pill>
                <Pill active={tierFilter === "decision_maker"} onClick={() => setTierFilter("decision_maker")} activeClassName="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">Decision Maker</Pill>
                <Pill active={tierFilter === "influencer"} onClick={() => setTierFilter("influencer")} activeClassName="bg-violet-50 text-violet-700 border-violet-300 font-semibold">Influencer</Pill>
              </div>
              {/* Dept pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 w-20 shrink-0">Department</span>
                {[
                  { id: "all", label: "All" },
                  { id: "hr", label: "HR" },
                  { id: "operations", label: "Operations" },
                  { id: "sales", label: "Sales" },
                  { id: "marketing", label: "Marketing" },
                  { id: "finance", label: "Finance" },
                ].map(({ id, label }) => (
                  <Pill key={id} active={deptFilter === id} onClick={() => setDeptFilter(id)}>{label}</Pill>
                ))}
              </div>
              {/* Noise toggle */}
              <div className="flex items-center gap-2 sm:pl-[88px]">
                <button
                  onClick={() => setShowNoise((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showNoise ? "bg-[#4B6BF5]" : "bg-gray-200"}`}
                >
                  <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${showNoise ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-xs text-gray-500">Show noise leads</span>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <Stat label="Decision Makers" value={dmCount}    color="text-green-600" />
              <div className="hidden sm:block h-5 w-px bg-gray-200" />
              <Stat label="Influencers"     value={infCount}   color="text-blue-600" />
              {showNoise && <>
                <div className="hidden sm:block h-5 w-px bg-gray-200" />
                <Stat label="Noise"         value={noiseCount} color="text-gray-400" />
              </>}
              <div className="hidden sm:block h-5 w-px bg-gray-200" />
              <Stat label="Unlocked"        value={unlockedCount} color="text-purple-600" />
              <div className="hidden sm:block h-5 w-px bg-gray-200" />
              <Stat label="Showing"         value={filteredLeads.length} color="text-black" />
            </div>

            {/* Mobile card layout (hidden on sm+) */}
            <div className="sm:hidden space-y-3">
              {filteredLeads.map((lead) => {
                const companyName = lead.companies?.name ?? lead.company_name ?? ""
                const tier = TIER_CONFIG[lead.tier] ?? TIER_CONFIG.influencer
                const isUnlocking = unlockingId === lead.id
                const unlockErr = unlockErrors[lead.id]
                return (
                  <div key={lead.id} className={`card-lift p-4 rounded-2xl border border-gray-200 space-y-3 ${lead.tier === "noise" ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <InitialsAvatar name={lead.full_name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900 truncate" title={lead.full_name}>{lead.full_name}</p>
                            {lead.unlocked && (
                              <span className="inline-flex shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Saved
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5" title={lead.job_title}>{lead.job_title}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tier.className}`}>{tier.label}</span>
                    </div>
                    {(companyName || lead.geo_location) && (
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {companyName && <p className="truncate" title={companyName}><span className="text-gray-400">Company: </span>{companyName}</p>}
                        {lead.geo_location && <p className="truncate"><span className="text-gray-400">Location: </span>{lead.geo_location}</p>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-0.5">
                      {lead.linkedin_url && (
                        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:opacity-80 transition-opacity shrink-0">
                          <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                        </a>
                      )}
                      <div className="flex-1 min-w-0">
                        {lead.unlocked && lead.email
                          ? <a href={`mailto:${lead.email}`} className="text-xs text-gray-700 hover:text-black truncate block">{lead.email}</a>
                          : <LockedCell />
                        }
                      </div>
                    </div>
                    {lead.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <svg className="size-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Unlocked
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => handleUnlock(lead)}
                          disabled={!!unlockingId || credits < 2}
                          className="btn-press w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                        >
                          {isUnlocking ? (
                            <><svg className="size-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Unlocking…</>
                          ) : (
                            <><svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>Unlock · 2 credits</>
                          )}
                        </button>
                        {unlockErr && <span className="text-xs text-red-500">{unlockErr}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop table (hidden below sm) */}
            <div className="hidden sm:block rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Name</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Title</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Company</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Location</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 whitespace-nowrap">Tier</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">LinkedIn</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Email</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Phone</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Unlock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLeads.map((lead) => {
                      const companyName = lead.companies?.name ?? lead.company_name ?? ""
                      const tier = TIER_CONFIG[lead.tier] ?? TIER_CONFIG.influencer
                      const isUnlocking = unlockingId === lead.id
                      const unlockErr = unlockErrors[lead.id]

                      return (
                        <tr key={lead.id} className={`hover:bg-[#EEF1FE]/30 transition-colors duration-150 ${lead.tier === "noise" ? "opacity-50" : ""}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap min-w-[120px] max-w-[180px]">
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate" title={lead.full_name}>{lead.full_name}</span>
                              {lead.unlocked && (
                                <span className="inline-flex shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Saved
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap min-w-[160px] max-w-[200px] truncate" title={lead.job_title}>{lead.job_title}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap min-w-[120px] max-w-[160px] truncate" title={companyName}>{companyName}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {lead.geo_location
                              ? <span className="text-xs text-gray-400">{lead.geo_location}</span>
                              : <span className="text-gray-300 text-xs">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex shrink-0 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tier.className}`}>
                              {tier.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {lead.linkedin_url ? (
                              <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#0A66C2] hover:opacity-80 transition-opacity">
                                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lead.unlocked && lead.email
                              ? <a href={`mailto:${lead.email}`} className="text-xs text-gray-700 hover:text-black">{lead.email}</a>
                              : <LockedCell />
                            }
                          </td>
                          <td className="px-4 py-3">
                            {lead.unlocked && lead.phone
                              ? <span className="text-xs text-gray-700">{lead.phone}</span>
                              : lead.unlocked
                                ? <span className="text-xs text-gray-400">—</span>
                                : <LockedCell />
                            }
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
                                  className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                  style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                                >
                                  {isUnlocking ? (
                                    <><svg className="size-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Unlocking…</>
                                  ) : (
                                    <><svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>Unlock · 2 credits</>
                                  )}
                                </button>
                                {unlockErr && <span className="text-xs text-red-500">{unlockErr}</span>}
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
              Showing {filteredLeads.length} of {leads.length} total leads · noise {showNoise ? "visible" : "hidden"}
            </p>

            {/* ── Refine Search panel ── */}
            <div className="rounded-2xl border border-gray-200">
              <button
                onClick={() => setRefineOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-black hover:bg-gray-50/50 transition-colors duration-150 rounded-2xl"
              >
                <span className="flex items-center gap-2">
                  <svg className="size-4 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Refine Search
                </span>
                <svg className={`size-4 text-gray-400 transition-transform ${refineOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {refineOpen && (
                <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
                    {/* Company size */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Company Size</p>
                      <div className="grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2">
                      {COMPANY_SIZE_OPTIONS.map(({ label, value }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSizes.includes(value)}
                            onChange={(e) => setSelectedSizes((prev) =>
                              e.target.checked ? [...prev, value] : prev.filter((v) => v !== value)
                            )}
                            className="rounded border-gray-300 text-[#4B6BF5] focus:ring-[#4B6BF5]"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                      </div>
                    </div>

                    {/* Seniority */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Seniority</p>
                      <div className="grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2">
                      {SENIORITY_OPTIONS.map(({ label, value }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSeniorities.includes(value)}
                            onChange={(e) => setSelectedSeniorities((prev) =>
                              e.target.checked ? [...prev, value] : prev.filter((v) => v !== value)
                            )}
                            className="rounded border-gray-300 text-[#4B6BF5] focus:ring-[#4B6BF5]"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                      </div>
                    </div>

                    {/* City focus */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">City Focus</p>
                      <input
                        type="text"
                        placeholder="e.g. Toronto"
                        value={cityFocusInput}
                        onChange={(e) => setCityFocusInput(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4B6BF5]/30 focus:border-[#4B6BF5]"
                      />
                      <p className="text-xs text-gray-400">Filters prospects by city within the campaign region</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmRefetch(true)}
                    disabled={isFetching || credits < 5}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                  >
                    Re-fetch Leads with These Filters
                  </button>
                </div>
              )}
            </div>

            {/* ── Re-score panel ── */}
            <div className="rounded-2xl border border-gray-200">
              <button
                onClick={() => setRescoreOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-black hover:bg-gray-50/50 transition-colors duration-150 rounded-2xl"
              >
                <span className="flex items-center gap-2">
                  <svg className="size-4 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Re-score with Updated Context
                </span>
                <svg className={`size-4 text-gray-400 transition-transform ${rescoreOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {rescoreOpen && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500">Add context about your ideal buyer to improve tier accuracy. Free — no credits used.</p>
                  <textarea
                    value={rescoreContext}
                    onChange={(e) => setRescoreContext(e.target.value)}
                    placeholder="e.g. We sell corporate group event tickets to HR directors at Ontario companies with 50-500 employees. Ignore anyone at companies with more than 2000 employees."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4B6BF5]/30 focus:border-[#4B6BF5] resize-none"
                  />
                  {rescoreError && <p className="text-xs text-red-500">{rescoreError}</p>}
                  <button
                    onClick={handleRescore}
                    disabled={rescoring}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                  >
                    {rescoring ? (
                      <><svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Re-scoring…</>
                    ) : "Re-score Leads"}
                  </button>
                </div>
              )}
            </div>

            {/* Unlock prompt banner */}
            {status === "preview_ready" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-[#4B6BF5]/20 bg-gradient-to-r from-[#EEF1FE] to-[#F0EBFE]">
                <div className="space-y-0.5">
                  <p className="font-semibold text-black text-sm">
                    {leads.length} decision makers found
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Unlock contacts to get verified emails, phone numbers, and LinkedIn profiles.
                  </p>
                </div>
                <button disabled className="w-full sm:w-auto sm:shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white opacity-60 cursor-not-allowed whitespace-nowrap"
                  style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }} title="Coming soon">
                  Run Full Campaign
                </button>
              </div>
            )}
          </div>
        )}
        {/* Close leads tab */}
        </>}

        </div>
      </main>

      {/* ── Confirm re-fetch modal ── */}
      {confirmRefetch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-black">Re-fetch Leads?</h3>
            <p className="text-sm text-gray-600">
              This will use up to <span className="font-semibold text-black">{estimatedCredits} credits</span> and replace your current lead list. Any unlocked contacts will be lost.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmRefetch(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRefineRefetch}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
              >
                Yes, Re-fetch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
