"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-6">
        <Logo />
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-black transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        <div className="max-w-2xl w-full mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-500 bg-gray-50">
            <span
              className="size-1.5 rounded-full inline-block"
              style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}
            />
            AI-powered B2B prospecting
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] text-black">
              Ready to get
              <br />
              more sales?
            </h1>
            <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
              Enter your website. SalesPal finds your best campaign angle,
              surfaces qualified leads, and writes your outreach — in minutes.
            </p>
          </div>

          {/* URL input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError("")
                }}
                placeholder="yourcompany.com"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#4B6BF5] focus:ring-2 focus:ring-[#4B6BF5]/10 transition-all placeholder:text-gray-400"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
                style={{
                  background: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
                }}
              >
                Analyze my website →
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Fallback */}
          <div>
            <Link
              href="/signup?manual=true"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors group"
            >
              Tell us about your business
              <span className="group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </Link>
            <p className="mt-1 text-xs text-gray-400">
              For gated sites or if you&apos;d rather fill in the details yourself
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 sm:px-6 md:px-8 py-6 text-center">
        <p className="text-xs text-gray-400">
          Business email required to sign up.{" "}
          <Link
            href="/login"
            className="hover:text-gray-600 transition-colors"
          >
            Already have an account?
          </Link>
        </p>
      </footer>
    </div>
  )
}

function Logo() {
  return (
    <span className="text-xl font-bold tracking-tight select-none">
      <span className="text-black">Sales</span>
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
        }}
      >
        Pal
      </span>
    </span>
  )
}
