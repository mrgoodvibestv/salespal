"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

// ── Ticker data ───────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  "Maple Leaf Foods · 14 decision makers found",
  "Shopify campaign · 3 contacts unlocked",
  "RBC · VP People identified",
  "Loblaws · Director HR surfaced",
  "TD Bank · 7 new leads fetched",
  "OpenText · Campaign angle generated",
  "Manulife · 2 contacts unlocked",
  "Rogers · ICP extracted in 48s",
  "Sun Life · Hidden angle discovered",
  "Intact Insurance · 9 leads ready",
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  company_name: string
  what_they_sell: string
  ideal_customer_profile: {
    company_type: string
    company_size: string
    industries: string[]
  }
  target_titles: string[]
  campaign_angles: { angle: string; pitch: string }[]
  tagline: string
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <span className="text-xl font-bold tracking-tight select-none">
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

// ── Demo section ──────────────────────────────────────────────────────────────
function DemoSection() {
  const [demoUrl, setDemoUrl] = useState("")
  const [demoError, setDemoError] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [retryAfter, setRetryAfter] = useState(0)

  // On mount — restore cooldown from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sp_analyze_ts")
    if (stored) {
      const elapsed = Math.floor((Date.now() - Number(stored)) / 1000)
      const remaining = 60 - elapsed
      if (remaining > 0) setRetryAfter(remaining)
    }
  }, [])

  // Countdown ticker
  useEffect(() => {
    if (retryAfter <= 0) return
    const t = setInterval(() => {
      setRetryAfter((s) => {
        if (s <= 1) { clearInterval(t); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [retryAfter])

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = demoUrl.trim()
    if (!trimmed) {
      setDemoError("Please enter your website URL.")
      return
    }
    const normalized =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`
    try {
      new URL(normalized)
    } catch {
      setDemoError("Please enter a valid URL (e.g. yourcompany.com).")
      return
    }

    setDemoError("")
    setAnalyzing(true)
    setResult(null)

    try {
      const res = await fetch("/api/analyze-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setRetryAfter(data.retryAfter ?? 60)
          setDemoError("")
        } else {
          setDemoError(data.error ?? "Analysis failed. Please try again.")
        }
        return
      }
      localStorage.setItem("sp_analyze_ts", String(Date.now()))
      setRetryAfter(60)
      setResult(data)
    } catch {
      setDemoError("Analysis failed. Please try again.")
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <section className="px-6 md:px-12 py-16 bg-gray-50/60 border-y border-gray-100">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-10">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Live Demo
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-black">
            See your ICP in 10 seconds
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Paste any website URL. Claude reads it and maps your ideal customer profile.
          </p>
        </div>

        {/* URL input */}
        <form onSubmit={handleAnalyze}>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={demoUrl}
              onChange={(e) => { setDemoUrl(e.target.value); setDemoError("") }}
              placeholder="yourcompany.com"
              className="flex-1 px-5 py-4 rounded-xl border border-gray-200 text-base outline-none focus:border-[#4B6BF5] focus:ring-2 focus:ring-[#4B6BF5]/10 transition-all placeholder:text-gray-400 bg-white shadow-sm"
              autoComplete="off"
              spellCheck={false}
              disabled={analyzing}
            />
            <button
              type="submit"
              disabled={analyzing || retryAfter > 0}
              className="w-full sm:w-auto px-7 py-4 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shadow-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            >
              {analyzing ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                "Analyze my website →"
              )}
            </button>
          </div>
          {demoError && <p className="text-sm text-red-500 mt-3">{demoError}</p>}
          {retryAfter > 0 && (
            <p
              className="text-xs text-center mt-3 font-medium tabular-nums"
              style={{
                background: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              One analysis per minute · ready in{" "}
              {Math.floor(retryAfter / 60) > 0
                ? `${Math.floor(retryAfter / 60)}:${String(retryAfter % 60).padStart(2, "0")}`
                : `0:${String(retryAfter).padStart(2, "0")}`}
            </p>
          )}
        </form>

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-4">

            {/* Company summary card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1">Company</p>
                  <p className="text-lg font-bold text-gray-900">{result.company_name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{result.what_they_sell}</p>
                </div>
                {result.tagline && (
                  <span className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-[#4B6BF5] bg-[#EEF1FE] border border-[#4B6BF5]/20">
                    &ldquo;{result.tagline}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* ICP card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-4">
                Ideal Customer Profile
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Company Type</p>
                  <p className="text-gray-700">{result.ideal_customer_profile.company_type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Company Size</p>
                  <p className="text-gray-700">{result.ideal_customer_profile.company_size}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Industries</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {result.ideal_customer_profile.industries.map((ind) => (
                      <span key={ind} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Target titles */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold tracking-widests uppercase text-gray-400 mb-4">
                Target Titles
              </p>
              <div className="flex flex-wrap gap-2">
                {result.target_titles.map((title, i) => (
                  <span
                    key={title}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      i === 0 ? "text-white" : "bg-gray-100 text-gray-700"
                    }`}
                    style={i === 0 ? { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" } : {}}
                  >
                    {i === 0 && (
                      <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    {title}
                  </span>
                ))}
              </div>
            </div>

            {/* Campaign angles */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-4">
                Campaign Angles
              </p>
              <div className="space-y-3">
                {result.campaign_angles.map((angle, i) => (
                  <div
                    key={angle.angle}
                    className={`p-4 rounded-xl border ${
                      i === 0
                        ? "border-[#4B6BF5]/30 bg-[#EEF1FE]/50"
                        : "border-gray-100 bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900">{angle.angle}</p>
                      {i === 0 && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                        >
                          Best fit
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{angle.pitch}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gated CTA */}
            <div
              className="rounded-2xl p-6 text-center space-y-4"
              style={{ background: "linear-gradient(135deg, #4B6BF5, #7B4BF5)" }}
            >
              <div>
                <p className="text-white font-bold text-lg">Your leads are ready</p>
                <p className="text-white/80 text-sm mt-1">
                  Sign up to see verified contacts at companies that match this ICP.
                </p>
              </div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white text-[#4B6BF5] hover:bg-gray-50 transition-colors active:scale-[0.98]"
              >
                Sign up to unlock verified contacts →
              </Link>
              <p className="text-white/50 text-xs">10 free leads · No credit card required</p>
            </div>

          </div>
        )}
      </div>
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap');
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .serif-italic {
          font-family: 'Instrument Serif', Georgia, serif;
          font-style: italic;
          font-weight: 400;
        }
      `}</style>

      <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">

        {/* ── Ticker ── */}
        <div className="bg-gray-950 py-2.5 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-3 text-sm font-semibold text-gray-300 px-6">
                {item}
                <span className="text-gray-600 font-normal">|</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Nav ── */}
        <header className="px-6 md:px-12 py-5 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="hidden sm:inline text-sm text-gray-500 hover:text-black transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            >
              Start free
            </Link>
          </div>
        </header>

        {/* ── Hero (centered, no URL form) ── */}
        <section className="px-6 md:px-12 py-10 lg:py-14">
          <div className="max-w-3xl mx-auto text-center space-y-8">

            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-500 bg-gray-50">
              <span
                className="size-1.5 rounded-full inline-block shrink-0"
                style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
              />
              AI-Powered B2B Outreach
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-black">
              Paste your website.
              <br />
              Find your{" "}
              <span className="serif-italic" style={{ fontSize: "1.05em" }}>buyers.</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
              SalesPal finds your best campaign angle,
              surfaces qualified leads, and writes your outreach — in minutes.
            </p>

            {/* Trust signals */}
            <p className="text-xs text-gray-400 flex flex-wrap justify-center gap-x-5 gap-y-1">
              <span>✓ No credit card required</span>
              <span>✓ 10 free leads</span>
              <span>✓ 2 min setup</span>
            </p>

            {/* Channel badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Outreach via:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                <svg className="size-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Gmail
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <svg className="size-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
                LinkedIn
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone
              </span>
            </div>

          </div>
        </section>

        {/* ── Live Demo ── */}
        <DemoSection />

        {/* ── Footer ── */}
        <footer className="border-t border-gray-100 px-6 md:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-xs text-gray-400">
              © 2026{" "}
              <span
                className="font-medium"
                style={{
                  background: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Good Vibes AI
              </span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Terms</Link>
            <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Sign in</Link>
          </div>
        </footer>

      </div>
    </>
  )
}
