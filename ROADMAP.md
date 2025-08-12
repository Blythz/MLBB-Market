### MLBB Market — Roadmap and Optimization Plan

This document outlines prioritized improvements for performance, DX, reliability, and features. Grouped by timeframe.

---

#### Short term (1–2 weeks)
- AuthProvider duplication
  - Remove the extra provider in `components/header.tsx` and rely on `app/(market)/layout.tsx` wrapping.
  - Audit for any context usage that assumes nested providers.

- Reviews eligibility correctness
  - In `app/(market)/seller/[uid]/page.tsx`, compute `canReview` via a Firestore query on `conversations` where `sellerId == uid` and `buyerId == currentUser`.
  - Optionally gate reviews to only buyers who completed a transaction once a checkout flow exists.

- Tighten `next.config.mjs`
  - Re-enable TypeScript and ESLint checks during CI/build. Address any resulting issues.

- Firestore/Storage security rules
  - Enforce stricter rules for conversations and messages (only participants can read/write).
  - Lock KYC storage paths to owners only; consider expiring signed URLs for admin review.

- Input validation
  - Use `zod` on listing creation and seller application to validate client inputs before writes.

---

#### Performance and UX
- Listings
  - Add Firestore indexing for common queries (e.g., listings by `userId`, sorted by `createdAt`).
  - Use server components and/or edge caching for the home page skeleton (SSR) and progressively hydrate client pieces.
  - Paginate infinite scroll on listings instead of loading entire collection.

- Chat
  - Use batched writes for send + metadata update to reduce round-trips.
  - Virtualize long message lists.

- Images
  - Enforce image size limits on client and via Storage rules.
  - Add background image optimization/CDN if moving off Next image optimization.

---

#### Mid term (3–6 weeks)
- Role/admin surface
  - Add lightweight admin UI to approve/reject sellers, with audit trail.
  - Trigger the Resend webhook (or direct API call) upon status change from the admin UI.

- Payments/checkout (optional)
  - Introduce escrow-like flow or third-party payment integration.
  - Mark listing sold automatically after successful payment.

- Notifications
  - Add FCM or email notifications for new messages and status updates.

- Accessibility and i18n
  - Improve keyboard nav, ARIA labels, and focus states.
  - Externalize copy for translations; consider `next-intl`.

---

#### Long term (6–12+ weeks)
- Anti-fraud and trust
  - Seller reputation scoring, dispute reporting, and moderation tools.
  - Stronger KYC workflow with admin review dashboard.

- Observability
  - Add logging and metrics (e.g., Sentry) for client and server actions.

- Scalability
  - Migrate heavy client features to RSC where feasible.
  - Introduce composite indexes and sharding strategies if collections grow large.

---

#### Engineering hygiene
- CI/CD
  - Add CI with lint, typecheck, and simple e2e smoke using Playwright.
  - Preview deployments for PRs.

- Testing
  - Unit tests for hooks (`use-wishlist`, `use-seller-review-summary`), lib (`firebase`, `email`).
  - Component tests for dialogs (login, apply, chat).

- Code consistency
  - Enforce Prettier + ESLint (Next preset) across the repo.
  - Adopt commit lint and changesets for versioning if this becomes a package.

---

#### Nice-to-haves
- Saved filters and server-side search facets.
- Bulk image upload with reorder and cover selection.
- User-to-user dispute resolution templates and flows.


