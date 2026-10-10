# JERSEY STUDIO — premium jersey e‑commerce

A production‑oriented online shop for football jerseys in Bangladesh: customer storefront (English + বাংলা, BDT),
admin dashboard, AI virtual try‑on integration, interactive 3D personalisation, and Steadfast / Pathao courier integrations.

> **Status, honestly:** everything below runs locally against PostgreSQL and is covered by automated tests. **No live third‑party
> service has been exercised** — no credentials were available. Steadfast, Pathao, SSLCommerz and Google Vertex AI adapters are
> implemented against their published APIs and run in clearly‑labelled **mock / demo modes** until you add credentials.
> See [Integration status](#integration-status).

---

## Contents
1. [What's included](#whats-included)
2. [Design references](#design-references)
3. [Tech stack & architecture](#tech-stack--architecture)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [Credentials needed to go live](#credentials-needed-to-go-live)
7. [Integration status](#integration-status)
8. [Testing](#testing)
9. [Performance & accessibility (measured)](#performance--accessibility-measured)
10. [Deployment](#deployment)
11. [Security & privacy](#security--privacy)
12. [Backups & recovery](#backups--recovery)
13. [Known limitations & next steps](#known-limitations--next-steps)

---

## What's included

**Storefront** (`src/app/(store)`)
- Homepage driven by the CMS: editorial hero, category cards, best sellers / new arrivals rails, featured collections,
  personalisation promo with live preview, club & country grid, AI try‑on explainer, trust strip, verified reviews, recently viewed,
  newsletter. Announcement bar, mega menu, search overlay, language switch (EN/বাংলা), cart drawer.
- Shop & collections with **database‑driven filters** (category, club, national team, season, kit, colour, size, price, availability),
  search, sorting, pagination, quick view, quick add, wishlist, mobile bottom‑sheet filters.
- Product page: gallery with zoom/lightbox, front/back switch, **3D view**, size guide, colour/size/stock, quantity,
  add to bag / buy now, wishlist, try‑on & personalise entry points, delivery/returns info, verified reviews, related,
  JSON‑LD product data, mobile sticky purchase bar.
- Cart, checkout (guest or account, Bangladesh phone validation, division → district selection, server‑side pricing,
  coupons, bundles, free‑delivery threshold, COD + optional SSLCommerz), confirmation, guest order tracking.
- Accounts: register / sign in / password reset, profile, addresses, order history, wishlist, saved designs,
  try‑on images, privacy & deletion requests, verified‑purchase reviews.
- `/try-on` — AI virtual try‑on studio (3‑panel desktop, step flow on mobile).
- `/customize/[productId]` — interactive 3D jersey personaliser (name, number, font, print colour, shirt colour where allowed).
- Content pages (about, contact, FAQ, shipping, returns, privacy, terms), sitemap, robots, 404/error/loading states.

**Admin** (`src/app/admin`, separate staff session + role‑based permissions)
Dashboard · Analytics · Orders (detail, status workflow, timeline, notes, packing slip, CSV export) · Shipping dashboard ·
Customers (accounts, all buyers incl. guests, support inquiries, deletion requests, newsletter) · Discounts (coupons, bundles) ·
Reviews moderation · Products (list, bulk status, full editor, CSV import/export) · Categories · Collections · Inventory
(variant‑level, adjustments with history) · Customisation templates · Homepage editor (draft → preview → publish, reorder, add/remove
sections, announcement, brand/logo, footer & social) · Appearance (presets, colour tokens with WCAG contrast checks, fonts, radius,
buttons, cards, spacing; draft/preview/publish) · Media library · Virtual try‑on settings & usage · Payments · Delivery & couriers
(Steadfast, Pathao, rates, auto‑booking rules, error history) · Marketing (GA4, GTM, Meta, TikTok with consent; SEO; UTM campaign
performance) · Staff & roles · Notifications · System health & jobs · Audit logs · Global search.

---

## Design references

The brief pointed to the aniq‑ui “Next.js E‑Commerce Template with Admin Dashboard” demos
(`ecommerce-clothes-1.aniq-ui.com`, `ecommerce-clothes-1-admin.aniq-ui.com`, `aniq-ui.com/en/templates/next-js-ecommerce-template`).
**These sites could not be inspected from the build environment** (the hosts did not resolve / were blocked by the network
policy), and no public description of them was found. The design was therefore built from the written brief:
a warm off‑white, editorial fashion‑retail look with a single sports accent, Manrope + Inter typography, restrained motion,
and a clean light/dark admin. No code, assets or branding from those templates were used.

All catalog imagery is **original procedurally generated jersey art** (`src/lib/jersey-art.ts`) for fictional clubs and
“supporters’ edition” national designs without federation crests. Replace with your own licensed photography via Admin → Products.

---

## Tech stack & architecture

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS v4, Radix UI primitives (shadcn‑style components in `src/components/ui`), Lucide, Motion, GSAP ScrollTrigger (hero parallax), Embla |
| 3D | Three.js, React Three Fiber, Drei (procedural jersey mesh + optional licensed GLB) |
| Data | PostgreSQL + Prisma 6 (`prisma/schema.prisma`, migrations in `prisma/migrations`) |
| Validation | Zod on every server boundary |
| Charts | Recharts |
| Storage | S3‑compatible (AWS S3 / R2 / Spaces / MinIO) or local private disk |
| Jobs | Postgres‑backed queue (`src/lib/jobs`) with `SKIP LOCKED`, retries and backoff; run via `/api/cron/jobs` or `npm run jobs:run` |

Key modules
```
src/lib/money.ts              integer paisa arithmetic & BDT formatting
src/lib/cart/server.ts        authoritative cart pricing (prices never come from the client)
src/lib/checkout/place-order  transactional order placement: atomic stock decrement, idempotency key, coupon limits
src/lib/couriers/             CourierAdapter interface · steadfast.ts · pathao.ts · mock.ts · service.ts (idempotent booking, sync, webhooks)
src/lib/tryon/                TryOnProvider interface · google-vertex.ts · demo.ts · service.ts (consent, limits, budget, retention)
src/lib/payments/sslcommerz   hosted checkout + server-side validation
src/lib/settings.ts           typed, schema-validated site settings (draft/publish)
src/lib/cms/sections.ts       homepage section schemas
src/lib/auth/                 DB sessions (hashed tokens, httpOnly cookies), bcrypt, RBAC permissions
```

Rendering: the store is database‑driven and admin‑editable, so pages render per request (Cache Components disabled
intentionally — see `next.config.ts`). Heavy client code (3D) is lazy‑loaded only where used.

---

## Getting started

Requirements: Node ≥ 20.9, PostgreSQL ≥ 14.

```bash
npm install
cp .env.example .env                 # fill DATABASE_URL, APP_SECRET, ENCRYPTION_KEY, CRON_SECRET
npx prisma migrate deploy            # or: npm run db:migrate:dev
npm run db:seed:demo                 # base config + fictional DEMO catalog/orders (development only)
npm run dev                          # http://localhost:3000 · admin at /admin
```

Development owner account (created by the seed when `SEED_ADMIN_*` is unset): `admin@jerseystudio.local` / `Admin12345`.
**Change it immediately; in production the seed refuses to run without `SEED_ADMIN_PASSWORD`.**

Demo data (64 orders, 12 customers, reviews) is flagged (`Order.isDemo`, `@demo.jerseystudio.local`) and shown with a
“demo data” banner. Remove it with `npm run db:purge-demo`. Production should use `npm run db:seed` (no `--demo`).

Background work (try‑on retries, retention purge, courier status polling, auto‑booking): call
`GET /api/cron/jobs` every minute with `Authorization: Bearer $CRON_SECRET`, or run `npm run jobs:run` as a long‑lived process.

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test` (Vitest), `test:e2e` (Playwright), `db:*`, `jobs:run`.

---

## Environment variables

See [`.env.example`](.env.example). Required: `DATABASE_URL`, `APP_URL`, `APP_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`.
Recommended: S3 storage, SMTP (password‑reset emails — without SMTP they are only logged in development).
Courier, payment and AI credentials are entered in the admin and stored **AES‑256‑GCM encrypted** in the database.

---

## Credentials needed to go live

| Service | Where to enter | What you need |
|---|---|---|
| Steadfast Courier | Admin → Delivery & couriers → Steadfast | API key, secret key (merchant panel); a webhook bearer token you choose |
| Pathao Courier | Admin → Delivery & couriers → Pathao | Client ID, client secret, merchant email & password, store ID; webhook secret + integration secret from Pathao |
| Google Vertex AI Virtual Try‑On | Admin → Virtual Try‑On (or env) | GCP project with Vertex AI API enabled, access to the Virtual Try‑On model in your region, service‑account JSON (Vertex AI User) |
| SSLCommerz (cards, bKash, Nagad) | Admin → Payments | Store ID & store password (sandbox and/or live) |
| GA4 / GTM / Meta Pixel / TikTok Pixel | Admin → Marketing | IDs only (loaded after visitor consent) |
| Email | env `SMTP_URL`, `MAIL_FROM` | SMTP account |
| Object storage | env `S3_*` | Bucket + keys (+ public CDN URL) |

---

## Integration status

| Integration | Implemented | Verified against live service | Without credentials |
|---|---|---|---|
| **Steadfast** | create order, status by consignment, balance (connection test), return request helper, webhook receiver (Bearer token), polling | ❌ not tested live | **Mock mode**: bookings get `MOCK-…` ids and are labelled “mock — not a real booking” everywhere |
| **Pathao** | OAuth password + refresh grant (tokens encrypted), city/zone/area lookup, create order, order info, price plan, stores (connection test), webhook receiver | ❌ not tested live (sandbox wiring included) | Mock mode as above |
| **Google Vertex AI Try‑On** | `:predict` with person + product image, service‑account JWT auth, error mapping, retries, cost/budget tracking | ❌ not tested live | **Demo mode**: produces a side‑by‑side image stamped “DEMO MODE — NOT AN AI TRY‑ON”; UI shows a demo banner |
| **SSLCommerz** | session init, browser return + IPN, **server‑side validation API** before marking paid, failed/cancelled → order cancelled + restocked | ❌ not tested live | Online payment hidden until enabled |
| GA4/GTM/Meta/TikTok | consent‑gated loader | ❌ | not loaded |

Courier and SSLCommerz endpoint shapes were taken from public documentation and cross‑checked against published open‑source SDK
sources because the official Steadfast/Pathao docs require a merchant login. **Before go‑live, verify each request/response
against your merchant documentation in sandbox**, especially: Steadfast `create_order` field names, Pathao status slugs and
webhook signature scheme, and the Vertex model ID available to your project.

---

## Testing

All of the following were **executed** in the build environment (Node 22, PostgreSQL 16, Chromium):

- `npm run typecheck` — passes.
- `npm run lint` — passes (including React Compiler rules).
- `npm run build` — production build passes.
- `npm test` (Vitest) — **26 tests passed**: money math, BD phone rules, scheduled sale pricing, personalisation validation,
  CSV safety, courier status mapping, secret encryption, SVG escaping; DB integration tests for **concurrent last‑unit purchase
  (no oversell)**, **idempotent checkout**, **coupon usage limit under concurrency**, **exactly one courier booking under
  concurrent requests**, failed bookings recorded as FAILED, personalisation snapshot on orders, try‑on demo job + retention purge.
  Integration tests use a separate database (`TEST_DATABASE_URL`, default `jerseystudio_test`), prepared non‑destructively.
- `npm run test:e2e` (Playwright, against a running seeded app) — **9 specs passed** covering the 13 required journeys:
  filters → size → bag → COD checkout → guest tracking → admin sees order → status update → mock shipment (+ duplicate
  protection); admin edits product → storefront updates; personalisation persists through checkout; try‑on upload → consent →
  job status → labelled result → delete; try‑on rejects missing consent; admin APIs/pages reject anonymous users and customer
  sessions; cross‑origin mutation blocked; mobile menu, bottom‑sheet filters, sticky purchase bar and checkout.

Not tested: live courier/payment/AI providers, email delivery, S3 storage, multi‑instance deployment, real devices/browsers
other than headless Chromium.

---

## Performance & accessibility (measured)

Lighthouse 12, mobile simulation (slow 4G, 4× CPU), production build on a shared container, 3 runs each:

| Page | Performance | LCP | TBT | CLS | Accessibility | Best practices | SEO |
|---|---|---|---|---|---|---|---|
| `/` | 59–72 | 4.7–5.9 s | 270–970 ms | 0 | 100 | 100 | 100 |
| `/shop` | 68–73 | 4.8–5.0 s | 380–550 ms | 0 | 100 | 100 | 100 |
| `/products/…` | 76–83 | 4.1–4.6 s | 200–360 ms | 0 | 99 | 100 | 92–100 |

LCP is above the 2.5 s “good” threshold. Improvements already made: catalog art served as cached responsive WebP, lazy 3D,
CSS entrance animations, lighter product cards, font preload limited to UI fonts. Next steps: move product rails/cards to
server components with small client islands, cache catalog queries, put media behind a CDN, real product photography with
optimised originals. Re‑measure on your production infrastructure.

---

## Deployment

Any Node host that runs Next.js (Vercel, Render, Railway, Fly.io, a VPS with PM2/systemd) plus managed PostgreSQL.

1. Provision PostgreSQL and S3‑compatible storage (local disk storage only works on a single server).
2. Set environment variables from `.env.example`.
3. `npm ci && npm run build` (runs `prisma generate`), then `npx prisma migrate deploy` and `npm run db:seed`.
4. `npm start`.
5. Schedule `GET /api/cron/jobs` every minute (Vercel Cron, GitHub Actions, system cron) with the bearer secret.
6. Configure webhooks: Steadfast → `https://<domain>/api/webhooks/steadfast`, Pathao → `https://<domain>/api/webhooks/pathao`,
   SSLCommerz IPN → `https://<domain>/api/payments/sslcommerz/ipn`.
7. Purge demo data if you used it; change the seeded owner password; review policy pages with a lawyer.

---

## Security & privacy

- Separate customer and admin sessions: random tokens, only SHA‑256 hashes stored, httpOnly/SameSite cookies, 12 h admin TTL,
  login rate limits and temporary lockout.
- Role‑based permissions (`src/lib/auth/permissions.ts`); every admin page, server action and admin API re‑checks on the server.
- Same‑origin check on cookie‑authenticated JSON APIs; Next.js server actions have built‑in origin checks.
- Courier, payment and AI secrets are encrypted at rest and never sent to the browser; secret fields are write‑only in the UI.
- Zod validation on all inputs; uploads sniffed by magic bytes, size‑limited and re‑encoded (removes EXIF/GPS).
- Postgres‑backed rate limiting (checkout, login, coupons, try‑on, contact, tracking).
- Webhooks verified (Steadfast bearer token, Pathao signature header); payments marked paid only after the gateway’s validation API.
- Audit log for sensitive admin actions (secrets redacted). CSV exports neutralise spreadsheet formulas.
- Money stored as integer paisa; stock decremented atomically (`UPDATE … WHERE stock >= qty`); order idempotency keys.
- **Try‑on privacy**: explicit consent (versioned) before processing; photos private and owner‑only; auto‑deleted after the
  configured retention (default 24 h) unless the customer saves the preview; delete‑now controls; staff cannot view customer photos;
  outputs labelled as AI previews; daily per‑user/global limits and a monthly budget cap.
- Marketing tags load only after consent (configurable).

---

## Backups & recovery

- Enable automated PostgreSQL backups with point‑in‑time recovery (or nightly `pg_dump -Fc`).
- Back up the media bucket (`public/` prefix). Try‑on images are deliberately short‑lived and excluded.
- Store `ENCRYPTION_KEY` in a secrets manager; losing it means re‑entering integration credentials.
- Restore drill: `pg_restore -d <new-db> backup.dump` → point `DATABASE_URL` at it → `npx prisma migrate deploy` → smoke test `/admin/settings` (System health).

---

## Known limitations & next steps

- Third‑party integrations need sandbox verification with real credentials (see above).
- LCP above target on throttled mobile; see performance next steps.
- No transactional email/SMS notifications to customers yet (order confirmation SMS is a common BD expectation).
- Abandoned‑cart **recovery messaging** is not implemented (consent fields and reporting exist).
- No refunds workflow beyond status changes; partial delivery handling is status‑level only.
- Policy pages are sensible templates, not legal advice.
- The procedural 3D jersey is a stylised garment; for photorealism upload a licensed GLB per template/product.
- Locale is cookie‑based (no `/bn` URL prefix); add localized routes if you need Bengali pages indexed separately.
