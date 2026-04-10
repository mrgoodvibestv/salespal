# SalesPal — PRD / README
**Good Vibes AI · v3.0 · April 2026**

---

## What It Is

SalesPal is an AI-powered outbound prospecting engine. A client enters their website URL, SalesPal identifies their best B2B campaign angle (including ones they haven't considered), surfaces a qualified lead list with real names and titles, and generates personalized outreach sequences across email, LinkedIn, and cold call. Credits are charged at every step that costs us money. Nothing is free that isn't free to us.

---

## Core Value Proposition

Most outbound tools assume the user knows their ICP. SalesPal identifies it for them, then executes. This makes it valuable for sophisticated B2B operators (Qubitra pitching CTOs at quant funds) and non-B2B businesses who need immediate sales signal (wine festival targeting HR directors at Ontario companies for corporate group ticket sales). SalesPal is the only outbound tool that teaches you your ICP and then runs the campaign.

---

## Signup Gate — Business Email Only

No Gmail. No Yahoo. No Outlook. No Hotmail. Custom business domain required on signup. This single filter eliminates abuse, qualifies every user as a real business, and ensures trial credits are spent by people with genuine commercial intent. Implementation is a domain blocklist check at the email validation step.

---

## Onboarding Flow

**Screen 1 — Landing**
Single hero: "Ready to get more sales?" Two entry options below.

**Screen 2 — Entry**
Primary: Enter your website URL. Fallback (for gated or age-verified sites): manual form with five fields — business name, what you sell, city/region, timeline (this week / this month / next quarter), who you think your customer is.

**Screen 3 — ICP Extraction (free)**
Claude reads the URL or manual inputs. Explorium stats pre-check fires. Zero credits consumed. UI shows aggregate numbers only — no names, no companies yet.

Example output:
"SalesPal found 847 potential contacts across 312 companies matching your ICP in Ontario."

Then Claude surfaces two angles — the obvious one based on their offer, and a hidden B2B angle they likely haven't considered. Client picks one. This is the intelligence differentiator.

**Screen 4 — Trial Reveal (10 free credits)**
10 company fetches fire. Top 3 contacts per company returned — name, title, LinkedIn URL. Emails and phones blurred with a lock icon. Client sees real decision makers at real companies. Enough to prove the product. Not enough to run a campaign.

**Screen 5 — Upgrade Prompt**
"You're looking at 30 real decision makers. Unlock their contact info to start your campaign." Credit pack purchase flow.

---

## Campaign Angle Engine

Claude always outputs two angles after reading the client's site or form inputs.

Obvious angle — the straightforward B2B campaign based on their stated offer.
Hidden angle — a higher-leverage B2B approach they haven't considered.

Example for wine festival client: Obvious is direct consumer ticket sales. Hidden is corporate group sales to HR directors at Ontario companies — employee morale day, bulk group pricing, immediate results within 2 weeks. Client picks which campaign to run. This reframe is the core product intelligence.

---

## Credit System — Every Cost Passed Through

Nothing that costs us money is free to the client. Nothing that is free to us is charged to the client.

Stats pre-check and ICP extraction — free always (Explorium stats endpoint costs nothing)
Company fetch — 1 credit per company
Prospect fetch (name, title, LinkedIn) — included in company fetch cost, no separate charge
Contact unlock email + phone — 2 credits per contact
Outreach sequence generation — 1 credit per contact
Blurred preview screen — free always

The blurred preview is the conversion mechanism. Real names. Real companies. Real titles. Emails locked. Client has to spend credits to unlock. The hook is free. The value costs credits.

---

## Credit Packs

Trial — 10 credits, free, one per business email account
Starter — 100 credits, $50 ($0.50 per credit)
Growth — 500 credits, $150 ($0.30 per credit)
Pro — 2,000 credits, $600 ($0.30 per credit)

Credits never expire. No monthly lock-in. Buy when you need it, go dormant when you don't. This is designed for event-driven and seasonal clients who need bursts of outbound activity, not a continuous subscription.

---

## Unit Economics

Explorium costs us $0.04 per credit at $200 for 5,000 credits.

Our charge to client is $0.30-0.50 per credit depending on pack size.

Margin on data layer: 7.5x to 12.5x.

Trial cost to us per new user: approximately $1.60 in Explorium credits (10 company fetches + 30 prospect fetches). This is our product-level CAC. A 20% trial-to-paid conversion at $50 average first purchase yields $10 revenue per trial user against $1.60 cost.

Wine festival campaign example at 500 unlocks:
Our cost — $205 (search + enrichment + Claude)
Client revenue — $500 (250 unlock credits at $0.50 + search credits)
Net margin — approximately 60%, rising to 79% at full 2,500 contact unlock scale.

---

## Core Campaign Pipeline

1. Business email verified, custom domain required
2. URL scan or manual form — client describes their business
3. ICP extraction — Claude reads site, Explorium stats check fires, free
4. Campaign angle engine — obvious + hidden angle surfaced, client chooses
5. Company gate — Explorium business fetch with website_keywords filter applied first, 1 credit per company
6. Prospect fetch — names, titles, LinkedIn returned with company fetch, blurred preview shown
7. Contact unlock — client spends 2 credits per contact, Explorium enrichment endpoint called, email and phone revealed
8. Outreach generation — Claude generates role-aware sequences, 1 credit per contact
9. Export — CSV with all unlocked contacts and outreach copy

---

## Architecture Decisions

**Company-level keyword gate always fires first.** Before any prospect is fetched, Explorium filters companies using website_keywords with any_match_phrase. This is the quality unlock that dropped 6,646 financial firms to 153 quant-native firms in the Qubitra test. Applied to every campaign automatically.

**Enrichment is on-demand, never batch.** Explorium's contact enrichment endpoint is called only when a client clicks unlock on a specific contact. We never pre-enrich the full list. This means we never pay for data the client doesn't want.

**Three-tier contact scoring.** Claude scores every contact before they appear in the UI. Decision Maker (direct buyer, shown first), Influencer (gate-opener, shown second), Noise (excluded entirely, never shown, never fetched).

**Role-aware outreach frames.** Claude selects the correct framing based on contact title. CRO and risk titles get risk performance framing. CTO and technology titles get infrastructure framing. HR and people titles get employee morale framing. Office managers get group pricing and event logistics framing. Client's proof points from ICP intake inject into whichever frame applies.

**LinkedIn connection requests are soft pitch, not silent.** Connection requests include a one-line hook that gives the recipient a reason to accept. No hard ask, no link, no deck. Designed for standard LinkedIn accounts without Sales Navigator. InMail is secondary and optional.

**Outreach channel structure is fixed, content is personalized.**
Email Touch 1 — insight-led, no hard ask.
Email Touch 2 — specific use case or proof point, soft ask.
Email Touch 3 — short, door open, final.
LinkedIn connection — one-line soft hook, presence building.
LinkedIn InMail — one specific angle, references the connection.
Cold call script — structured with objection handling trees.

---

## Campaign Archetypes

Claude matches each client to the closest archetype during onboarding and uses it to shape the ICP and outreach framing.

Enterprise Tech — CTO and CIO at target verticals. Example: Qubitra.
Corporate Group Sales — HR Directors and People and Culture at 50-500 employee companies. Example: Wine Festival.
Professional Services — Practice leads at law, accounting, and consulting firms.
Financial Services — CFOs and Controllers at SMBs.
Recruiting and Staffing — HR at high-growth companies.

---

## Data Stack

Company qualification and market sizing — Explorium /v1/businesses/stats (free)
Company discovery — Explorium /v1/businesses
Prospect discovery — Explorium /v1/prospects
Contact enrichment on unlock — Explorium /v1/prospects/contacts_information/enrich
AI intelligence — Claude API (claude-sonnet-4-6 for analysis + sequences, claude-haiku-4-5-20251001 for prospect scoring)

Key Explorium filters: website_keywords any_match_phrase, linkedin_category, country_code, company_size, job_level (c-suite, vice president, director), job_department (engineering, finance, r&d, data, human resources, administration).

Data suppliers are proprietary to SalesPal. Never disclosed to clients.

---

## Tech Stack

Frontend — Next.js, Tailwind, shadcn/ui
Backend, auth, database — Supabase
AI layer — Claude API
Data layer — Explorium API
Hosting — Vercel

---

## Database Schema

users — id, email, domain, email_verified, credits_balance, created_at
campaigns — id, user_id, name, status (active/fetching_companies/preview_ready/draft/archived), icp_json, angle_selected, stats_result, sequence_json (JSONB — migration 004), created_at
companies — id, campaign_id, business_id, name, domain, qualified, credits_charged
leads — id, campaign_id, company_id, prospect_id, full_name, job_title, linkedin_url, email (null until unlocked), phone (null until unlocked), tier (decision_maker, influencer, noise), unlocked (bool), credits_charged, status (TEXT DEFAULT 'new' — migration 005)
outreach_sequences — id, lead_id, channel (email, linkedin, call), touch_num, subject, body, credits_charged, created_at
credit_transactions — id, user_id, action, credits_used, explorium_cost, timestamp
exports — id, campaign_id, type (csv or pdf), file_url, created_at

---

## Dashboard — Five Things Only

Start New Campaign — prominent, always visible.
Active Campaigns — status, companies found, contacts unlocked.
Lead List — name, company, title, LinkedIn, lock icon for email and phone, unlock button.
Credit Balance — always visible top right, one-click top-up.
Export Button — CSV of all unlocked contacts with outreach copy.

Nothing else in v1. No analytics. No sidebar menus. No CRM panels. Simplicity is the competitive advantage at this stage.

---

## MVP Scope

In for v1 — business email gate, URL scan and manual form onboarding, ICP extraction, campaign angle engine (obvious and hidden), stats preview screen, blurred lead preview, company and prospect fetch, per-contact unlock flow, contact enrichment on demand, role-aware outreach generation, credit system, CSV export, Supabase auth.

Out for post-v1 — Gmail and LinkedIn direct send, CRM sync, A/B sequence testing, reply tracking, follow-up automation, team multi-seat accounts, agentic auto-send workflows.

---

## Quality Benchmarks

Trial reveal should return 80% or more Decision Maker or Influencer tier contacts. Email enrichment target is 90% or more verified valid on unlock. Outreach copy must reference the contact's role frame and at least one client proof point from ICP intake. Full campaign from URL input to blurred preview ready — under 3 minutes. Full campaign from first credit spend to export ready — under 10 minutes.

---

*SalesPal · Good Vibes AI · goodvibesai.com*

---

## Build Progress
**Last updated: April 10, 2026 · Sessions 1–3**

---

### Infrastructure

**Next.js 14 App Router** — TypeScript, Tailwind CSS, shadcn/ui, `src/` directory, `@/*` import alias.
Supabase JS (`@supabase/supabase-js`, `@supabase/ssr`), Anthropic SDK (`@anthropic-ai/sdk`) installed.

**Supabase project:** `kmswswolwnbdzjhupmlv` · region `us-west-2` · status `ACTIVE_HEALTHY`

**Deployed:** GitHub → `mrgoodvibestv/salespal` · Vercel auto-deploys from `main` branch.

**Environment variables configured** in `.env.local` and Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `EXPLORIUM_API_KEY`

---

### Database — All Migrations Applied to Supabase

**`supabase/migrations/001_initial_schema.sql`**
- Extension: `pgcrypto`
- Enums: `campaign_status`, `contact_tier`, `outreach_channel`, `export_type`, `credit_action`
- Tables: `users`, `campaigns`, `companies`, `leads`, `outreach_sequences`, `credit_transactions`, `exports`
- 15 indexes covering all foreign keys and common query patterns
- RLS enabled on all 7 tables with full per-user policies (select / insert / update / delete)
- `credit_transactions` insert/update/delete locked to service role only
- Helper functions: `deduct_credits()` and `add_credits()` — both `security definer`, enforce balance constraint atomically

**`supabase/migrations/002_user_trigger.sql`**
- Function `handle_new_user()` — fires `AFTER INSERT ON auth.users`
- Auto-provisions `public.users` row with `credits_balance = 10` (free trial)
- Extracts `domain` from email via `split_part(email, '@', 2)`
- `ON CONFLICT (id) DO NOTHING` — safe against duplicate fires

**`supabase/migrations/003_company_id_nullable.sql`**
- Makes `company_id` nullable on `leads` table (leads pipeline no longer uses company intermediary)

**`supabase/migrations/004_campaign_sequence.sql`**
- `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sequence_json JSONB`
- Stores the 5-touch multi-channel outreach sequence per campaign

**`supabase/migrations/005_lead_status.sql`**
- `ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'`
- Values: `new` / `contacted` / `replied` / `converted`

---

### Auth

**`src/middleware.ts`**
- Refreshes Supabase session token on every request
- Protects all `/dashboard/*` routes — redirects unauthenticated to `/login?next=<path>`
- Redirects authenticated users away from `/login` and `/signup` to `/dashboard`

**`src/lib/supabase/client.ts`** — browser client (`createBrowserClient`)
**`src/lib/supabase/server.ts`** — async server client (`createServerClient`) with cookie forwarding
**`src/lib/supabase/email-validation.ts`** — blocklist of 80+ free/consumer email domains. `validateBusinessEmail()` returns `{ valid, reason }`. Blocks Gmail, Yahoo, Outlook, Hotmail, iCloud, Proton, Yandex, GMX, and others.
**`src/app/auth/callback/route.ts`** — exchanges auth code for session, redirects to `/dashboard` or `?next=`
**`src/app/auth/signout/route.ts`** — POST handler, calls `supabase.auth.signOut()`, redirects to `/`

---

### Standard Dashboard Layout Pattern

Every dashboard page follows this structure exactly:
```tsx
<div className="flex min-h-screen bg-white overflow-x-hidden">
  <Sidebar credits={credits} userEmail={userEmail} />
  <main className="flex-1 min-w-0 ml-0 md:ml-64 px-4 sm:px-6 md:px-8 pt-[88px] md:pt-8 pb-8">
    <div className="max-w-6xl w-full">
      {/* eyebrow + h1 + content */}
    </div>
  </main>
</div>
```
- `pt-[88px]` on mobile = clears the fixed 56px mobile header bar
- `md:pt-8` on desktop = standard 32px top spacing
- `max-w-6xl` = content cap on wide screens (campaign detail uses `max-w-7xl`)
- Sequences page deviates: `pt-[88px] md:pt-0` on main + `pt-0 md:pt-8` on inner header div (split-panel needs full height)

Page header eyebrow pattern: `text-[10px] font-semibold tracking-widest uppercase text-gray-400`

---

### Pages — All Built

**`src/app/page.tsx`** — Landing
- Hero: "Paste your website. / Find your buyers." at `text-6xl sm:text-7xl`
- Animated ticker (20s marquee, `|` separators, no emoji)
- URL input → validates → `router.push('/signup?url=...')`
- How It Works section (white bg, purple blur orb), CTA strip (white, gradient button)
- Channel badges: Gmail red, LinkedIn blue, Phone green

**`src/app/signup/page.tsx`** — Signup
- `validateBusinessEmail()` on blur + submit — inline error
- `supabase.auth.signUp()` → confirmation screen

**`src/app/login/page.tsx`** — Login
- `supabase.auth.signInWithPassword()` → `router.push(next)`
- Generic error to avoid enumeration

**`src/app/dashboard/page.tsx`** — Campaign List (server component)
- Fetches `credits_balance` + all campaigns for user
- Renders campaign cards with status, lead count, unlocked count
- "Start New Campaign" CTA

**`src/app/dashboard/campaigns/new/page.tsx`** + **`NewCampaignContent.tsx`**
- Step 1: URL input, auto-starts analysis, AI_OVERLOADED handling with one-click retry
- Step 2: Angle selection — Obvious + Hidden cards with tier badge, target titles, pitch, why-now
- Step 3: Confirm — editable campaign name, 0-credit notice, Launch

**`src/app/dashboard/campaigns/[id]/page.tsx`** — Campaign detail (server component)
- Explicit `.select("id, name, status, angle_selected, icp_json, stats_result, sequence_json, created_at")` — sequence_json must be in this list
- Passes campaign + leads + credits + userEmail to `CampaignDetailClient`

**`src/app/dashboard/campaigns/[id]/CampaignDetailClient.tsx`** — Campaign detail (client component)
- **Leads tab:** lead table with tier badges, LinkedIn, locked/revealed email+phone, Unlock button (2 credits)
  - Client-side filters: Tier pills, Department pills, Noise toggle
  - Refine panel: re-fetch with company size / seniority / city overrides
  - Re-score panel: send context override to Claude Haiku, updates tier badges in-place
  - Green "Saved" badge next to name when `lead.unlocked === true` (desktop table + mobile card)
  - Stats bar: Decision Makers · Influencers · Unlocked · Showing
  - InitialsAvatar helper (deterministic color via `charCodeAt(0) % colors.length`)
- **Sequences tab:** renders `SequencesTab` component

**`src/app/dashboard/campaigns/[id]/SequencesTab.tsx`** — Sequences tab (client component)
- Empty state → Generate button (POST `/api/campaigns/[id]/sequences`, 1 credit)
- Populated state → 5 TouchCards + Regenerate button
- Each card: Day badge (gradient), ChannelBadge (LinkedIn blue / Email gray), tone badge, Copy button
- LinkedIn cards: "Connection Note" label, `{body.length}/300` char counter (red if over)
- Copy: body-only for LinkedIn, `Subject: ...\n\n{body}` for email

**`src/app/dashboard/contacts/page.tsx`** — Key Contacts (server component)
- Two-step RLS-safe query: campaigns by `user_id` first → leads `.in("campaign_id", campaignIds)`
- Do NOT use `!inner` join on leads — RLS ambiguity causes 0 results
- Merges campaign name + angle onto each lead

**`src/app/dashboard/contacts/ContactsContent.tsx`** — Key Contacts (client component)
- Stats row: `grid grid-cols-2` on mobile (2×2 with internal borders), `flex` on sm+
- Campaign filter dropdown (full width on mobile, auto on sm+) — hidden when only 1 campaign
- Contacts grouped by campaign — section header with campaign name + angle pill (hidden on mobile) + contact count
- Each row: InitialsAvatar + name + tier badge + job title + email inline on mobile (`sm:hidden`) + email link + LinkedIn icon + StatusDropdown
- StatusDropdown: native `<select>` styled as colored pill, optimistic update → PATCH `/api/leads/[id]/status`

**`src/app/dashboard/sequences/page.tsx`** — Sequences workspace (server component)
- Queries campaigns with `sequence_json IS NOT NULL`, ordered by `created_at DESC`
- Maps to `{ campaign_id, campaign_name, angle_selected, emails }`

**`src/app/dashboard/sequences/SequencesContent.tsx`** — Sequences workspace (client component)
- **Mobile:** campaign `<select>` dropdown (md:hidden) + scrollable touch cards below
- **Desktop:** split-panel — left `w-64` campaign list + right flex-1 sequence detail; `h-[calc(100vh-160px)]`
- Left panel: campaign buttons with active gradient left border (`top-0 bottom-0`), `{N} touches` badge
- Right panel header: campaign name + "Generated sequence" label + angle pill + "View campaign →" link + Regenerate button (inline, flex justify-between) + `border-b border-gray-100`
- TouchCards: `rounded-xl`, `border-l-2 border-blue-300` (LinkedIn) / `border-l-2 border-gray-200` (email), `break-words` body
- handleRegenerate: POST `/api/campaigns/[id]/sequences` → updates `sequenceMap` state

---

### Sidebar (`src/components/Sidebar.tsx`)

"use client". Fixed desktop aside + mobile slide-in drawer (hamburger → overlay). NavContent shared between both instances.

Active state computed with `usePathname()`:
- `isNewCampaign` = `/dashboard/campaigns/new`
- `isCampaigns` = `/dashboard` (exact) or `/dashboard/campaigns/...` (excluding /new)
- `isContacts` = `/dashboard/contacts`
- `isSequences` = `/dashboard/sequences`

Nav items: My Campaigns · New Campaign · Sequences · Key Contacts
Account section: credits balance + user email
Bottom: AI Agent Mode teaser (disabled) · Buy Credits (disabled) · Sign Out

---

### API Routes — All Built

**`POST /api/campaigns/analyze`**
- Fetches URL HTML (8s timeout), strips to 6000 chars, sends to `claude-sonnet-4-6`
- Returns `{ campaign_name, icp, obvious_angle, hidden_angle, stats }`
- HTTP 503 `{ error: "AI_OVERLOADED" }` on 529/503 after retries

**`POST /api/campaigns/create`**
- Inserts campaign with `status: 'active'`
- Returns `{ campaign_id }`

**`POST /api/campaigns/[id]/leads`**
- Calls Explorium `POST /v1/prospects` directly (no company intermediary)
- Local: `region_country_code: ["CA-ON"]` (UPPERCASE), `page_size: 10`
- National: `country_code: ["ca"]`, `page_size: 5`
- NEVER send both geo filters together
- Scores with `claude-haiku-4-5-20251001` (batch), falls back to rule-based
- Inserts DM + Influencer leads only (`company_id: null`), deducts credits via RPC

**`POST /api/campaigns/[id]/unlock`**
- Idempotent — returns existing data if already unlocked
- Calls Explorium enrich endpoint, deducts 2 credits
- Handles multiple email/phone field name variants from Explorium response

**`POST /api/campaigns/[id]/sequences`**
- Reads `icp_json.angle_data` for pitch + titles, queries top 3 unlocked leads for personalisation
- Calls `claude-sonnet-4-6` with `max_tokens: 3000`
- Generates 5-touch sequence: Day 1 LinkedIn connection (≤300 chars), Day 3 email intro, Day 6 LinkedIn follow-up, Day 10 email follow-up, Day 14 breakup email
- Stores in `campaigns.sequence_json = { emails: [...] }`
- Returns `{ emails }`

**`POST /api/campaigns/[id]/score`**
- Re-scores existing leads with `claude-haiku-4-5-20251001` using optional `context_override`
- Updates `tier` on all lead rows for the campaign
- Returns `{ leads: [{ id, tier }] }`

**`GET /api/contacts`**
- Returns all unlocked leads across user's campaigns (joins via `campaigns!inner`)
- Note: page.tsx uses a safer two-step query; this route exists for potential client-side use

**`PATCH /api/leads/[id]/status`**
- Validates status in `["new","contacted","replied","converted"]`
- Verifies ownership via `campaigns!inner(user_id)`
- Updates `leads.status`, returns `{ status }`

**`GET /api/user/credits`**
- Returns current `credits_balance` for authenticated user

---

### Shared Libraries

**`src/lib/ai/retry.ts`** — `retryWithBackoff<T>(fn, label)`
- Max 3 retries with 1s → 2s → 4s exponential backoff
- Retries only on `Anthropic.APIError` with status 529 or 503
- Final retryable failure throws `new Error("AI_OVERLOADED")`

**`src/lib/supabase/email-validation.ts`** — `validateBusinessEmail()`, `isBusinessEmail()`

---

### Explorium API — Confirmed Correct Request Format

```
POST /v1/businesses/stats   (free — market sizing only, never use region_country_code here)
POST /v1/prospects          (main leads pipeline)
POST /v1/prospects/contacts_information/enrich  (on-demand unlock)

Auth header: API_KEY: <key>  (NOT Authorization: Bearer)

/v1/prospects body:
{
  mode: "full",
  page_size: N,
  size: N,
  page: 1,
  max_per_company: 2,
  filters: {
    website_keywords: { values: [...] },
    company_size:     { values: [...] },
    job_level:        { values: [...] },
    job_department:   { values: [...] },
    // Local campaigns only — UPPERCASE ISO 3166-2, NO business_id:
    region_country_code: { values: ["CA-ON"] }
    // National campaigns only:
    country_code: { values: ["ca"] }
  }
}
```

**Geography rules (CONFIRMED, do not deviate):**
- NEVER send `region_country_code` + `country_code` together — mutually exclusive
- NEVER send `region_country_code` alongside `business_id` — Explorium rejects it
- `region_country_code` causes 422 on `/v1/businesses/stats` — only use on `/v1/prospects`
- `/v1/businesses` is no longer used in the leads pipeline at all

---

### Still To Build

**CSV export**
- `POST /api/campaigns/[id]/export` — CSV of all unlocked contacts + sequence copy, saves to `exports` table
- Export button on campaign detail page

**Credit purchase flow**
- Credit pack selection UI (Starter $50, Growth $150, Pro $600)
- Stripe integration + webhook
- `add_credits` RPC on successful payment
