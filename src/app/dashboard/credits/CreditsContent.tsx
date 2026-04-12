"use client"

import { useState } from "react"

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    credits: 100,
    price: "$49",
    priceEnvKey: "STARTER",
    features: [
      "10 lead fetches",
      "50 contact unlocks",
      "10 prospect searches",
    ],
    featured: false,
    badge: null,
  },
  {
    id: "growth",
    name: "Growth",
    credits: 400,
    price: "$149",
    priceEnvKey: "GROWTH",
    features: [
      "40 lead fetches",
      "200 contact unlocks",
      "40 prospect searches",
      "2 sequence regenerations",
    ],
    featured: true,
    badge: "Most Popular",
  },
  {
    id: "scale",
    name: "Scale",
    credits: 1000,
    price: "$299",
    priceEnvKey: "SCALE",
    features: [
      "100 lead fetches",
      "500 contact unlocks",
      "100 prospect searches",
    ],
    featured: false,
    badge: "Best Value",
  },
]

export default function CreditsContent({
  credits,
  priceIds,
  success,
  cancelled,
}: {
  credits: number
  priceIds: { starter: string; growth: string; scale: string }
  success: boolean
  cancelled: boolean
}) {
  const [loading, setLoading]           = useState<string | null>(null)
  const [successDismissed, setSuccessDismissed] = useState(false)
  const [cancelledDismissed, setCancelledDismissed] = useState(false)

  async function handlePurchase(priceId: string, planId: string) {
    setLoading(planId)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // noop — stay on page
    }
    setLoading(null)
  }

  const anyLoading = loading !== null

  return (
    <div className="space-y-8">
      {/* Title row */}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-400 mb-1">
          Account
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Buy Credits
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Credits never expire. Use them across campaigns, prospect search, and contact unlocks.
        </p>
      </div>

      {/* Success banner */}
      {success && !successDismissed && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-2.5">
            <svg className="size-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-emerald-700">
              Credits added to your account! Your balance has been updated.
            </p>
          </div>
          <button
            onClick={() => setSuccessDismissed(true)}
            className="text-emerald-500 hover:text-emerald-700 shrink-0"
            aria-label="Dismiss"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Cancelled notice */}
      {cancelled && !cancelledDismissed && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-500">
            Purchase cancelled. Your credits were not charged.
          </p>
          <button
            onClick={() => setCancelledDismissed(true)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Dismiss"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Current balance card */}
      <div className="inline-flex flex-col items-start gap-0.5 px-5 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <p className="text-xs text-gray-400 font-medium">Your current balance</p>
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-bold tabular-nums bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
          >
            {credits.toLocaleString()}
          </span>
          <span className="text-sm text-gray-400">credits available</span>
        </div>
      </div>

      {/* Pricing grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const priceId = priceIds[plan.id as keyof typeof priceIds]
          const isLoading = loading === plan.id

          const cardContent = (
            <div className={`flex flex-col h-full p-6 ${plan.featured ? "rounded-[11px] bg-white" : ""}`}>
              {/* Plan name + badge */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-lg font-bold text-gray-900">{plan.name}</p>
                {plan.badge && (
                  plan.featured ? (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                    >
                      {plan.badge}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {plan.badge}
                    </span>
                  )
                )}
              </div>

              {/* Credits */}
              <p
                className="text-3xl font-bold tabular-nums bg-clip-text text-transparent mb-1"
                style={{ backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
              >
                {plan.credits.toLocaleString()}
                <span className="text-base font-semibold text-gray-400 ml-1">credits</span>
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-xs text-gray-400">one-time</span>
              </div>

              {/* Feature list */}
              <div className="flex-1 mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  What you can do
                </p>
                <ul className="space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-500">
                      <svg className="size-3.5 text-[#4B6BF5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Buy button */}
              <button
                onClick={() => handlePurchase(priceId, plan.id)}
                disabled={anyLoading}
                className="btn-press inline-flex items-center justify-center gap-2 w-full px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
              >
                {isLoading ? (
                  <>
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Buy ${plan.name}`
                )}
              </button>
            </div>
          )

          if (plan.featured) {
            return (
              <div
                key={plan.id}
                className="card-lift rounded-xl p-[1px] shadow-md"
                style={{ background: "linear-gradient(135deg, #4B6BF5, #7B4BF5)" }}
              >
                {cardContent}
              </div>
            )
          }

          return (
            <div
              key={plan.id}
              className="card-lift flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              {cardContent}
            </div>
          )
        })}
      </div>

      {/* Bottom note */}
      <p className="text-xs text-gray-400 text-center">
        Credits are non-refundable. Questions?{" "}
        <a href="mailto:support@goodvibesai.com" className="underline hover:text-gray-600">
          Contact us at support@goodvibesai.com
        </a>
      </p>
    </div>
  )
}
