# SalesPal — PRD / README
**Good Vibes AI · v3.0 · April 2026**

---

## What It Is

SalesPal is an AI-powered outbound prospecting engine. A client enters their website URL, SalesPal identifies their best B2B campaign angle (including ones they haven't considered), surfaces a qualified lead list with real names and titles, and generates personalized outreach sequences across email, LinkedIn, and cold call. Credits are charged at every step that costs us money. Nothing is free that isn't free to us.

---

## Core Value Proposition

Most outbound tools assume the user knows their ICP. SalesPal identifies it for them, then executes. This makes it valuable for sophisticated B2B operators (Qubitra pitching CTOs at quant funds) and non-B2B businesses who need immediate sales signal (wine festival targeting HR directors at Ontario companies for corporate group ticket sales). SalesPal is the only outbound tool that teaches you your ICP and then runs the campaign.

---

## Signup Gate — Business Email Oo Gmail. No Yahoo. No Outlook. No Hotmail. Custom business domain required on signup. This single filter eliminates abuse, qualifies every user as a real business, and ensures trial credits are spent by people with genuine commercial intent. Implementation is a domain blocklist check at the email validation step.

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

Then Claude surfaces twoangles — the obvious one based on their offer, and a hidden B2B angle they likely haven't considered. Client picks one. This is the intelligence differentiator.

**Screen 4 — Trial Reveal (10 free credits)**
10 company fetches fire. Top 3 contacts per company returned — name, title, LinkedIn URL. Emails and phones blurred with a lock icon. Client sees real decision makers at real companies. Enough to prove the product. Not enough to run a campaign.

**Screen 5 — Upgrade Prompt**
"You're looking at 30 real decision makers. Unlock their contact info to start your campaign." Credit pack purchase flow.

---

## Campaign Angle Engine

Claude always outputs two angles after reading the client's site or form inputs.

Obvious angle — the straightforward B2B campaign based on their stated offer.
Hidden angle — a higher-leverage B2B approach they haven't considered.

Example for wine festival client: Obvious is direct consumer ticket sales. Hidden is corporate group sales to HR directors at Ontario companemployee morale day, bulk group pricing, immediate results within 2 weeks. Client picks which campaign to run. This reframe is the core product intelligence.

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
Growth — 5000 per credit)
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

p — business email verified, custom domain required
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

**LinkedIn connection requests are soft pitch, not silent.** Connection requests include a one-lineives the recipient a reason to accept. No hard ask, no link, no deck. Designed for standard LinkedIn accounts without Sales Navigator. InMail is secondary and optional.

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
Financial Services —at SMBs.
Recruiting and Staffing — HR at high-growth companies.

---

## Data Stack

Company qualification and market sizing — Explorium /v1/businesses/stats (free)
Company discovery — Explorium /v1/businesses
Prospect discovery — Explorium /v1/prospects
Contact enrichment on unlock — Explorium /v1/prospects/contacts_information/enrich
AI intelligence — Claude API claude-sonnet-4-20250514

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
campaigns — id, user_id, name, statual), icp_json, angle_selected, stats_result, created_at
companies — id, campaign_id, business_id, name, domain, qualified, credits_charged
leads — id, campaign_id, company_id, prospect_id, full_name, job_title, linkedin_url, email (null until unlocked), phone (null until unlocked), tier (decision_maker, influencer, noise), unlocked (bool), credits_charged
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

Nothd in v1. No analytics. No sidebar menus. No CRM panels. Simplicity is the competitive advantage at this stage.

---

## MVP Scope

In for v1 — business email gate, URL scan and manual form onboarding, ICP extraction, campaign angle engine (obvious and hidden), stats preview screen, blurred lead preview, company and prospect fetch, per-contact unlock flow, contact enrichment on demand, role-aware outreach generation, credit system, CSV export, Supabase auth.

Out for post-v1 — Gmail and LinkedIn direct send, CRM sync, A/B sequence testing, reply tracking, follow-up automation, team multi-seat accounts, agentic auto-send workflows.

---

## Quality Benchmarks

Trial reveal should return 80% or more Decision Maker or Influencer tier contacts. Email enrichment target is 90% or more verified valid on unlock. Outreach copy must reference the contact's role frame and at least one client proof point from ICP intake. Full campaign from URL input to blurred preview ready — under 3 minutes. Full campaign from fiedit spend to export ready — under 10 minutes.

---

*SalesPal · Good Vibes AI · goodvibesai.com*

---

## Build Progress
**Last updated: April 2026 · Session 1**

---

### Infrastructure

**Next.js 14 App Router** — TypeScript, Tailwind CSS, shadcn/ui, `src/` directory, `@/*` import alias.
Supabase JS (`@supabase/supabase-js`, `@supabase/ssr`), Anthropic SDK (`@anthropic-ai/sdk`) installed.
Dev server running at `http://localhost:3000`.

**Supabase project:** `kmswswolwnbdzjhupmlv` · region `us-west-2` · status `ACTIVE_HEALTHY`

**Environment variables configured** in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `EXPLORIUM_API_KEY`

---

### Database — Applied to Supabase

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
- Backfill ran manually: existing user `mgv@goodvibesenterprises.com` provisioned

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

### Pages

**`src/app/page.tsx`** — Landing
- Logo: "Sales" black / "Pal" blue→purple gradient
- Hero: "Ready to get more sales?"
- URL input → validates format → `router.push('/signup?url=...')`
- "Tell us about your business →" fallback link (`?manual=true`)

**`src/app/signup/page.tsx`** — Signup
- `validateBusinessEmail()` on blur and submit — inline error with icon
- `supabase.auth.signUp()` with `emailRedirectTo` → `/auth/callback`
- Post-submit: confirmation screen showing email address

**`src/app/login/page.tsx`** — Login
- `supabase.auth.signInWithPassword()` → `router.push(next)`
- Generic error message to avoid enumeration

**`src/app/dashboard/page.tsx`** — Dashboard shell
- Server component: fetches `credits_balance` from `public.users`
- Credit balance pill in header
- "Start New Campaign" button → `/dashboard/campaigns/new`
- Empty state with trial credits callout

**`src/app/dashboard/campaigns/new/page.tsx`** — Multi-step campaign creation (client component)
- Step 1: URL input (pre-fills from `?url=` landing page param, auto-starts analysis)
- Step 1 loading: animated scan with rotating status lines
- Step 1 error: splits on `AI_OVERLOADED` vs generic error — overloaded shows "Our AI is experiencing high demand" with one-click auto-retry
- Step 2: Angle selection — stats banner + two cards (Obvious / Hidden) with tier badge, target titles, pitch, why-now
- Step 3: Confirm — editable campaign name, angle summary, stats, 0-credit notice, Launch button

**`src/app/dashboard/campaigns/[id]/page.tsx`** — Campaign detail (server component)
- Fetches campaign + leads via RLS-protected queries
- Normalises Supabase join response (companies array → single object)
- Passes to `CampaignDetailClient`

**`src/app/dashboard/campaigns/[id]/CampaignDetailClient.tsx`** — Campaign detail (client component)
- Header: campaign name, status badge, credit balance, user email
- "Find Leads" button → calls `/api/campaigns/[id]/leads`
- Loading spinner during fetch
- Lead table: Name · Title · Company · Tier badge · LinkedIn · Email (locked/revealed) · Phone (locked/revealed) · Unlock (2 credits)
- Stats bar: Decision Makers · Influencers · Unlocked · Total
- Per-row unlock errors inline
- Credits update optimistically on unlock

---

### API Routes

**`POST /api/campaigns/analyze`**
- Auth-gated
- Fetches website HTML (8s timeout), strips tags, passes 6000 chars to Claude
- Claude (`claude-sonnet-4-5`) returns structured JSON: `{ campaign_name, icp, obvious_angle, hidden_angle }` — each angle includes `explorium_filters`
- Strips markdown fences from Claude response before `JSON.parse`
- Calls Explorium `POST /v1/businesses/stats` with `website_keywords`, `company_size`, `country_code` filters
- Returns `{ campaign_name, icp, obvious_angle, hidden_angle, stats: { companies, estimated_contacts } }`
- Returns HTTP 503 with `{ error: "AI_OVERLOADED" }` on 529/503 from Claude (after retries)

**`POST /api/campaigns/create`**
- Auth + user record check
- Inserts into `campaigns` table with `status: 'active'`
- Returns `{ campaign_id }`

**`POST /api/campaigns/[id]/leads`**
- Auth + campaign ownership (RLS)
- Minimum 5 credits required — returns `402` with current balance if insufficient
- Sets campaign `status → fetching_companies`
- Calls Explorium `POST /v1/businesses` — `mode: "full"`, `page_size/size: 10`, `page: 1`, filters: `website_keywords`, `company_size`, `country_code`
- Batch-calls Explorium `POST /v1/prospects` for all business IDs — `mode: "full"`, `max_per_company: 3`, `job_level` + `job_department` filters
- Scores prospects with Claude Haiku (`claude-haiku-4-5-20251001`) in a single batch call — falls back to rule-based scoring if Claude fails
- Inserts company rows → lead rows (Decision Maker + Influencer only; Noise excluded)
- Calls `deduct_credits` RPC — 1 credit per company at `$0.04` Explorium cost
- Sets campaign `status → preview_ready`
- Returns `{ leads, companies_fetched, credits_deducted }`

**`POST /api/campaigns/[id]/unlock`**
- Auth + lead ownership via join (`campaigns!inner(user_id)`)
- Idempotent — returns existing contact if already unlocked
- Requires 2 credits — returns `402` if insufficient
- Calls Explorium `POST /v1/prospects/contacts_information/enrich` with `prospect_ids`
- Handles multiple response field names (`email`, `work_email`, `personal_email`, `phone`, `phone_number`, `mobile`)
- Calls `deduct_credits` RPC atomically (2 credits, `$0.08` Explorium cost)
- Updates `leads` row: `email`, `phone`, `unlocked: true`, `credits_charged: 2`
- Returns `{ email, phone }`

---

### Shared Libraries

**`src/lib/ai/retry.ts`** — `retryWithBackoff<T>(fn, label)`
- Max 3 retries with 1s → 2s → 4s exponential backoff
- Retries only on `Anthropic.APIError` with status 529 or 503
- Non-retryable errors throw immediately
- Final retryable failure throws `new Error("AI_OVERLOADED")`
- Used by both `analyzeWithClaude` and `scoreProspects`

**`src/lib/supabase/email-validation.ts`** — `validateBusinessEmail()`, `isBusinessEmail()`

---

### Explorium API — Confirmed Correct Request Format

```
POST /v1/businesses
POST /v1/businesses/stats
POST /v1/prospects
POST /v1/prospects/contacts_information/enrich

Auth header: API_KEY: <key>  (not Authorization: Bearer)

Body shape for /v1/businesses:
{
  mode: "full",        // required; "full" or "preview"
  page_size: 10,       // required
  size: 10,            // required (both page_size and size needed)
  page: 1,
  filters: {
    website_keywords: { values: [...] },
    company_size:     { values: ["51-200", "201-500"] },
    country_code:     { values: ["us", "ca"] }   // lowercase ISO Alpha-2
    // company_country_code → rejected (extra field not permitted)
    // number_of_results   → rejected (extra field not permitted)
    // city_region_country → DO NOT USE on /v1/businesses — requires exact
    //   autocomplete strings we don't have; returns 0 results
    // region_country_code → works on /v1/businesses but NOT on /v1/businesses/stats (422)
  }
}

Body shape for /v1/prospects (key addition for local campaigns):
{
  mode: "full",
  page_size: N,
  size: N,
  page: 1,
  max_per_company: 2,
  filters: {
    business_id:                  { values: [...] },
    job_level:                    { values: [...] },
    job_department:               { values: [...] },
    prospect_region_country_code: { values: ["CA-ON"] }  // UPPERCASE ISO 3166-2
    // This filters by the prospect's PERSONAL location, not company HQ.
    // This is the correct geo precision mechanism for local campaigns.
    // Do NOT use city_region_country on /v1/businesses for this purpose.
  }
}
```

**Geography filtering rule (IMPORTANT):**
- Company fetch (`/v1/businesses`): use `country_code` only (broad). Never use `city_region_country`.
- Prospect fetch (`/v1/prospects`): use `prospect_region_country_code` with UPPERCASE values (e.g. `["CA-ON"]`) to filter by prospect personal location. This is how local/regional campaigns achieve precision.

---

### Still To Build

**Outreach generation**
- `POST /api/campaigns/[id]/outreach` — accepts `lead_id`, calls Claude to generate role-aware sequences (3 email touches, LinkedIn connection, LinkedIn InMail, cold call script), saves to `outreach_sequences` table, deducts 1 credit per contact
- Role-aware framing: CRO/risk → risk performance, CTO/tech → infrastructure, HR → employee morale, Office Manager → group pricing
- `/dashboard/campaigns/[id]/outreach/[lead_id]` — view/copy outreach sequences per lead

**CSV export**
- `POST /api/campaigns/[id]/export` — generates CSV of all unlocked contacts + outreach copy, saves to `exports` table, returns file URL
- Export button on campaign detail page

**Credit purchase flow**
- Credit pack selection UI (Starter $50, Growth, Pro $600)
- Stripe or payment processor integration
- `add_credits` RPC call on successful payment webhook

**Dashboard campaigns list**
- `/dashboard/page.tsx` currently shows empty state only
- Needs to query `campaigns` table and render active campaigns with status, lead count, unlocked count

**GitHub + Vercel deployment**
- `git init` + initial commit
- Push to GitHub repo
- Connect to Vercel, set environment variables, deploy
