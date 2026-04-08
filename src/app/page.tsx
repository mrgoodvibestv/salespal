"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ── Ticker data ──────────────────────────────────────────────────────────────
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

// ── Pricing data ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Starter",
    price: "$50",
    credits: "100 credits",
    features: [
      "10 prospect fetches",
      "10 email unlocks",
      "All geographies",
      "AI campaign angles",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Growth",
    price: "$200",
    credits: "500 credits",
    features: [
      "50 prospect fetches",
      "50 email unlocks",
      "All geographies",
      "AI campaign angles",
      "Priority support",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Pro",
    price: "$600",
    credits: "2,000 credits",
    features: [
      "200 prospect fetches",
      "200 email unlocks",
      "All geographies",
      "AI campaign angles",
      "Priority support",
      "Sequences (coming soon)",
    ],
    cta: "Get Started",
    popular: false,
  },
]

// ── Steps data ────────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: "01",
    icon: "🌐",
    title: "Paste your URL",
    desc: "Drop in your website. SalesPal reads your product, pricing, and who should be buying it.",
  },
  {
    num: "02",
    icon: "🎯",
    title: "We find your ICP",
    desc: "AI extracts your ideal customer profile and identifies two outbound campaign angles.",
  },
  {
    num: "03",
    icon: "👥",
    title: "Decision makers surface",
    desc: "We surface VP-level and Director-level contacts at companies that match your ICP.",
  },
  {
    num: "04",
    icon: "📧",
    title: "Unlock and outreach",
    desc: "Unlock verified emails and phone numbers. Sequences coming soon.",
  },
]

// ── Mock leads for hero visual ────────────────────────────────────────────────
const MOCK_LEADS = [
  { name: "Sarah Chen", title: "VP People", company: "Shopify" },
  { name: "Marcus Webb", title: "Director HR", company: "CIBC" },
  { name: "Anna Kovacs", title: "Chief People Officer", company: "Manulife" },
]

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      setError("Please enter your website URL.")
      return
    }
    const normalized =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`
    try {
      new URL(normalized)
    } catch {
      setError("Please enter a valid website URL (e.g. yourcompany.com).")
      return
    }
    router.push(`/signup?url=${encodeURIComponent(normalized)}`)
  }

  return (
    <>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>

      <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">

        {/* ── Section 1: Live Ticker ── */}
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

        {/* ── Section 2: Nav ── */}
        <header className="border-b border-gray-100 px-6 md:px-12 py-5 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-black transition-colors"
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

        {/* ── Section 3: Hero ── */}
        <section className="px-6 md:px-12 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* Left column — 55% */}
              <div className="flex-1 lg:max-w-[55%] space-y-6">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-500 bg-gray-50">
                  <span
                    className="size-1.5 rounded-full inline-block shrink-0"
                    style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                  />
                  AI-Powered B2B Outreach
                </div>

                {/* Headline */}
                <div className="space-y-2">
                  <h1 className="text-6xl sm:text-7xl font-bold tracking-tight leading-[1.05] text-black">
                    Paste your website.
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                    >
                      Find your buyers.
                    </span>
                  </h1>
                  <p className="text-lg text-gray-500 max-w-sm leading-relaxed pt-2">
                    SalesPal finds your best campaign angle,
                    surfaces qualified leads, and writes your outreach — in minutes.
                  </p>
                </div>

                {/* URL form */}
                <form onSubmit={handleSubmit} className="space-y-3 mt-8">
                  <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setError("") }}
                      placeholder="yourcompany.com"
                      className="flex-1 px-5 py-4 rounded-xl border border-gray-200 text-base outline-none focus:border-[#4B6BF5] focus:ring-2 focus:ring-[#4B6BF5]/10 transition-all placeholder:text-gray-400 shadow-sm"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-7 py-4 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] whitespace-nowrap shadow-sm"
                      style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                    >
                      Analyze my website →
                    </button>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </form>

                {/* Trust signals */}
                <p className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span>✓ No credit card required</span>
                  <span>✓ 10 free leads</span>
                  <span>✓ 2 min setup</span>
                </p>

                {/* Channel badges */}
                <div className="flex items-center gap-2 flex-wrap">
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

                {/* Fallback */}
                <div>
                  <Link
                    href="/signup?manual=true"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-black transition-colors group"
                  >
                    Tell us about your business instead
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </Link>
                </div>
              </div>

              {/* Right column — 45% — hidden below lg */}
              <div className="hidden lg:block lg:max-w-[45%] w-full">
                <div className="bg-gray-950 rounded-2xl p-6 shadow-2xl">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                      3 decision makers found
                    </p>
                    <span
                      className="text-[10px] font-semibold px-2 py-1 rounded-full text-white"
                      style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                    >
                      Preview ready
                    </span>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 px-3 pb-2 border-b border-gray-800">
                    {["Name", "Title", "Company", "Tier"].map((h) => (
                      <p key={h} className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</p>
                    ))}
                  </div>

                  {/* Lead rows */}
                  <div className="divide-y divide-gray-800/60">
                    {MOCK_LEADS.map((lead) => (
                      <div key={lead.name} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center px-3 py-3.5">
                        <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                        <p className="text-xs text-gray-400 truncate">{lead.title}</p>
                        <p className="text-xs text-gray-400 truncate">{lead.company}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-900/60 text-green-400 whitespace-nowrap">
                          Decision Maker
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Card footer */}
                  <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                    <p className="text-[11px] text-gray-500">Unlock emails for 2 credits per contact</p>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`size-1.5 rounded-full ${i === 0 ? "" : "bg-gray-700"}`}
                          style={i === 0 ? { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" } : {}}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Section 4: How It Works ── */}
        <section className="relative overflow-hidden bg-white px-6 md:px-12 py-24">
          {/* Purple orb background accent */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.06] blur-3xl pointer-events-none"
            style={{ background: "linear-gradient(135deg, #4B6BF5, #7B4BF5)" }}
          />

          <div className="relative max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
                How It Works
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-black">
                From website to warm lead in 60 seconds
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {STEPS.map((step, i) => (
                <div key={step.num} className="relative">
                  {/* Connector arrow — desktop only */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(100%+0px)] w-5 text-gray-300 text-xs z-10 text-center">
                      →
                    </div>
                  )}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 h-full space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-300 tabular-nums">{step.num}</span>
                      <span className="text-2xl">{step.icon}</span>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-black text-sm">{step.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 5: Pricing ── */}
        <section className="px-6 md:px-12 py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">
                Pricing
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-black">
                Buy credits, use them as you need.
              </h2>
              <p className="text-gray-500 mt-2 text-sm">No subscriptions. No lock-in. Buy when you need it.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-7 flex flex-col ${
                    plan.popular
                      ? "border-2 border-[#4B6BF5] shadow-lg bg-white"
                      : "border border-gray-200 shadow-sm bg-white"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className="text-[10px] font-semibold tracking-wider uppercase text-white px-3 py-1 rounded-full"
                        style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                      >
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-500 mb-1">{plan.name}</p>
                    <p className="text-4xl font-bold text-black">{plan.price}</p>
                    <p className="text-xs text-gray-400 mt-1">{plan.credits}</p>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="size-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none">
                          <path d="M7 10l2 2 4-4" stroke="#4B6BF5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="10" cy="10" r="8" stroke="#4B6BF5" strokeWidth="1.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={`w-full flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] ${
                      plan.popular ? "text-white" : "text-gray-700 border border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                    style={plan.popular ? { background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" } : {}}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 6: CTA Strip ── */}
        <section className="relative overflow-hidden border-t border-gray-100 px-6 md:px-12 py-20 text-center bg-white">
          {/* Purple orb background accent */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
            style={{ background: "linear-gradient(135deg, #4B6BF5, #7B4BF5)" }}
          />

          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-black leading-tight">
              Your next customer is already out there.
            </h2>
            <p className="text-gray-500 text-lg">
              SalesPal finds them before your competitors do. Start with 10 free decision makers.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            >
              Find My Buyers →
            </Link>
          </div>
        </section>

        {/* ── Section 7: Footer ── */}
        <footer className="border-t border-gray-100 px-6 md:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-xs text-gray-400">© 2026 Good Vibes Enterprises</span>
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
