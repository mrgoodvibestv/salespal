"use client"

import { useState } from "react"

interface Email {
  day: number
  subject: string
  body: string
  tone: "intro" | "followup" | "breakup"
}

const TONE_CONFIG: Record<string, { label: string; className: string }> = {
  intro:     { label: "Intro",       className: "bg-blue-50 text-blue-600 border border-blue-100" },
  followup:  { label: "Follow-up",   className: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  breakup:   { label: "Breakup",     className: "bg-red-50 text-red-600 border border-red-100" },
}

const DAY_LABELS: Record<number, string> = {
  1: "Day 1",
  4: "Day 4",
  9: "Day 9",
}

export default function SequencesTab({
  campaignId,
  initialSequence,
}: {
  campaignId: string
  initialSequence: Email[] | null
}) {
  const [emails, setEmails]     = useState<Email[] | null>(initialSequence)
  const [generating, setGenerating] = useState(false)
  const [error, setError]       = useState("")
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  async function generate() {
    setGenerating(true)
    setError("")
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/sequences`, {
        method: "POST",
      })
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

  function copyEmail(email: Email, idx: number) {
    const text = `Subject: ${email.subject}\n\n${email.body}`
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
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
            Generate a 3-email cold outreach sequence tailored to your campaign angle and leads.
          </p>
        </div>
        {error && <p className="text-sm text-red-500 max-w-sm">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
        >
          {generating ? (
            <>
              <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Writing your sequence…
            </>
          ) : (
            <>
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Sequence
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-black">Cold Outreach Sequence</p>
          <p className="text-xs text-gray-400 mt-0.5">3 emails · Day 1, 4, and 9</p>
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

      {/* Email cards */}
      <div className="space-y-4">
        {emails.map((email, idx) => {
          const tone = TONE_CONFIG[email.tone] ?? TONE_CONFIG.intro
          const dayLabel = DAY_LABELS[email.day] ?? `Day ${email.day}`
          const isCopied = copiedIdx === idx

          return (
            <div key={idx} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
                  >
                    {dayLabel}
                  </span>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${tone.className}`}>
                    {tone.label}
                  </span>
                </div>
                <button
                  onClick={() => copyEmail(email, idx)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCopied
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy email
                    </>
                  )}
                </button>
              </div>

              {/* Subject */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Subject</p>
                <p className="text-sm font-semibold text-black">{email.subject}</p>
              </div>

              {/* Body */}
              <div className="px-5 pb-5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Body</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{email.body}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
