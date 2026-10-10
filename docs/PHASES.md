# Build phases — status

| Phase | Implemented | Tested | Requires credentials | Remaining |
|---|---|---|---|---|
| 1 Foundation | Next.js 16 app, Prisma schema (35 models) + migrations, seed (base + demo), DB sessions, RBAC, settings, i18n, design tokens | typecheck, lint, unit tests | — | — |
| 2 Storefront | Home (CMS sections), shop/collections + filters, PDP, cart, checkout (COD/SSLCommerz), success, tracking, accounts, content pages, SEO | E2E journeys 1–4, 13; Lighthouse | SSLCommerz (optional) | Performance (LCP) tuning |
| 3 Commerce backend & admin | Orders workflow, products editor, inventory, categories, collections, customers, discounts, reviews, analytics, staff/roles, audit logs, CSV import/export | Integration tests (oversell, idempotency, coupons); E2E 5, 6, 8, 12 | — | Refund workflow |
| 4 AI try‑on | Provider adapter (Vertex AI + demo), job queue, consent, limits, budget, retention, private media, studio UI | Integration (demo job + purge), E2E 9, 10 | Google Cloud service account + model access | Live verification |
| 5 3D customizer | Procedural R3F jersey, live canvas textures with webfonts, templates, server‑validated designs, 2D fallback, GLB support | E2E 11, unit validation | Licensed GLB (optional) | Photoreal model |
| 6 Couriers | Shared adapter interface, Steadfast, Pathao (OAuth), mock mode, idempotent booking, webhooks, polling, auto‑booking rules, shipping dashboard | Integration (single booking under concurrency, failure recording), E2E 7 | Steadfast & Pathao merchant credentials | Live/sandbox verification |
| 7 CMS & polish | Homepage editor (draft/preview/publish), appearance editor (draft/preview/publish, contrast checks), media library, notifications, motion | E2E (admin edit), manual screenshots | — | — |
| 8 Testing & deployment | Vitest + Playwright suites, README, .env.example, worker script | All suites executed | — | CI pipeline, staging deploy |
