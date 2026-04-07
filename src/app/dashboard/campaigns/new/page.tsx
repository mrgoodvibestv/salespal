"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

// ── Types ──────────────────────────────────────────────────────────────────
interface ExploriumFilters {
  website_keywords?: string[]
  company_size?: string[]
  company_country_code?: string[]
  job_level?: string[]
  job_department?: string[]
}

interface CampaignAngle {
  name: string
  tagline: string
  target_titles: string[]
  target_companies: string
  pitch_summary: string
  why_now: string
  explorium_filters: ExploriumFilters
}

interface AnalysisResult {
  campaign_name: string
  icp: { description: string; geography: string; key_signals: string[] }
  obvious_angle: CampaignAngle
  hidden_angle: CampaignAngle
  stats: { companies: number; estimated_contacts: number }
}

type Step = 1 | 2 | 3
type Status = "idle" | "analyzing" | "ready" | "creating" | "error"

// ── Scanning animation steps ───────────────────────────────────────────────
const SCAN_STEPS = [
  "Reading your website…",
  "Extracting your ICP…",
  "Sizing your market…",
  "Building campaign angles…",
]

// ── Main component ─────────────────────────────────────────────────────────
function NewCampaignContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialUrl = searchParams.get("url") ?? ""

  const [step, setStep] = useState<Step>(1)
  const [status, setStatus] = useState<Status>("idle")
  const [url, setUrl] = useState(initialUrl)
  const [urlError, setUrlError] = useState("")
  const [scanStep, setScanStep] = useState(0)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [selectedAngle, setSelectedAngle] = useState<"obvious" | "hidden" | null>(null)
  const [campaignName, setCampaignName] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasAutoStarted = useRef(false)

  // Auto-start analysis when URL is pre-filled from landing page
  useEffect(() => {
    if (initialUrl && !hasAutoStarted.current) {
      hasAutoStarted.current = true
      startAnalysis(initialUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Animate scan steps during analysis
  useEffect(() => {
    if (status === "analyzing") {
      setScanStep(0)
      scanTimer.current = setInterval(() => {
        setScanStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1))
      }, 2000)
    } else {
      if (scanTimer.current) clearInterval(scanTimer.current)
    }
    return () => { if (scanTimer.current) clearInterval(scanTimer.current) }
  }, [status])

  async function startAnalysis(targetUrl: string) {
    setUrlError("")
    setErrorMsg("")

    const normalized =
      targetUrl.startsWith("http://") || targetUrl.startsWith("https://")
        ? targetUrl
        : `https://${targetUrl}`
    try { new URL(normalized) } catch {
      setUrlError("Please enter a valid website URL.")
      return
    }

    setUrl(normalized)
    setStatus("analyzing")

    try {
      const res = await fetch("/api/campaigns/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          res.status === 503 || data.error === "AI_OVERLOADED"
            ? "AI_OVERLOADED"
            : (data.error ?? "Analysis failed")
        )
      }

      setAnalysis(data)
      setCampaignName(data.campaign_name)
      setStatus("ready")
      setStep(2)
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
  }

  async function handleLaunch() {
    if (!analysis || !selectedAngle) return
    setStatus("creating")

    const angle = selectedAngle === "obvious"
      ? analysis.obvious_angle
      : analysis.hidden_angle

    try {
      const res = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          icp_json: {
            description:        angle.pitch_summary,
            geography:          analysis.icp.geography,
            key_signals:        analysis.icp.key_signals,
            url,
            selected_angle:     selectedAngle,
            angle_data:         angle,
            // top-level explorium_filters mirrors the selected angle so the
            // leads pipeline always reads the right filters regardless of
            // which lookup path it uses
            explorium_filters:  angle.explorium_filters,
          },
          angle_selected: angle.name,
          stats_result: analysis.stats,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign")

      router.push(`/dashboard/campaigns/${data.campaign_id}`)
    } catch (err) {
      setStatus("ready")
      setErrorMsg(err instanceof Error ? err.message : "Failed to create campaign")
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-black transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm text-gray-600">New Campaign</span>

          {/* Step indicator */}
          {status === "ready" && (
            <div className="ml-auto flex items-center gap-2">
              {([2, 3] as const).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`size-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      step === s
                        ? "text-white"
                        : step > s
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                    style={step === s ? { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" } : {}}
                  >
                    {step > s ? "✓" : s - 1}
                  </div>
                  {s < 3 && <div className="w-8 h-px bg-gray-200" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12">
        {/* ── Step 1: URL entry + loading + stats ── */}
        {step === 1 && (
          <Step1
            url={url}
            setUrl={setUrl}
            urlError={urlError}
            status={status}
            scanStep={scanStep}
            errorMsg={errorMsg}
            onSubmit={(u) => startAnalysis(u)}
            onRetry={() => { setStatus("idle"); setErrorMsg("") }}
            onRetryAnalysis={() => startAnalysis(url)}
          />
        )}

        {/* ── Step 2: Angle selection ── */}
        {step === 2 && analysis && (
          <Step2
            analysis={analysis}
            selectedAngle={selectedAngle}
            onSelect={setSelectedAngle}
            onBack={() => { setStep(1); setStatus("idle") }}
            onNext={() => setStep(3)}
          />
        )}

        {/* ── Step 3: Confirm & launch ── */}
        {step === 3 && analysis && selectedAngle && (
          <Step3
            analysis={analysis}
            selectedAngle={selectedAngle}
            campaignName={campaignName}
            setCampaignName={setCampaignName}
            status={status}
            errorMsg={errorMsg}
            onBack={() => setStep(2)}
            onLaunch={handleLaunch}
          />
        )}
      </main>
    </div>
  )
}

// ── Step 1 component ───────────────────────────────────────────────────────
function Step1({
  url, setUrl, urlError, status, scanStep, errorMsg, onSubmit, onRetry, onRetryAnalysis,
}: {
  url: string
  setUrl: (v: string) => void
  urlError: string
  status: Status
  scanStep: number
  errorMsg: string
  onSubmit: (url: string) => void
  onRetry: () => void
  onRetryAnalysis: () => void
}) {
  if (status === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
        {/* Spinner */}
        <div className="relative size-16">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: "conic-gradient(from 0deg, #4B6BF5, #7B4BF5, transparent)",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black 0)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black 0)",
            }}
          />
          <div
            className="absolute inset-1.5 rounded-full"
            style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-black">
            SalesPal is scanning your business…
          </h2>
          <div className="h-5">
            {SCAN_STEPS.map((s, i) => (
              <p
                key={s}
                className={`text-sm transition-all duration-500 ${
                  i === scanStep ? "text-gray-600 opacity-100" : "opacity-0 absolute"
                }`}
              >
                {s}
              </p>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400">This usually takes 15–30 seconds</p>
      </div>
    )
  }

  if (status === "error") {
    const isOverloaded = errorMsg === "AI_OVERLOADED"
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className={`size-12 rounded-full flex items-center justify-center ${isOverloaded ? "bg-yellow-50" : "bg-red-50"}`}>
          {isOverloaded ? (
            <svg className="size-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ) : (
            <svg className="size-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
        </div>
        <h2 className="text-lg font-semibold text-black">
          {isOverloaded ? "AI is under high demand" : "Analysis failed"}
        </h2>
        <p className="text-sm text-gray-500 max-w-xs">
          {isOverloaded
            ? "Our AI is experiencing high demand. Please try again in a moment."
            : errorMsg}
        </p>
        <button
          onClick={isOverloaded ? onRetryAnalysis : onRetry}
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
        >
          {isOverloaded ? "Retry now →" : "Try again"}
        </button>
        {isOverloaded && (
          <button
            onClick={onRetry}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Change URL instead
          </button>
        )}
      </div>
    )
  }

  // Idle — show URL input
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-black">Start a new campaign</h1>
        <p className="text-sm text-gray-500">
          Enter your website URL and SalesPal will identify your best outbound angles.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(url) }}
        className="space-y-3"
      >
        <label className="text-sm font-medium text-black">Your website URL</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value) }}
            placeholder="yourcompany.com"
            className={`flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all placeholder:text-gray-400 ${
              urlError
                ? "border-red-300 focus:border-red-400"
                : "border-gray-200 focus:border-[#4B6BF5] focus:ring-2 focus:ring-[#4B6BF5]/10"
            }`}
            autoComplete="off"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white whitespace-nowrap hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
          >
            Analyze →
          </button>
        </div>
        {urlError && <p className="text-xs text-red-500">{urlError}</p>}
      </form>
    </div>
  )
}

// ── Step 2 component ───────────────────────────────────────────────────────
function Step2({
  analysis, selectedAngle, onSelect, onBack, onNext,
}: {
  analysis: AnalysisResult
  selectedAngle: "obvious" | "hidden" | null
  onSelect: (a: "obvious" | "hidden") => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-8">
      {/* Stats banner */}
      <div
        className="rounded-2xl px-6 py-5 text-white"
        style={{ background: "linear-gradient(135deg, #4B6BF5, #7B4BF5)" }}
      >
        <p className="text-sm font-medium opacity-80 mb-1">Market sizing complete</p>
        {analysis.stats.companies > 0 ? (
          <p className="text-2xl font-bold">
            SalesPal found{" "}
            <span className="underline decoration-white/40">
              {analysis.stats.estimated_contacts.toLocaleString()} potential contacts
            </span>{" "}
            across{" "}
            <span className="underline decoration-white/40">
              {analysis.stats.companies.toLocaleString()} companies
            </span>{" "}
            matching your ICP
          </p>
        ) : (
          <p className="text-2xl font-bold">
            ICP extracted — ready to build your campaign
          </p>
        )}
        <p className="text-xs mt-3 opacity-70">
          {analysis.icp.geography} · {analysis.icp.key_signals.slice(0, 3).join(" · ")}
        </p>
      </div>

      {/* Angle selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-black">
          SalesPal found two campaign angles. Pick one.
        </h2>
        <p className="text-sm text-gray-500">
          The hidden angle is often the higher-leverage play.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AngleCard
          type="obvious"
          angle={analysis.obvious_angle}
          selected={selectedAngle === "obvious"}
          onSelect={() => onSelect("obvious")}
        />
        <AngleCard
          type="hidden"
          angle={analysis.hidden_angle}
          selected={selectedAngle === "hidden"}
          onSelect={() => onSelect("hidden")}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-black transition-colors"
        >
          ← Change URL
        </button>
        <button
          onClick={onNext}
          disabled={!selectedAngle}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
        >
          Continue with this angle →
        </button>
      </div>
    </div>
  )
}

function AngleCard({
  type, angle, selected, onSelect,
}: {
  type: "obvious" | "hidden"
  angle: CampaignAngle
  selected: boolean
  onSelect: () => void
}) {
  const isHidden = type === "hidden"
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-2xl border-2 p-5 transition-all space-y-4 ${
        selected
          ? "border-[#4B6BF5] bg-blue-50/50"
          : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      {/* Badge */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isHidden
              ? "text-white"
              : "bg-gray-100 text-gray-600"
          }`}
          style={isHidden ? { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" } : {}}
        >
          {isHidden ? (
            <>
              <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.001z" />
              </svg>
              Hidden angle
            </>
          ) : (
            "Obvious angle"
          )}
        </span>
        {/* Radio indicator */}
        <div
          className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${
            selected ? "border-[#4B6BF5]" : "border-gray-300"
          }`}
        >
          {selected && (
            <div
              className="size-2.5 rounded-full"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="font-semibold text-black text-base">{angle.name}</h3>
        <p className="text-sm text-gray-500 italic">&ldquo;{angle.tagline}&rdquo;</p>
      </div>

      <div className="space-y-2.5 text-sm">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Target titles</p>
          <div className="flex flex-wrap gap-1">
            {angle.target_titles.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">{t}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Target companies</p>
          <p className="text-gray-700 text-xs leading-relaxed">{angle.target_companies}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Pitch</p>
          <p className="text-gray-700 text-xs leading-relaxed">{angle.pitch_summary}</p>
        </div>
        <div className="flex items-start gap-1.5 pt-1">
          <svg className="size-3.5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-gray-500">{angle.why_now}</p>
        </div>
      </div>
    </button>
  )
}

// ── Step 3 component ───────────────────────────────────────────────────────
function Step3({
  analysis, selectedAngle, campaignName, setCampaignName,
  status, errorMsg, onBack, onLaunch,
}: {
  analysis: AnalysisResult
  selectedAngle: "obvious" | "hidden"
  campaignName: string
  setCampaignName: (v: string) => void
  status: Status
  errorMsg: string
  onBack: () => void
  onLaunch: () => void
}) {
  const angle = selectedAngle === "obvious"
    ? analysis.obvious_angle
    : analysis.hidden_angle

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-black">Confirm & launch</h2>
        <p className="text-sm text-gray-500">
          Review your campaign before we start finding leads.
        </p>
      </div>

      {/* Campaign name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-black">Campaign name</label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#4B6BF5] focus:ring-2 focus:ring-[#4B6BF5]/10 transition-all"
        />
      </div>

      {/* Selected angle summary */}
      <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Selected angle</p>
            <p className="font-semibold text-black mt-0.5">{angle.name}</p>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
            style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
          >
            {selectedAngle === "hidden" ? "Hidden" : "Obvious"}
          </span>
        </div>

        <div className="px-5 py-4 space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Targeting</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {angle.target_titles.map((t) => (
              <span key={t} className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs">{t}</span>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Pitch</p>
          <p className="text-sm text-gray-700 leading-relaxed">{angle.pitch_summary}</p>
        </div>

        {analysis.stats.companies > 0 && (
          <div className="px-5 py-4 flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-black tabular-nums">
                {analysis.stats.companies.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">matching companies</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-black tabular-nums">
                ~{analysis.stats.estimated_contacts.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">potential contacts</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-black">0</p>
              <p className="text-xs text-gray-400">credits to launch</p>
            </div>
          </div>
        )}
      </div>

      {/* ICP summary */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 space-y-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">ICP</p>
        <p className="text-sm text-gray-700">{analysis.icp.description}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {analysis.icp.key_signals.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 text-xs">{s}</span>
          ))}
        </div>
      </div>

      {errorMsg && (
        <p className="text-sm text-red-500 text-center">{errorMsg}</p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={status === "creating"}
          className="text-sm text-gray-400 hover:text-black transition-colors disabled:opacity-40"
        >
          ← Change angle
        </button>
        <button
          onClick={onLaunch}
          disabled={status === "creating" || !campaignName.trim()}
          className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
        >
          {status === "creating" ? (
            <>
              <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Launching…
            </>
          ) : (
            "Launch Campaign →"
          )}
        </button>
      </div>
    </div>
  )
}

export default function NewCampaignPage() {
  return (
    <Suspense>
      <NewCampaignContent />
    </Suspense>
  )
}
