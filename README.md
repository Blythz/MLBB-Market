### MLBB Market — Next.js + Firebase

An MLBB (Mobile Legends) account marketplace built with Next.js App Router and Firebase. It supports listings, seller verification workflow, chat between buyers and sellers, wishlists, and basic reviews.

---

#### Stack
- Next.js 15 (App Router) + React 19 + TypeScript 5
- Tailwind CSS v4 + Radix UI/shadcn components
- Firebase Web SDK (Auth, Firestore, Storage)
- Resend (transactional email)

---

#### Features
- Browse and search listings with client-side filtering and sorting
- Create, manage, and mark listings as sold (seller/admin)
- Seller verification flow with KYC upload and status badges
- Buyer↔Seller chat per listing
- Wishlist (Firestore when signed-in, local fallback when not configured)
- Seller reviews (basic average/count display)
- Webhook to send emails on seller status changes via Resend

---

#### Directory structure (high level)
```text
app/
  layout.tsx                   # Root layout (fonts, global CSS)
  (market)/                    # Main UI
    page.tsx                   # Browse/search listings
    new/page.tsx               # Create listing (gated)
    listing/[id]/page.tsx      # Listing details + chat/inbox
    sellers/page.tsx           # Verified sellers directory
    seller/[uid]/page.tsx      # Seller profile
    loading.tsx                # Route-level loading
  api/webhooks/seller-status/route.ts  # Resend email webhook
components/
  auth-provider.tsx            # Auth + profile context (Firebase)
  listing-*.tsx, chat/*, reviews/*, ui/*, header, wishlist-sheet
hooks/                         # use-wishlist, use-seller-review-summary, toast
lib/                           # firebase bootstrap, email templates, utils
types/                         # listing, user
utils/                         # formatters
styles/                        # Tailwind theme (globals.css)
```

---

#### Prerequisites
- Node.js 18+ (LTS recommended)
- pnpm (recommended) or npm/yarn
- Firebase project (Auth + Firestore + Storage enabled)
- Optional: Resend account for transactional emails

---

#### Environment variables
Create a `.env.local` at the project root with the following:

```bash
# Public Firebase config (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# App URL (used in email CTA links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (emails for seller status changes)
RESEND_API_KEY=...
EMAIL_FROM="MLBB Market <noreply@example.com>"

# Webhook shared secret (header: x-webhook-secret)
WEBHOOK_SECRET=dev_secret
```

If Firebase env vars are missing, the app falls back to a demo mode with placeholder data and no writes.

---

#### Install and run
```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

Build and start:
```bash
pnpm build
pnpm start
```

Note: `next.config.mjs` currently ignores TypeScript and ESLint errors during build for DX. Tighten as needed.

---

#### Firebase setup
1) Enable Authentication (Google provider if you want Google popup sign-in)
2) Enable Firestore (in Native mode)
3) Enable Storage
4) Create the web app in Firebase console to obtain the public config

Recommended Firestore rules (baseline, adapt to your needs):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }

    match /users/{uid} {
      allow read: if true;
      // Allow users to create their profile; updates limited to their own doc
      allow create: if signedIn() && request.auth.uid == uid;
      allow update: if signedIn() && request.auth.uid == uid;
    }

    match /users/{uid}/wishlist/{listingId} {
      allow read: if signedIn() && request.auth.uid == uid;
      allow write: if signedIn() && request.auth.uid == uid;
    }

    match /listings/{id} {
      allow read: if true;
      allow create: if signedIn();
      allow update, delete: if signedIn() && request.resource.data.userId == request.auth.uid;
    }

    match /conversations/{convoId} {
      allow read, write: if signedIn();
    }

    match /conversations/{convoId}/messages/{messageId} {
      allow read, write: if signedIn();
    }

    match /reviews/{reviewId} {
      allow read: if true;
      allow create, update: if signedIn();
    }
  }
}
```

Storage rules (uploads for listings and seller applications):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signedIn() { return request.auth != null; }

    match /listings/{uid}/{allPaths=**} {
      allow read: if true;
      allow write: if signedIn() && request.auth.uid == uid;
    }

    match /seller-applications/{uid}/{allPaths=**} {
      allow read: if false; // KYC should not be public
      allow write: if signedIn() && request.auth.uid == uid;
    }
  }
}
```

---

#### Webhook: Seller status emails
Endpoint: `POST /api/webhooks/seller-status`

Headers:
- `x-webhook-secret: <WEBHOOK_SECRET>`

Body: flexible. The handler supports both plain JSON and Firestore-trigger style shapes; it extracts `email`, `sellerStatus`, and optional `fullName` from either `before/after` or `oldValue/value` structures. Only `approved`, `rejected`, and `pending` trigger emails.

---

#### Known caveats
- Double provider: `components/header.tsx` wraps itself with `AuthProvider` while `app/(market)/layout.tsx` already provides it. Use one to avoid duplicate subscriptions.
- Review eligibility check in `app/(market)/seller/[uid]/page.tsx` likely never passes because conversation IDs are created as `${listingId}_${buyerId}` elsewhere. Prefer a query on `conversations` where `sellerId == uid` and `buyerId == currentUser`.

---

#### License
MIT. See `LICENSE`.


