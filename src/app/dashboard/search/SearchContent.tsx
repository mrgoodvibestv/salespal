"use client"

import { useState } from "react"
import { downloadCsv } from "@/lib/exportCsv"

// ── Types ──────────────────────────────────────────────────────────────────
interface SearchLead {
  prospect_id: string
  full_name: string
  job_title: string
  company_name: string
  geo_location: string
  linkedin_url: string
  tier: "decision_maker" | "influencer" | "noise"
  unlocked: boolean
  email: string | null
  phone: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-md ${className ?? ""}`} />
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  const colors = [
    "bg-purple-100 text-purple-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`size-10 ${color} rounded-full flex items-center justify-center font-semibold text-sm shrink-0`}>
      {initials}
    </div>
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

// ── Constants ──────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  decision_maker: { label: "Decision Maker", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  influencer:     { label: "Influencer",     className: "bg-violet-50 text-violet-700 border border-violet-200" },
  noise:          { label: "Noise",          className: "bg-gray-50 text-gray-400 border border-gray-100" },
}

const SENIORITY_OPTIONS = [
  { label: "C-Suite",   value: "c-suite" },
  { label: "Owner",     value: "owner" },
  { label: "Founder",   value: "founder" },
  { label: "VP",        value: "vice president" },
  { label: "Director",  value: "director" },
  { label: "Manager",   value: "manager" },
]

const DEPARTMENT_OPTIONS = [
  { label: "Any department",    value: "" },
  { label: "Sales",             value: "sales" },
  { label: "Marketing",         value: "marketing" },
  { label: "Engineering",       value: "engineering" },
  { label: "Finance",           value: "finance" },
  { label: "Human Resources",   value: "human resources" },
  { label: "Operations",        value: "operations" },
  { label: "R&D",               value: "r&d" },
  { label: "Data",              value: "data" },
  { label: "Administration",    value: "administration" },
]

const COMPANY_SIZE_OPTIONS = [
  { label: "Any size",          value: "" },
  { label: "1–10",              value: "1-10" },
  { label: "11–50",             value: "11-50" },
  { label: "51–200",            value: "51-200" },
  { label: "201–500",           value: "201-500" },
  { label: "501–1,000",         value: "501-1000" },
  { label: "1,001–5,000",       value: "1001-5000" },
  { label: "5,001+",            value: "5001-10000" },
]

// ── Pill ───────────────────────────────────────────────────────────────────
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
        active
          ? "bg-[#4B6BF5] text-white border-transparent"
          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SearchContent({ credits: initialCredits }: { credits: number; userEmail: string }) {
  const [credits, setCredits] = useState(initialCredits)

  // Filter state
  const [selectedSeniorities, setSelectedSeniorities] = useState<string[]>([])
  const [selectedDepartment, setSelectedDepartment]   = useState("")
  const [selectedSize, setSelectedSize]               = useState("")
  const [countryInput, setCountryInput]               = useState("")
  const [hasEmail, setHasEmail]                       = useState(false)
  const [hasPhone, setHasPhone]                       = useState(false)

  // Pagination state
  const [pageCache, setPageCache]     = useState<Record<number, SearchLead[]>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore]         = useState(false)

  // UI state
  const [searching, setSearching]       = useState(false)
  const [searchError, setSearchError]   = useState("")
  const [unlockingId, setUnlockingId]   = useState<string | null>(null)
  const [unlockErrors, setUnlockErrors] = useState<Record<string, string>>({})

  // Derived
  const displayResults = pageCache[currentPage] ?? null
  const totalLoaded    = Object.values(pageCache).reduce((sum, p) => sum + p.length, 0)

  function toggleSeniority(v: string) {
    setSelectedSeniorities((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
  }

  function buildFilters(): Record<string, unknown> {
    const filters: Record<string, unknown> = {}
    if (selectedSeniorities.length) filters.job_level      = selectedSeniorities
    if (selectedDepartment)          filters.job_department = [selectedDepartment]
    if (selectedSize)                filters.company_size   = [selectedSize]
    if (countryInput.trim())         filters.country_code   = [countryInput.trim().toLowerCase()]
    if (hasEmail)                    filters.has_email      = true
    if (hasPhone)                    filters.has_phone_number = true
    return filters
  }

  async function handleSearch() {
    setSearching(true)
    setSearchError("")
    setPageCache({})
    setCurrentPage(1)
    setHasMore(false)

    try {
      const res = await fetch("/api/search/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: buildFilters(), page: 1 }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setSearchError(`Not enough credits. Search costs 5 credits. Current balance: ${data.balance ?? credits}.`)
        } else {
          setSearchError(data.error ?? "Search failed. Please try again.")
        }
        return
      }

      const newResults = data.results ?? []
      setPageCache({ 1: newResults })
      setHasMore(data.hasMore ?? false)
      refreshCredits()
    } catch {
      setSearchError("Search failed. Please try again.")
    } finally {
      setSearching(false)
    }
  }

  async function handleNextPage() {
    const nextPage = currentPage + 1

    // If already cached, navigate instantly
    if (pageCache[nextPage]) {
      setCurrentPage(nextPage)
      return
    }

    setSearching(true)
    setSearchError("")

    try {
      const res = await fetch("/api/search/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: buildFilters(), page: nextPage }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setSearchError(`Not enough credits. Each page costs 5 credits. Current balance: ${data.balance ?? credits}.`)
        } else {
          setSearchError(data.error ?? "Search failed. Please try again.")
        }
        return
      }

      const newResults = data.results ?? []
      setPageCache((prev) => ({ ...prev, [nextPage]: newResults }))
      setHasMore(data.hasMore ?? false)
      setCurrentPage(nextPage)
      refreshCredits()
    } catch {
      setSearchError("Search failed. Please try again.")
    } finally {
      setSearching(false)
    }
  }

  async function handleUnlock(prospect_id: string) {
    if (credits < 2) {
      setUnlockErrors((prev) => ({ ...prev, [prospect_id]: "Not enough credits" }))
      return
    }
    setUnlockingId(prospect_id)
    setUnlockErrors((prev) => { const n = { ...prev }; delete n[prospect_id]; return n })

    try {
      const res = await fetch("/api/search/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setUnlockErrors((prev) => ({ ...prev, [prospect_id]: "Not enough credits" }))
        } else {
          setUnlockErrors((prev) => ({ ...prev, [prospect_id]: data.error ?? "Unlock failed" }))
        }
        return
      }

      setPageCache((prev) => ({
        ...prev,
        [currentPage]: (prev[currentPage] ?? []).map((l) =>
          l.prospect_id === prospect_id
            ? { ...l, unlocked: true, email: data.email, phone: data.phone }
            : l
        ),
      }))
      refreshCredits()
    } catch {
      setUnlockErrors((prev) => ({ ...prev, [prospect_id]: "Unlock failed" }))
    } finally {
      setUnlockingId(null)
    }
  }

  function refreshCredits() {
    fetch("/api/user/credits")
      .then((r) => r.json())
      .then((d) => { if (typeof d.credits === "number") setCredits(d.credits) })
      .catch(() => {})
  }

  function handleExportSearch() {
    const rows = (displayResults ?? []).map((lead) => ({
      "Name":      lead.full_name,
      "Job Title": lead.job_title ?? "",
      "Company":   lead.company_name ?? "",
      "Location":  lead.geo_location ?? "",
      "Tier":      lead.tier === "decision_maker" ? "Decision Maker" : lead.tier === "influencer" ? "Influencer" : "Noise",
      "LinkedIn":  lead.linkedin_url ?? "",
      "Email":     lead.email ?? "",
      "Phone":     lead.phone ?? "",
    }))
    downloadCsv("salespal-prospect-search.csv", rows)
  }

  const dmCount        = displayResults?.filter((r) => r.tier === "decision_maker").length ?? 0
  const influencerCount = displayResults?.filter((r) => r.tier === "influencer").length ?? 0
  const unlockedCount  = displayResults?.filter((r) => r.unlocked).length ?? 0

  const nextPageCached = !!pageCache[currentPage + 1]

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-1">
          Outreach
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Prospect Search</h1>
        <p className="mt-1 text-sm text-gray-400">
          Search our database of millions of B2B contacts. Results are not saved — unlock contacts to reveal their details.
        </p>
      </div>

      {/* Filter card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 mb-6 shadow-sm">
        <div className="space-y-5">

          {/* Seniority pills */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-2">Seniority</p>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map((opt) => (
                <Pill
                  key={opt.value}
                  active={selectedSeniorities.includes(opt.value)}
                  onClick={() => toggleSeniority(opt.value)}
                >
                  {opt.label}
                </Pill>
              ))}
            </div>
          </div>

          {/* Department + Company size + Country row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-1.5">
                Department
              </label>
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:border-[#4B6BF5] focus:ring-1 focus:ring-[#4B6BF5]/20 transition-colors"
                >
                  {DEPARTMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-1.5">
                Company size
              </label>
              <div className="relative">
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-700 appearance-none cursor-pointer focus:outline-none focus:border-[#4B6BF5] focus:ring-1 focus:ring-[#4B6BF5]/20 transition-colors"
                >
                  {COMPANY_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-1.5">
                Country code
              </label>
              <input
                type="text"
                placeholder="e.g. us, ca, gb"
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#4B6BF5] focus:ring-1 focus:ring-[#4B6BF5]/20 transition-colors"
              />
            </div>
          </div>

          {/* Toggles + CTA row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  role="switch"
                  aria-checked={hasEmail}
                  onClick={() => setHasEmail((v) => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                    hasEmail ? "bg-[#4B6BF5]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      hasEmail ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-600 font-medium">Has email</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  role="switch"
                  aria-checked={hasPhone}
                  onClick={() => setHasPhone((v) => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                    hasPhone ? "bg-[#4B6BF5]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      hasPhone ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-600 font-medium">Has phone</span>
              </label>
            </div>

            <button
              onClick={handleSearch}
              disabled={searching}
              className="btn-press w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            >
              {searching ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Searching…
                </>
              ) : (
                <>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Search — 5 credits
                </>
              )}
            </button>
          </div>

          {searchError && (
            <p className="text-sm text-red-600 font-medium">{searchError}</p>
          )}
        </div>
      </div>

      {/* ── Pre-search empty state ── */}
      {!searching && displayResults === null && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="size-14 rounded-2xl bg-[#EEF1FE] flex items-center justify-center mb-4">
            <svg className="size-7 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">Search for your ideal prospects</p>
          <p className="text-sm text-gray-400 max-w-sm">
            Filter by seniority, department, company size, and country. Each search returns up to 25 results per page and costs 5 credits.
          </p>
        </div>
      )}

      {/* ── Skeleton while searching ── */}
      {searching && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          {/* Stats bar skeleton */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Table skeleton */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["w-40", "w-40", "w-32", "w-28", "w-20", "w-32", "w-24"].map((w, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <Skeleton className={`h-3 ${w}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-8 w-20 rounded-lg" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card skeleton */}
          <div className="md:hidden divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-44" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Zero results ── */}
      {!searching && displayResults !== null && displayResults.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="size-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <svg className="size-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">No prospects found</p>
          <p className="text-sm text-gray-400 max-w-sm">
            Try broadening your filters — remove seniority constraints or try a different department.
          </p>
        </div>
      )}

      {/* ── Results table ── */}
      {!searching && displayResults !== null && displayResults.length > 0 && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

          {/* Stats bar */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-5 text-xs flex-wrap">
            <span className="font-semibold text-gray-900 tabular-nums">{displayResults.length}</span>
            <span className="text-gray-400">prospects</span>
            <span className="text-gray-200">·</span>
            <span className="font-semibold text-emerald-600 tabular-nums">{dmCount}</span>
            <span className="text-gray-400">decision makers</span>
            <span className="text-gray-200">·</span>
            <span className="font-semibold text-violet-600 tabular-nums">{influencerCount}</span>
            <span className="text-gray-400">influencers</span>
            {unlockedCount > 0 && (
              <>
                <span className="text-gray-200">·</span>
                <span className="font-semibold text-[#4B6BF5] tabular-nums">{unlockedCount}</span>
                <span className="text-gray-400">unlocked</span>
              </>
            )}
            <button
              onClick={handleExportSearch}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-colors duration-150"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Title</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Company</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Location</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Tier</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Contact</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400"></th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((lead) => {
                  const tierCfg = TIER_CONFIG[lead.tier] ?? TIER_CONFIG.noise
                  const isUnlocking = unlockingId === lead.prospect_id
                  const unlockErr = unlockErrors[lead.prospect_id]

                  return (
                    <tr
                      key={lead.prospect_id}
                      className="border-b border-gray-50 hover:bg-[#EEF1FE]/30 transition-colors duration-100"
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <InitialsAvatar name={lead.full_name} />
                          <div className="min-w-0">
                            <span
                              className="font-semibold text-gray-900 text-sm truncate block max-w-[140px]"
                              title={lead.full_name}
                            >
                              {lead.full_name}
                            </span>
                            {lead.unlocked && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                                <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                                Saved
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3.5">
                        <span
                          className="text-sm text-gray-500 truncate block max-w-[160px]"
                          title={lead.job_title}
                        >
                          {lead.job_title || "—"}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3.5">
                        <span
                          className="text-sm text-gray-500 truncate block max-w-[140px]"
                          title={lead.company_name}
                        >
                          {lead.company_name || "—"}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-400 truncate block max-w-[120px]">
                          {lead.geo_location || "—"}
                        </span>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] leading-none font-semibold whitespace-nowrap ${tierCfg.className}`}>
                          <span className="truncate">{tierCfg.label}</span>
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        {lead.unlocked ? (
                          <div className="space-y-0.5">
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className="text-xs text-[#4B6BF5] hover:underline block truncate max-w-[160px]">
                                {lead.email}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">No email</span>
                            )}
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="text-xs text-gray-500 hover:underline block">
                                {lead.phone}
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <LockedCell />
                            {lead.linkedin_url && (
                              <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-[#4B6BF5] hover:underline flex items-center gap-1"
                              >
                                <svg className="size-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                                LinkedIn
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Unlock CTA */}
                      <td className="px-4 py-3.5">
                        {!lead.unlocked && (
                          <div>
                            <button
                              onClick={() => handleUnlock(lead.prospect_id)}
                              disabled={isUnlocking || credits < 2}
                              className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm transition-shadow"
                              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                            >
                              {isUnlocking ? (
                                <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                              ) : (
                                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                              )}
                              {isUnlocking ? "…" : "Unlock · 2cr"}
                            </button>
                            {unlockErr && (
                              <p className="text-[10px] text-red-500 mt-0.5">{unlockErr}</p>
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

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {displayResults.map((lead) => {
              const tierCfg = TIER_CONFIG[lead.tier] ?? TIER_CONFIG.noise
              const isUnlocking = unlockingId === lead.prospect_id
              const unlockErr = unlockErrors[lead.prospect_id]

              return (
                <div key={lead.prospect_id} className="p-4 card-lift">
                  {/* Row 1: avatar + name + tier */}
                  <div className="flex items-start gap-3 mb-2">
                    <InitialsAvatar name={lead.full_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate" title={lead.full_name}>
                          {lead.full_name}
                        </p>
                        {lead.unlocked && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                            Saved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5" title={lead.job_title}>
                        {lead.job_title || "—"}
                      </p>
                      <p className="text-xs text-gray-400 truncate" title={lead.company_name}>
                        {lead.company_name || "—"}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-[11px] leading-none font-semibold ${tierCfg.className}`}>
                      <span className="truncate">{tierCfg.label}</span>
                    </span>
                  </div>

                  {/* Row 2: location + linkedin */}
                  {(lead.geo_location || lead.linkedin_url) && (
                    <div className="flex items-center gap-3 mb-3 text-xs text-gray-400">
                      {lead.geo_location && <span>{lead.geo_location}</span>}
                      {lead.linkedin_url && (
                        <a
                          href={lead.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4B6BF5] hover:underline flex items-center gap-1"
                        >
                          <svg className="size-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                          LinkedIn
                        </a>
                      )}
                    </div>
                  )}

                  {/* Row 3: unlocked contact or unlock button */}
                  {lead.unlocked ? (
                    <div className="flex flex-wrap gap-3 text-xs">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="text-[#4B6BF5] hover:underline">
                          {lead.email}
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="text-gray-500 hover:underline">
                          {lead.phone}
                        </a>
                      )}
                      {!lead.email && !lead.phone && (
                        <span className="text-gray-400">No contact info returned</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => handleUnlock(lead.prospect_id)}
                        disabled={isUnlocking || credits < 2}
                        className="btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                      >
                        {isUnlocking ? (
                          <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        )}
                        {isUnlocking ? "Unlocking…" : "Unlock contact · 2 credits"}
                      </button>
                      {unlockErr && (
                        <p className="text-[10px] text-red-500 mt-1">{unlockErr}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Pagination bar ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 mt-0">
            <span className="text-xs text-gray-400">
              Page {currentPage} · {totalLoaded} prospects loaded
            </span>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors duration-150"
                >
                  ← Previous
                </button>
              )}
              {(nextPageCached || hasMore) && (
                <button
                  onClick={handleNextPage}
                  disabled={searching || (!nextPageCached && credits < 5)}
                  className={
                    nextPageCached
                      ? "px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors duration-150 disabled:opacity-40"
                      : "btn-press inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  }
                  style={nextPageCached ? {} : { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                >
                  {searching && !nextPageCached ? (
                    <>
                      <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading…
                    </>
                  ) : nextPageCached ? "Next →" : "Load more prospects — 5 credits"}
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </>
  )
}
