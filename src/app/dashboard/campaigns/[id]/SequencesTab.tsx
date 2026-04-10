"use client"

import { useState } from "react"

interface Touch {
  day: number
  channel?: "email" | "linkedin"
  type?: string
  subject: string | null
  body: string
  tone: "intro" | "followup" | "breakup"
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-md ${className ?? ""}`} />
}

const TONE_CONFIG: Record<string, { label: string; className: string }> = {
  intro:    { label: "Intro",      className: "bg-blue-50 text-blue-600 border border-blue-100" },
  followup: { label: "Follow-up",  className: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  breakup:  { label: "Breakup",    className: "bg-red-50 text-red-600 border border-red-100" },
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function ChannelBadge({ channel }: { channel?: "email" | "linkedin" }) {
  if (channel === "linkedin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
        <LinkedInIcon className="size-3" />
        LinkedIn
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      <EmailIcon className="size-3" />
      Email
    </span>
  )
}

export default function SequencesTab({
  campaignId,
  initialSequence,
}: {
  campaignId: string
  initialSequence: Touch[] | null
}) {
  const [emails, setEmails]         = useState<Touch[] | null>(initialSequence)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState("")
  const [copiedIdx, setCopiedIdx]   = useState<number | null>(null)

  async function generate() {
    setGenerating(true)
    setError("")
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/sequences`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(
          data.error === "AI_OVERLOADED"
            ? "Our AI is experiencing high demand. Try again in a moment."
            : (data.error ?? "Failed to generate sequence")
        )
        return
      }
      setEmails(data.emails ?? [])
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  function copyTouch(touch: Touch, idx: number) {
    const text = touch.subject
      ? `Subject: ${touch.subject}\n\n${touch.body}`
      : touch.body
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  if (!emails && generating) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400 font-medium mb-4">Writing your sequence...</p>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Card header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-6 w-14 rounded-lg" />
            </div>
            {/* Card body */}
            <div className="px-4 py-3 space-y-3">
              {i !== 0 && i !== 2 && (
                <div className="space-y-1.5">
                  <Skeleton className="h-2 w-14" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}
              <div className="space-y-1.5">
                <Skeleton className="h-2 w-10" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/5" />
                {i !== 0 && i !== 2 && (
                  <Skeleton className="h-3 w-2/3" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!emails) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
        <div
          className="size-14 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
        >
          <svg className="size-7 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-black">No sequence yet</h3>
          <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
            Generate a 5-touch multi-channel sequence — LinkedIn + email — tailored to your campaign.
          </p>
        </div>
        {error && <p className="text-sm text-red-500 max-w-sm">{error}</p>}
        <button
          onClick={generate}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate Sequence
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-black">Multi-Channel Outreach Sequence</p>
          <p className="text-xs text-gray-400 mt-0.5">5 touches · LinkedIn + Email · Day 1 through 14</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          {generating ? (
            <>
              <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Regenerating…
            </>
          ) : (
            <>
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Touch cards */}
      <div className="space-y-3">
        {emails.map((touch, idx) => {
          const tone = TONE_CONFIG[touch.tone] ?? TONE_CONFIG.intro
          const isCopied = copiedIdx === idx
          const isLinkedIn = touch.channel === "linkedin"
          const isConnectionRequest = touch.type === "connection_request" || (isLinkedIn && touch.day === 1)

          return (
            <div key={idx} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                  >
                    Day {touch.day}
                  </span>
                  <ChannelBadge channel={touch.channel} />
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tone.className}`}>
                    {tone.label}
                  </span>
                </div>
                <button
                  onClick={() => copyTouch(touch, idx)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCopied
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="px-4 py-3 space-y-2.5">
                {/* Subject — email only */}
                {!isLinkedIn && touch.subject && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Subject</p>
                    <p className="text-sm font-semibold text-black">{touch.subject}</p>
                  </div>
                )}

                {/* Body */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    {isLinkedIn ? (isConnectionRequest ? "Connection Note" : "Message") : "Body"}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{touch.body}</p>
                  {isConnectionRequest && (
                    <p className={`text-xs mt-1.5 tabular-nums ${touch.body.length > 300 ? "text-red-500 font-medium" : "text-gray-400"}`}>
                      {touch.body.length}/300 characters
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
