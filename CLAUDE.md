# SalesPal — Engineering Reference
**Good Vibes AI · v4.1 · April 2026**

---

## Project Overview

SalesPal is an AI-powered B2B outbound prospecting engine. Paste a website URL → AI identifies the best campaign angle → surface qualified leads with names/titles → generate personalized outreach sequences → export CSV.

**Live URL:** https://sp.goodvibesai.com  
**Vercel project:** prj_DAL6rlLkL5Gy2gRXYfUHhyTwSF9N  
**GitHub:** mrgoodvibestv/salespal (auto-deploys from `main`)  
**Supabase project:** `kmswswolwnbdzjhupmlv` · us-west-2 · ACTIVE_HEALTHY

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Backend/Auth/DB | Supabase (postgres + auth + RLS) |
| AI | Anthropic Claude API |
| Data | Explorium API |
| Payments | Stripe (one-time checkout sessions) |
| Hosting | Vercel |
| Analytics | @vercel/analytics, @vercel/speed-insights |

---

## Key Dependencies (package.json)

```json
"@anthropic-ai/sdk": "^0.82.0"
"@supabase/ssr": "^0.10.0"
"@supabase/supabase-js": "^2.101.1"
"@vercel/analytics": "^2.0.1"
"@vercel/speed-insights": "^2.0.0"
"next": "14.2.35"
"stripe": "^22.0.1"
"tailwind-merge": "^3.5.0"
"lucide-react": "^1.7.0"
```

---

## Environment Variables

All must be set in `.env.local` and Vercel project settings.

| Variable | Used in | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server + middleware | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server + middleware | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | webhook route only | Server only, bypasses RLS |
| `ANTHROPIC_API_KEY` | all AI routes | Server only |
| `EXPLORIUM_API_KEY` | leads + search + unlock routes | Server only |
| `STRIPE_SECRET_KEY` | checkout + webhook routes | Server only |
| `STRIPE_WEBHOOK_SECRET` | webhook route | Server only — Stripe dashboard |
| `STRIPE_PRICE_STARTER` | checkout + credits page | Server only — Stripe price ID |
| `STRIPE_PRICE_GROWTH` | checkout + credits page | Server only — Stripe price ID |
| `STRIPE_PRICE_SCALE` | checkout + credits page | Server only — Stripe price ID |

**Important:** `STRIPE_PRICE_*` are server-only (no `NEXT_PUBLIC_` prefix). Pass as props from server page to client component — never access in client code via `process.env`.

---

## Database Schema

All migrations in `supabase/migrations/`. Applied in order 001–006.

### Enums

```sql
campaign_status: draft | extracting_icp | angle_selected | fetching_companies | preview_ready | active | exported | archived
contact_tier:    decision_maker | influencer | noise
outreach_channel: email | linkedin | call
export_type:     csv | pdf
credit_action:   trial_grant | pack_purchase | company_fetch | contact_unlock | outreach_generation | refund | sequence_regeneration
```

**Note:** `sequence_regeneration` was added via migration 006. Must be applied to DB before sequence regen works.

### users
```sql
id              uuid PK (references auth.users)
email           text unique not null
domain          text not null
email_verified  boolean default false
credits_balance integer >= 0, default 0
created_at      timestamptz
```
Auto-provisioned on signup with `credits_balance = 10` (trial) via `handle_new_user()` trigger.

### campaigns
```sql
id              uuid PK
user_id         uuid FK → users
name            text
status          campaign_status default 'draft'
icp_json        jsonb   -- angle_data, explorium_filters, geo nested inside
angle_selected  text
stats_result    jsonb
sequence_json   jsonb   -- { emails: Touch[] } — migration 004
created_at      timestamptz
```

### leads
```sql
id              uuid PK
campaign_id     uuid FK → campaigns
company_id      uuid NULLABLE FK → companies  -- migration 003 made nullable
prospect_id     text  -- Explorium prospect ID
full_name       text
job_title       text
linkedin_url    text
email           text   -- null until unlocked
phone           text   -- null until unlocked
tier            contact_tier default 'influencer'
unlocked        boolean default false
credits_charged integer default 0
status          text default 'new'  -- migration 005: new|contacted|replied|converted
created_at      timestamptz
```

### credit_transactions
```sql
id              uuid PK
user_id         uuid FK → users
action          credit_action
credits_delta   integer   -- positive = add, negative = spend
explorium_cost  numeric(10,4) default 0
reference_id    uuid NULLABLE  -- ⚠️ UUID type — cannot store non-UUID strings
created_at      timestamptz
```

**Critical:** `reference_id` is UUID type. Passing non-UUID strings (e.g. `"search_1234567890"`) will cause a Postgres cast error.

### RPCs

```sql
deduct_credits(p_user_id uuid, p_amount integer, p_action credit_action,
               p_explorium_cost numeric default 0, p_reference_id uuid default null)
-- Atomically: credits_balance -= p_amount (fails if balance < amount → raises 'insufficient_credits')
-- Inserts credit_transactions row with credits_delta = -p_amount

add_credits(p_user_id uuid, p_amount integer, p_action credit_action,
            p_reference_id uuid default null)
-- Atomically: credits_balance += p_amount
-- Inserts credit_transactions row with credits_delta = +p_amount
```

---

## Credit System

| Action | Cost | Notes |
|--------|------|-------|
| Website analysis (landing page demo) | 0 | Free always |
| ICP extraction / new campaign | 0 | Free always |
| Lead fetch (per page) | 10 credits | Charged after results returned |
| Prospect search (per page) | 5 credits | Not charged if 0 results |
| Contact unlock (email + phone) | 2 credits | Not charged if no data returned |
| Sequence generation (first time) | 0 | Free |
| Sequence regeneration | 2 credits | Charged before generation |
| Credits never expire | — | — |

### Credit Packs (Stripe one-time payments)
| Pack | Credits | Price | env var |
|------|---------|-------|---------|
| Starter | 100 | $49 | `STRIPE_PRICE_STARTER` |
| Growth | 400 | $149 | `STRIPE_PRICE_GROWTH` |
| Scale | 1,000 | $299 | `STRIPE_PRICE_SCALE` |

---

## All Pages

| Route | Component | Type | Description |
|-------|-----------|------|-------------|
| `/` | `src/app/page.tsx` | Client | Landing — URL form, demo modal, ICP preview, stats trust bar |
| `/login` | `src/app/login/page.tsx` | Client | Supabase password auth |
| `/signup` | `src/app/signup/page.tsx` | Client | Business email gate + Supabase signUp |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Route | OAuth code exchange |
| `/auth/signout` | `src/app/auth/signout/route.ts` | Route | POST → signOut |
| `/dashboard` | `src/app/dashboard/page.tsx` | Server | Campaign list |
| `/dashboard/campaigns/new` | `src/app/dashboard/campaigns/new/page.tsx` | Server+Client | New campaign wizard |
| `/dashboard/campaigns/[id]` | `CampaignDetailClient.tsx` | Server+Client | Leads + Sequences tabs |
| `/dashboard/contacts` | `ContactsContent.tsx` | Server+Client | All unlocked contacts |
| `/dashboard/sequences` | `SequencesContent.tsx` | Server+Client | Sequence workspace (split panel) |
| `/dashboard/search` | `SearchContent.tsx` | Server+Client | Ad-hoc prospect search |
| `/dashboard/credits` | `CreditsContent.tsx` | Server+Client | Buy credits (Stripe checkout) |

### Site Metadata (`src/app/layout.tsx`)
```typescript
title: "SalesPal"
description: "AI-powered outbound sales."
```

### Standard Dashboard Layout
All dashboard pages use this pattern (padding on the inner div, not `<main>`):
```tsx
<div className="flex min-h-screen bg-white overflow-x-hidden">
  <Sidebar credits={credits} userEmail={userEmail} />
  <main className="flex-1 min-w-0 ml-0 md:ml-64">
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pt-[88px] md:pt-8 pb-8">
      {/* content */}
    </div>
  </main>
</div>
```
- `pt-[88px]` clears the fixed 56px mobile header
- `max-w-7xl` on the content div — all pages use this consistently
- Sequences page: `<main className="flex-1 min-w-0 ml-0 md:ml-64 flex flex-col">` with inner `<div className="w-full max-w-7xl mx-auto flex flex-col flex-1 pt-[88px] md:pt-0">` for the split-panel layout

### Inner Width Rules
- **Full width** (`w-full`, no max-w): all data containers — tables, grids, stats bars, filter cards, ICP sections, results lists, pricing grids
- **Narrow** (`max-w-sm mx-auto`): empty states only
- **Narrow** (`max-w-2xl w-full`): new campaign wizard URL input form and geo step only — NOT angle selection or confirm steps
- **Narrow** (`max-w-md w-full`): modal dialogs only
- **Truncation only** (`max-w-[180px]` etc.): table cells and title overflow — not layout constraints

---

## All API Routes

### Public (no auth)
| Route | Method | Credits | Description |
|-------|--------|---------|-------------|
| `/api/analyze-landing` | POST | 0 | URL → ICP + angles via claude-haiku. Rate limited: 60s per IP (in-memory Map, per-instance only). |

### Authenticated
| Route | Method | Credits | Description |
|-------|--------|---------|-------------|
| `/api/campaigns/analyze` | POST | 0 | URL → campaign name, ICP, two angles via claude-sonnet-4-6 |
| `/api/campaigns/create` | POST | 0 | Insert campaign row, returns `campaign_id` |
| `/api/campaigns/[id]/leads` | POST | 10/page | Explorium direct prospect fetch → Claude Haiku scoring → insert leads. Deduct fails → 500 (blocks response) |
| `/api/campaigns/[id]/unlock` | POST | 2 | Explorium enrich → reveal email+phone. Idempotent (already_unlocked check). Returns `charged: false` if no data. |
| `/api/campaigns/[id]/sequences` | POST | 0 (first) / 2 (regen) | Generate 5-touch sequence via claude-sonnet-4-6. Regen detected by `campaign.sequence_json !== null`. Returns `credits_remaining`. |
| `/api/campaigns/[id]/score` | POST | 0 | Re-score leads with Claude Haiku + optional context override |
| `/api/search/prospects` | POST | 5 | Explorium direct search. Not charged if 0 results. Returns `credits_remaining` on empty. |
| `/api/search/unlock` | POST | 2 | Explorium enrich. Returns `{ charged: false }` if no data. |
| `/api/user/credits` | GET | 0 | Returns `{ credits: number }` for sidebar sync |
| `/api/leads/[id]/status` | PATCH | 0 | Update lead status (new/contacted/replied/converted) |
| `/api/contacts` | GET | 0 | All unlocked leads across user campaigns |

### Stripe (no user auth — Stripe signature auth)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/stripe/checkout` | POST | Creates Stripe checkout session. Validates 3 price env vars before building ALLOWED_PRICES. |
| `/api/stripe/webhook` | POST | Handles `checkout.session.completed`. Signature verified first. Idempotency: checks `credit_transactions` for same `user_id + action + credits_delta` within 2 minutes. Uses service role client. |

---

## Stripe Flow

1. User clicks "Buy [Pack]" → POST `/api/stripe/checkout` with `priceId`
2. API validates price against `ALLOWED_PRICES` whitelist → creates Stripe session with metadata `{ user_id, price_id, credits }`
3. User redirected to Stripe → on payment → redirected to `/dashboard/credits?success=true`
4. Success page polls `/api/user/credits` every 2s (up to 5 attempts) watching for balance increase
5. Stripe fires `checkout.session.completed` → POST `/api/stripe/webhook`
6. Webhook: verify signature → idempotency check → call `add_credits` RPC
7. Credits appear; polling detects increase; banner updates to "Credits added"

---

## Explorium API

```
Base: https://api.explorium.ai
Auth header: API_KEY: <key>   (NOT Authorization: Bearer)

POST /v1/prospects              — direct prospect fetch (leads pipeline)
POST /v1/prospects/contacts_information/enrich  — contact unlock
POST /v1/businesses/stats       — free market sizing (never use region_country_code here)
```

**Geography rules (confirmed, never deviate):**
- `region_country_code` XOR `country_code` — never send both
- `region_country_code` causes 422 on `/v1/businesses/stats` — only valid on `/v1/prospects`
- Never send `region_country_code` alongside `business_id`
- UPPERCASE ISO 3166-2 for region codes: `"CA-ON"` not `"ca-on"`

**Prospects body:**
```json
{
  "mode": "full",
  "page_size": 25,
  "size": 25,
  "page": 1,
  "filters": {
    "website_keywords": { "values": [...] },
    "company_size":     { "values": [...] },
    "job_level":        { "values": [...] },
    "job_department":   { "values": [...] },
    "region_country_code": { "values": ["CA-ON"] }   // local only
    // OR
    "country_code":     { "values": ["ca"] }          // national only
  }
}
```

---

## AI Models

| Use | Model |
|-----|-------|
| Landing page ICP demo | `claude-haiku-4-5-20251001` |
| New campaign analysis | `claude-sonnet-4-6` |
| Lead scoring | `claude-haiku-4-5-20251001` |
| Re-scoring (score endpoint) | `claude-haiku-4-5-20251001` |
| Sequence generation | `claude-sonnet-4-6` (max_tokens: 3000) |

**Retry:** `src/lib/ai/retry.ts` — `retryWithBackoff()`, max 3 retries, 1s/2s/4s backoff, retries on Anthropic 529/503. Final failure throws `AI_OVERLOADED`.

---

## Design System

### Brand
```
Primary gradient: linear-gradient(to right, #4B6BF5, #7B4BF5)
Light tint: #EEF1FE / #F0EBFE (backgrounds, icon tiles)
```

### Gradient patterns
```tsx
// CTA buttons
style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}

// Gradient text
className="bg-clip-text text-transparent"
style={{ backgroundImage: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }}

// Gradient border trick (hero/featured cards)
<div className="rounded-xl p-[1px]" style={{ background: "linear-gradient(135deg, #4B6BF5, #7B4BF5)" }}>
  <div className="rounded-[11px] bg-white p-4">{/* content */}</div>
</div>

// Section separator (use instead of border-b)
<div className="h-px" style={{ background: "linear-gradient(to right, #4B6BF5, #7B4BF5)" }} />
```

### CSS utility classes (globals.css)
```
.card-lift      — translateY(-2px) + shadow on hover (150ms)
.btn-press      — scale(0.97) on active (100ms)
.border-animate — border-color + box-shadow transition (150ms)
.shimmer        — loading skeleton with shimmer sweep animation
```

### Typography
```
Page eyebrow:  text-[10px] font-semibold tracking-widest uppercase text-gray-400
Page h1:       text-3xl font-bold tracking-tight text-gray-900
Section label: text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400
Body:          text-sm text-gray-500
```

### Pills/badges
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] leading-none font-medium bg-gray-100 text-gray-600 max-w-[160px] cursor-default" title={value}>
  <span className="truncate">{value}</span>
</span>
```
- Always `px-3 py-1` minimum — never `px-2 py-0.5`
- Always `title={value}` for native tooltip
- Always `<span className="truncate">` child inside flex container

### Tier config (shared across all files)
```tsx
const TIER_CONFIG = {
  decision_maker: { label: "Decision Maker", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  influencer:     { label: "Influencer",     className: "bg-violet-50 text-violet-700 border border-violet-200" },
  noise:          { label: "Noise",          className: "bg-gray-50 text-gray-400 border border-gray-100" },
}
```

### Cards
- `shadow-sm` on all cards, `shadow-md` on featured/hero
- `overflow-hidden` on card containers
- `border border-gray-100` or `border border-gray-200` standard

### Custom select dropdowns
Always replace native browser arrows with a custom SVG chevron:
```tsx
<div className="relative">
  <select className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-700 focus:border-[#4B6BF5] focus:outline-none focus:ring-2 focus:ring-[#4B6BF5]/10 cursor-pointer">
    {/* options */}
  </select>
  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
    <svg className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
</div>
```
- `appearance-none` removes native arrow
- `pr-10` reserves space for the custom arrow
- `pointer-events-none` on the overlay so it doesn't block clicks

### Inline `<style>` tags with CSS `url()` references
React SSR HTML-encodes `<style>` content — `'` → `&#x27;`, `&` → `&amp;`. In unquoted CSS `url()`, the encoded `#` character acts as a URL fragment separator, causing the browser to make a spurious `GET` request. Always use `dangerouslySetInnerHTML` for inline styles containing `url()`:
```tsx
// ❌ React encodes this — causes GET /& 404
<style>{`@import url('https://fonts.googleapis.com/...');`}</style>

// ✅ Bypasses React encoding
<style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/...');` }} />
```

---

## Middleware

`src/middleware.ts` — runs on all routes except `_next/static`, `_next/image`, images/favicons.

- Refreshes Supabase session on every request
- Unauthenticated + `/dashboard/*` → redirect to `/login?next=<path>`
- Authenticated + `/login` or `/signup` → redirect to `/dashboard`
- API routes pass through; they handle their own auth

---

## Auth

- Business email gate: `src/lib/supabase/email-validation.ts` — 80+ blocked domains (Gmail, Yahoo, Outlook, Hotmail, iCloud, Proton, etc.)
- Signup: `supabase.auth.signUp()` → email confirmation
- Login: `supabase.auth.signInWithPassword()`
- All dashboard API routes: `supabase.auth.getUser()` — never trust client-passed `user_id`
- Campaign ownership: every campaign-scoped route verifies `.eq("user_id", user.id)`

---

## Key Behaviors & Guards

### Credit guards
- **search/prospects:** zero results → return early before `deduct_credits`; `credits_remaining` included in response
- **search/unlock:** `!email && !phone` → return `{ charged: false }` before `deduct_credits`; `p_reference_id: null` (prospect IDs are not UUIDs)
- **campaigns/[id]/unlock:** same guard: `!email && !phone` → return `{ charged: false }` before `deduct_credits`; `p_reference_id: campaignId` (valid UUID)
- **campaigns/[id]/leads:** `deductError` → return 500 (not silently ignored)

### Webhook idempotency
Stripe may deliver same event multiple times. Dedup via `credit_transactions` query:
```typescript
.eq("user_id", userId)
.eq("action", "pack_purchase")
.eq("credits_delta", creditsToAdd)   // column name: credits_delta (not credits_used)
.gte("created_at", twoMinutesAgo)    // column name: created_at (not timestamp)
```

### UI state sync
- After lead fetch: `GET /api/user/credits` → `setCredits()`
- After sequence gen: `data.credits_remaining` → `onCreditsUpdate()`
- After search/unlock: `GET /api/user/credits` → `setCredits()` via `refreshCredits()`
- After campaign unlock: optimistic `setCredits((c) => c - 2)` if `!data.already_unlocked`
- Credits page (success=true): polls `/api/user/credits` every 2s, up to 5 attempts

### Client unlock warning (charged === false)
Both `CampaignDetailClient` and `SearchContent` handle `data.charged === false`:
- Show amber warning: "Contact details unavailable. Not charged."
- Auto-clear after 4 seconds
- Do NOT deduct credits; do NOT mark lead unlocked

### Purchase error
`CreditsContent.handlePurchase`: if API returns no URL → `setPurchaseError("Something went wrong. Please try again.")`, auto-clears after 5s.

---

## TypeScript Map Iteration

Always use `.forEach((val, key) => {...})` — never `for...of` on Map iterators (TypeScript target incompatibility).

---

## Known Issues & Limitations

### 🟡 In-memory rate limiting on analyze-landing
`ipCooldowns = new Map<string, number>()` is module-level. Does not persist across Vercel cold starts or parallel instances. Per-instance only — not globally enforced.

### 🟡 Sequence regen credits lost if AI fails after deduction
In sequences route, `deduct_credits` is called before the Claude API call. If Claude fails post-deduction, credits are lost and no new sequence is generated.

### 🟡 Contacts page — optimistic status update ignores errors
`ContactsContent` `StatusDropdown` updates status optimistically and silently ignores API errors.

---

## File Structure (key files only)

```
src/
  app/
    page.tsx                          — Landing page (stats trust bar, dangerouslySetInnerHTML for Google Fonts import)
    layout.tsx                        — Root layout (title: "SalesPal", description: "AI-powered outbound sales.", Analytics, SpeedInsights)
    globals.css                       — Tailwind + custom utilities
    dashboard/
      page.tsx                        — Campaign list (server)
      campaigns/
        new/page.tsx + NewCampaignContent.tsx   — Wizard: URL→Geo→Angles(full-width)→Confirm(full-width)
        [id]/page.tsx + CampaignDetailClient.tsx + SequencesTab.tsx
      contacts/page.tsx + ContactsContent.tsx
      sequences/page.tsx + SequencesContent.tsx
      search/page.tsx + SearchContent.tsx
      credits/page.tsx + CreditsContent.tsx
    api/
      analyze-landing/route.ts        — Public ICP demo
      campaigns/analyze/route.ts
      campaigns/create/route.ts
      campaigns/[id]/leads/route.ts
      campaigns/[id]/unlock/route.ts
      campaigns/[id]/sequences/route.ts
      campaigns/[id]/score/route.ts
      search/prospects/route.ts
      search/unlock/route.ts
      leads/[id]/status/route.ts
      contacts/route.ts
      user/credits/route.ts
      stripe/checkout/route.ts
      stripe/webhook/route.ts
  components/
    Sidebar.tsx                       — Fixed desktop + mobile drawer
  lib/
    supabase/client.ts                — Browser client
    supabase/server.ts                — Server client (async, cookie-based)
    supabase/email-validation.ts      — Business email blocklist
    ai/retry.ts                       — retryWithBackoff for Anthropic calls
    exportCsv.ts                      — Client-side CSV download utility
supabase/migrations/
  001_initial_schema.sql
  002_user_trigger.sql                — Auto-provisions users row + 10 trial credits
  003_company_id_nullable.sql         — Makes leads.company_id nullable
  004_campaign_sequence.sql           — Adds campaigns.sequence_json JSONB
  005_lead_status.sql                 — Adds leads.status TEXT DEFAULT 'new'
  006_sequence_regeneration_enum.sql  — Adds sequence_regeneration to credit_action enum
```

---

## Still To Build

- **Apply migration 006 to production DB** — `ALTER TYPE credit_action ADD VALUE IF NOT EXISTS 'sequence_regeneration';` — run in Supabase SQL editor
- **Global rate limiting** — Replace in-memory Map with Redis/DB-backed per-IP limiter
- **Server-side export save** — `POST /api/campaigns/[id]/export` to persist to `exports` table
- **Post-v1:** Gmail/LinkedIn direct send, CRM sync, A/B testing, reply tracking, team multi-seat, agentic auto-send

---

*SalesPal · Good Vibes AI · goodvibesai.com*
