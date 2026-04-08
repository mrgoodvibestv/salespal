"use client"

import { useState } from "react"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"

interface Touch {
  day: number
  channel?: "email" | "linkedin"
  type?: string
  subject?: string | null
  body: string
  tone?: "intro" | "followup" | "breakup"
}

interface CampaignSequence {
  campaign_id: string
  campaign_name: string
  angle_selected: string
  emails: unknown[]
}

const TONE_CONFIG: Record<string, { label: string; className: string }> = {
  intro:    { label: "Intro",     className: "bg-blue-50 text-blue-600 border border-blue-100" },
  followup: { label: "Follow-up", className: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  breakup:  { label: "Breakup",   className: "bg-red-50 text-red-600 border border-red-100" },
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
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
      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      Email
    </span>
  )
}

function TouchCard({ touch, idx }: { touch: Touch; idx: number }) {
  const [copied, setCopied] = useState(false)
  const tone = TONE_CONFIG[touch.tone ?? "intro"] ?? TONE_CONFIG.intro
  const isLinkedIn = touch.channel === "linkedin"
  const isConnectionRequest = touch.type === "connection_request" || (isLinkedIn && touch.day === 1)

  function copy() {
    const text = touch.subject ? `Subject: ${touch.subject}\n\n${touch.body}` : touch.body
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div key={idx} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
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
          onClick={copy}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            copied
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
          }`}
        >
          {copied ? (
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
        {!isLinkedIn && touch.subject && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Subject</p>
            <p className="text-sm font-semibold text-black">{touch.subject}</p>
          </div>
        )}
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
}

export default function SequencesContent({
  sequences,
  credits,
  userEmail,
}: {
  sequences: CampaignSequence[]
  credits: number
  userEmail: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    sequences.length > 0 ? sequences[0].campaign_id : null
  )
  const [sequenceMap, setSequenceMap] = useState<Record<string, Touch[]>>(
    Object.fromEntries(sequences.map((s) => [s.campaign_id, s.emails as Touch[]]))
  )
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState("")

  const selectedSeq = sequences.find((s) => s.campaign_id === selectedId) ?? null
  const touches = selectedId ? (sequenceMap[selectedId] ?? []) : []

  async function handleRegenerate() {
    if (!selectedId) return
    setRegenerating(true)
    setRegenError("")
    try {
      const res = await fetch(`/api/campaigns/${selectedId}/sequences`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setRegenError(
          data.error === "AI_OVERLOADED"
            ? "AI is experiencing high demand. Try again in a moment."
            : (data.error ?? "Failed to regenerate")
        )
        return
      }
      setSequenceMap((prev) => ({ ...prev, [selectedId]: data.emails ?? [] }))
    } catch {
      setRegenError("Something went wrong.")
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white overflow-x-hidden">
      <Sidebar credits={credits} userEmail={userEmail} />

      <main className="flex-1 min-w-0 ml-0 md:ml-64 pt-[88px] md:pt-0 flex flex-col">

        {/* Page header — above the split panel */}
        <div className="px-6 md:px-8 pt-8 pb-4 border-b border-gray-100 shrink-0">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1">
            Outreach
          </p>
          <h1 className="text-2xl font-bold text-black">Sequences</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Your saved outreach sequences across all campaigns
          </p>
        </div>

        {/* No sequences at all */}
        {sequences.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 py-24 text-center space-y-4">
            <div
              className="size-14 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #EEF1FE, #F0EBFE)" }}
            >
              <svg className="size-7 text-[#4B6BF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-black">No sequences yet</h2>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                Open a campaign and generate a sequence from the Sequences tab.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            >
              Go to Campaigns
            </Link>
          </div>
        )}

        {/* Split panel */}
        {sequences.length > 0 && (
          <div className="flex flex-1 min-h-0 h-[calc(100vh-160px)]">

            {/* ── Left panel ── */}
            <div className="w-64 shrink-0 border-r border-gray-100 overflow-y-auto">
              <div className="px-4 pt-4 pb-2">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
                  Campaigns
                </p>
              </div>
              <div className="space-y-0.5 pb-4">
                {sequences.map((seq) => {
                  const isActive = seq.campaign_id === selectedId
                  const touchCount = (sequenceMap[seq.campaign_id] ?? []).length
                  return (
                    <button
                      key={seq.campaign_id}
                      onClick={() => setSelectedId(seq.campaign_id)}
                      className={`w-full text-left px-4 py-3 transition-colors relative ${
                        isActive ? "bg-purple-50/50" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Active left border */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                          style={{ background: "linear-gradient(to bottom, #4B6BF5, #7B4BF5)" }}
                        />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isActive ? "text-[#4B6BF5]" : "text-black"}`}>
                            {seq.campaign_name}
                          </p>
                          {seq.angle_selected && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{seq.angle_selected}</p>
                          )}
                        </div>
                        <span className="shrink-0 inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 whitespace-nowrap">
                          {touchCount} touches
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {!selectedSeq ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <svg className="size-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-400">Select a campaign to view its sequence</p>
                </div>
              ) : (
                <div className="p-6">
                  {/* Right panel header */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-black truncate">{selectedSeq.campaign_name}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {selectedSeq.angle_selected && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs text-gray-500 bg-gray-100">
                            {selectedSeq.angle_selected}
                          </span>
                        )}
                        <Link
                          href={`/dashboard/campaigns/${selectedSeq.campaign_id}`}
                          className="text-xs text-[#4B6BF5] hover:underline"
                        >
                          View campaign →
                        </Link>
                      </div>
                    </div>
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 transition-all disabled:opacity-50"
                    >
                      {regenerating ? (
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

                  {regenError && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                      {regenError}
                    </div>
                  )}

                  {/* Touch cards */}
                  <div className="space-y-3">
                    {touches.map((touch, idx) => (
                      <TouchCard key={idx} touch={touch} idx={idx} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
