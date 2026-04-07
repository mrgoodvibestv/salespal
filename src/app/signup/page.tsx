"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { validateBusinessEmail } from "@/lib/supabase/email-validation"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("url") ?? ""

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [formError, setFormError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function handleEmailBlur() {
    if (!email) return
    const result = validateBusinessEmail(email)
    if (!result.valid) setEmailError(result.reason)
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    setEmailError("")
    setFormError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    // Client-side business email gate
    const validation = validateBusinessEmail(email)
    if (!validation.valid) {
      setEmailError(validation.reason)
      return
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${
          redirectUrl ? `?next=/dashboard` : ""
        }`,
        data: {
          domain: email.split("@")[1],
        },
      },
    })

    setLoading(false)

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setFormError("An account with this email already exists. Log in instead.")
      } else {
        setFormError(error.message)
      }
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <CenteredShell>
        <div className="text-center space-y-3">
          <div className="size-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <svg className="size-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-black">Check your email</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            We sent a confirmation link to{" "}
            <span className="font-medium text-black">{email}</span>. Click it to
            activate your account.
          </p>
          <p className="text-xs text-gray-400 pt-2">
            Wrong address?{" "}
            <button
              onClick={() => setSuccess(false)}
              className="underline hover:text-black transition-colors"
            >
              Go back
            </button>
          </p>
        </div>
      </CenteredShell>
    )
  }

  return (
    <CenteredShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <Logo />
          <h1 className="text-2xl font-bold text-black pt-4">
            Create your account
          </h1>
          <p className="text-sm text-gray-500">
            Start finding leads in minutes
          </p>
        </div>

        {/* Business email notice */}
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-blue-50 border border-blue-100">
          <svg className="size-4 text-brand-blue mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-semibold">Business email required.</span>{" "}
            Gmail, Yahoo, Outlook, and other free providers are not accepted.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-black" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="you@yourcompany.com"
              required
              autoComplete="email"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all placeholder:text-gray-400 ${
                emailError
                  ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-400/10"
                  : "border-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
              }`}
            />
            {emailError && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {emailError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-black" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setFormError("")
              }}
              placeholder="Min. 8 characters"
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all placeholder:text-gray-400"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-500 text-center">{formError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(to right, #4B6BF5, #7B4BF5)",
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-black hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </CenteredShell>
  )
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

function Logo() {
  return (
    <Link href="/" className="inline-block">
      <span className="text-xl font-bold tracking-tight">
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
    </Link>
  )
}
