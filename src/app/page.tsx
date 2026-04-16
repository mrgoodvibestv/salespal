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
  campaign_angles: { angle: string; pitch: string; why_now: string; hook: string }[]
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [demoUrl, setDemoUrl] = useState("")
  const [demoError, setDemoError] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [retryAfter, setRetryAfter] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

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
    setModalOpen(true)

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
          setModalOpen(false)
          setDemoError("")
        } else {
          setModalOpen(false)
          setDemoError(data.error ?? "Analysis failed. Please try again.")
        }
        return
      }
      localStorage.setItem("sp_analyze_ts", String(Date.now()))
      setRetryAfter(60)
      setResult(data)
    } catch {
      setModalOpen(false)
      setDemoError("Analysis failed. Please try again.")
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
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
      ` }} />

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

        {/* ── Hero ── */}
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
              <span
                className="serif-italic"
                style={{
                  background: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontSize: "1.15em",
                }}
              >
                buyers.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
              SalesPal, our AI agent for outbound sales, finds your best campaign angle,
              surfaces qualified leads, and writes your outreach copy.
            </p>

            {/* URL form */}
            <form onSubmit={handleAnalyze} className="max-w-lg mx-auto w-full">
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
                  Analyze my website →
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

            {/* Stats trust bar */}
            <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold bg-gradient-to-r from-[#4B6BF5] to-[#7B4BF5] bg-clip-text text-transparent">
                  250M+
                </span>
                <span className="text-xs text-gray-400">Contacts</span>
              </div>
              <span className="text-gray-200 text-xs hidden sm:block">·</span>
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold bg-gradient-to-r from-[#4B6BF5] to-[#7B4BF5] bg-clip-text text-transparent">
                  50M+
                </span>
                <span className="text-xs text-gray-400">Companies</span>
              </div>
              <span className="text-gray-200 text-xs hidden sm:block">·</span>
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold bg-gradient-to-r from-[#4B6BF5] to-[#7B4BF5] bg-clip-text text-transparent">
                  Verified
                </span>
                <span className="text-xs text-gray-400">Emails & Phones</span>
              </div>
            </div>

          </div>

          {/* ── Modal ── */}
          {modalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !analyzing) setModalOpen(false)
              }}
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">

                {/* Modal header */}
                <div className="sticky top-0 bg-white z-10">
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">
                        {analyzing ? "Analyzing…" : "Your ICP Preview"}
                      </p>
                      {result && (
                        <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate max-w-[220px] sm:max-w-none">{result.company_name}</p>
                      )}
                    </div>
                    {!analyzing && (
                      <button
                        onClick={() => setModalOpen(false)}
                        className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="h-px" style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }} />
                </div>

                {/* Modal body */}
                <div className="p-6">

                  {/* Loading state */}
                  {analyzing && (
                    <div className="flex flex-col items-center justify-center py-16 gap-6">
                      <div className="relative">
                        <div
                          className="size-16 rounded-2xl flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
                        >
                          <svg className="size-8 text-[#4B6BF5] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                        </div>
                        <div
                          className="absolute inset-0 rounded-2xl border-2 border-transparent animate-spin"
                          style={{ borderTopColor: "#4B6BF5", borderRightColor: "#7B4BF5", animationDuration: "1.2s" }}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="font-semibold text-gray-900">Finding your buyers</p>
                        <p className="text-sm text-gray-400 max-w-xs">
                          Our AI agent is reading your site and identifying your ideal customer profile…
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="size-2 rounded-full animate-bounce"
                            style={{
                              background: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Results state */}
                  {!analyzing && result && (
                    <div className="space-y-4">

                      {/* Company summary */}
                      <div className="rounded-xl p-[1px] shadow-md" style={{ background: "linear-gradient(135deg, #4B6BF5, #7B4BF5)" }}>
                        <div className="rounded-[11px] bg-white p-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-2">
                                <svg className="size-3.5 text-[#4B6BF5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Company</p>
                              </div>
                              <p className="font-bold text-gray-900">{result.company_name}</p>
                              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2" title={result.what_they_sell}>{result.what_they_sell}</p>
                            </div>
                            {result.tagline && (
                              <span
                                className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-[11px] leading-none font-medium text-[#4B6BF5] bg-[#EEF1FE] border border-[#4B6BF5]/20 max-w-[180px] cursor-default"
                                title={result.tagline}
                              >
                                <span className="truncate">&ldquo;{result.tagline}&rdquo;</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ICP */}
                      <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="h-1" style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }} />
                        <div className="p-4">
                          <div className="flex items-center gap-1.5 mb-3">
                            <svg className="size-3.5 text-[#4B6BF5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
                              Ideal Customer Profile
                            </p>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <svg className="size-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                                </svg>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Company Type</p>
                              </div>
                              <p className="text-gray-700 text-sm leading-relaxed" title={result.ideal_customer_profile.company_type}>
                                {result.ideal_customer_profile.company_type}
                              </p>
                            </div>
                            <div className="flex gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <svg className="size-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Size</p>
                                </div>
                                <p className="text-gray-700 text-sm">{result.ideal_customer_profile.company_size}</p>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <svg className="size-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Industries</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {result.ideal_customer_profile.industries.map((ind) => (
                                    <span
                                      key={ind}
                                      title={ind}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-[11px] leading-none font-medium bg-gray-100 text-gray-600 max-w-[160px] cursor-default"
                                    >
                                      <span className="truncate">{ind}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Target titles */}
                      <div className="rounded-xl border border-gray-100 p-4 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-1.5 mb-3">
                          <svg className="size-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
                            Target Titles
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.target_titles.map((title, i) => (
                            <span
                              key={title}
                              title={title}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] leading-none font-semibold max-w-[220px] cursor-default shrink-0 ${
                                i === 0 ? "text-white" : "bg-gray-100 text-gray-700"
                              }`}
                              style={i === 0 ? { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" } : {}}
                            >
                              {i === 0 && (
                                <svg className="size-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                              <span className="truncate">{title}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Campaign angles */}
                      <div className="rounded-xl border border-gray-100 p-4 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-1.5 mb-3">
                          <svg className="size-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
                            Campaign Angles
                          </p>
                        </div>
                        <div className="space-y-2">
                          {result.campaign_angles.map((angle, i) => (
                            <div
                              key={angle.angle}
                              className={`p-4 rounded-xl border overflow-hidden shadow-sm ${
                                i === 0
                                  ? "border-[#4B6BF5]/25 bg-gradient-to-br from-[#EEF1FE]/70 to-[#F0EBFE]/50"
                                  : "border-gray-100 bg-gray-50/50"
                              }`}
                            >
                              <div className="flex items-start gap-2 mb-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-900 min-w-0 break-words">{angle.angle}</p>
                                {i === 0 && (
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                                    style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                                  >
                                    Best fit
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mb-2 line-clamp-3" title={angle.pitch}>{angle.pitch}</p>
                              {angle.why_now && (
                                <p className="text-[10px] text-gray-400 mb-2 italic line-clamp-2" title={angle.why_now}>
                                  Why now: {angle.why_now}
                                </p>
                              )}
                              {angle.hook && (
                                <div className="bg-[#F8F9FF] border border-[#4B6BF5]/10 rounded-lg px-3 py-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                                    Opening hook
                                  </p>
                                  <p className="text-xs text-gray-700 leading-relaxed italic line-clamp-3" title={angle.hook}>
                                    &ldquo;{angle.hook}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Blurred contacts teaser */}
                      <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        {/* Section header */}
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">Contacts Found</p>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            250M+ contacts in database
                          </span>
                        </div>

                        {/* Relative wrapper for blur + overlay */}
                        <div className="relative">
                          {/* Blurred table */}
                          <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-100 bg-gray-50/40">
                                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Name</th>
                                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Title</th>
                                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Company</th>
                                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Location</th>
                                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Email</th>
                                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Phone</th>
                                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">LinkedIn</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {(() => {
                                    const titles = result.target_titles?.length
                                      ? result.target_titles
                                      : ["VP of Marketing", "Director of Sales", "Head of Growth", "Chief Revenue Officer", "VP of People"]
                                    return [
                                      { name: "Sarah Mitchell",  company: "Maple Systems",    location: "Toronto, CA",       email: "s.mitchell@maple.io",     phone: "+1 (416) 555-0182", linkedin: "linkedin.com/in/sarah-m" },
                                      { name: "James Okafor",    company: "Nexus Corp",       location: "Boston, US",        email: "j.okafor@nexuscorp.com",  phone: "+1 (617) 555-0347", linkedin: "linkedin.com/in/james-o" },
                                      { name: "Priya Sharma",    company: "Brightwave Inc",   location: "San Francisco, US", email: "p.sharma@brightwave.io",  phone: "+1 (415) 555-0093", linkedin: "linkedin.com/in/priya-s" },
                                      { name: "Marcus Chen",     company: "Portfield",        location: "New York, US",      email: "m.chen@portfield.com",    phone: "+1 (212) 555-0461", linkedin: "linkedin.com/in/marcus-c" },
                                      { name: "Olivia Brooks",   company: "Clarion Software", location: "Austin, US",        email: "o.brooks@clarion.io",     phone: "+1 (737) 555-0258", linkedin: "linkedin.com/in/olivia-b" },
                                    ].map((row, i) => ({ ...row, title: titles[i % titles.length] }))
                                  })().map((row) => (
                                    <tr key={row.name} className="hover:bg-gray-50/50">
                                      <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <div className="size-7 rounded-full bg-[#EEF1FE] text-[#4B6BF5] flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {row.name.split(" ").map((n) => n[0]).join("")}
                                          </div>
                                          {row.name}
                                        </div>
                                      </td>
                                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.title}</td>
                                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap hidden sm:table-cell">{row.company}</td>
                                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap hidden sm:table-cell">{row.location}</td>
                                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{row.email}</td>
                                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap hidden sm:table-cell">{row.phone}</td>
                                      <td className="px-3 py-3 text-[#0A66C2] whitespace-nowrap">{row.linkedin}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Lock overlay */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
                            <div
                              className="size-11 rounded-2xl flex items-center justify-center shadow-sm"
                              style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
                            >
                              <svg className="size-5 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-gray-900 text-sm">Your buyers are in here</p>
                              <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                                Sign up free to unlock contact names, emails, LinkedIn, and phone numbers
                              </p>
                            </div>
                            <Link
                              href="/signup"
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
                              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                            >
                              See your leads →
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Inline CTA */}
                      <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Your leads are ready</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Sign up to unlock contact info for these decision makers.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Link
                            href="/signup"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity active:scale-[0.98]"
                            style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                          >
                            Sign up free →
                          </Link>
                          <Link
                            href="/login"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-colors active:scale-[0.98]"
                          >
                            Log in
                          </Link>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="py-6 flex items-center justify-center">
          <p className="text-xs text-gray-400">
            A product of Good Vibes AI
          </p>
        </footer>

      </div>
    </>
  )
}
