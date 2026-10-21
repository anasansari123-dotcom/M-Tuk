# MTUK Nagar Ride Admin

Standalone operations dashboard for MTUK Nagar Ride. It runs on the **same Supabase project** as the
mobile app and Render backend, but has its own repository and Vercel deployment. The website runtime
uses no service-role key.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · Recharts · Supabase SSR ·
Google Maps JavaScript API.

## How access control works

1. **`proxy.ts`** refreshes the Supabase session cookie and sends signed-out visitors to `/login`.
2. **`requireAdmin()`** (`src/lib/auth.ts`) runs in the admin layout. It verifies the JWT with
   `getClaims()` and calls `public.is_admin()`. Signed-in passengers or drivers are refused.
3. **Every Server Action and the CSV route re-check admin** with `checkAdmin()`.
4. **The database is the real gate.** Every query runs as the signed-in admin. RLS gives cross-user
   read access only through `is_admin()`. Writes go only through `security definer` functions that
   re-check `is_admin()` and write the audit log in the same transaction.

So even if the UI checks were bypassed, a non-admin token would get no rows and no writes.

## Setup

### 1. Apply the database migration (once)

Open the Supabase SQL editor and run **`supabase/admin.sql`**, then **`supabase/public.sql`**. Both are idempotent and only *add*.

`admin.sql` adds:

| Object | Purpose |
|---|---|
| `admin_users` table | Who is an admin. No insert policy, so rows can only be added from the SQL editor. |
| `is_admin()` | Used by RLS and the app. |
| `providers.verification_status`, `verification_note`, `verification_updated_at`, `verification_updated_by` | Driver verification. Existing drivers start as `pending`. |
| Trigger `providers_protect_verification` | Stops drivers from approving themselves through the existing own-row upsert. |
| `admin_audit_log` table | Append-only log. Admins can read it; nobody can write it directly. |
| `"... admins read"` policies on `passengers`, `providers`, `rides` | Admin read access. Existing policies are untouched. |
| `admin_set_driver_status`, `admin_cancel_ride` | The only admin writes. Validated and audited. |
| `admin_overview`, `admin_ride_trend`, `admin_signup_trend`, `admin_cancellation_breakdown`, `admin_ride_counts` | Aggregation in the database, so the browser never downloads tables. |
| Indexes on `created_at` / `verification_status` | Back the list pages and date-range reports. |

`public.sql` adds the public website tables: `partner_applications`, `contact_messages`, the
`partner-documents` storage bucket, and the functions that let anonymous visitors submit KYC. After
an application is approved, the same email can sign in to the mobile app. Ride pickup is allowed
only when `providers.verification_status = 'approved'`.

Effect on the mobile app and backend: passengers are unchanged. Drivers keep their profile upsert.
Unapproved, rejected or suspended drivers can no longer accept rides. Approve existing drivers
before rolling this out, or they will all be blocked.

### 2. Create an admin

There is no default admin and no hardcoded password.

Run the included one-time provisioning command from this repository:

```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-temporary-service-role-key"
$env:ADMIN_EMAIL="admin@mtuknagarride.com"
npm run admin:create
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

Save the generated password printed once by the command. The script uses the Supabase Admin API,
grants the database role in `public.admin_users`, and never puts the service-role key in the website
bundle. `ADMIN_PASSWORD` is optional when you need to choose rather than generate the password.

You can instead create an auto-confirmed Auth user in the Supabase dashboard and add its user ID to
`public.admin_users` from the SQL editor. To revoke access, delete that row from `admin_users`.

Consider enabling MFA for admin accounts in Supabase Auth.

### 3. Environment

```bash
cp .env.example .env.local
```

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same project URL as the app (`EXPO_PUBLIC_SUPABASE_URL`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same **publishable** key as the app |
| `NEXT_PUBLIC_API_URL` | `https://e-rido.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser key, restricted (see below) |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Map ID for advanced markers |

All runtime values are browser-safe by design. Never put the service-role key in `.env.local` or
Vercel; use it only in the temporary provisioning shell above.

### 4. Google Maps

In Google Cloud Console (same project as the app's keys):

1. Enable **Maps JavaScript API**. The admin site uses nothing else: no Places, Routes or
   Geocoding calls from the browser.
2. Create a **new** API key for the admin site:
   - Application restriction: **Websites**, e.g. `https://admin.yourdomain.com/*` and
     `http://localhost:3000/*` for development.
   - API restriction: **Maps JavaScript API** only.
3. Map Management → create a **Map ID** (JavaScript, vector) → `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.

Keep the backend's `GOOGLE_MAPS_SERVER_API_KEY` (Places + Routes) and the app's Android/iOS keys
separate. The map loads once per visit to `/live-map`, and Realtime changes trigger one batched
database refetch, not map calls.

## Local development

```bash
cd mtuk-nagar-ride-admin
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # typecheck
npm run lint
npm run build
```

## Deploy to Vercel

1. Import this standalone repository in Vercel. Keep **Root Directory** at the repository root; the
   Next.js framework preset is detected automatically.
2. Add the five environment variables above for Production (and Preview if you use it).
3. Deploy, then add the production domain to the Maps key's website restrictions.
4. In Supabase → Authentication → URL Configuration, add the admin domain to the redirect URLs. Only
   needed if you later add password-reset or magic-link flows; password sign-in works without it.

The site sends `X-Robots-Tag: noindex`, `X-Frame-Options: DENY` and `Cache-Control: private, no-store`.

## What the admin site reuses

**Backend endpoints (Render):** only `GET /health`, which returns `{"status":"ok"}` and nothing more.
The admin site does not call the passenger/driver endpoints: they act as the signed-in user, and
admin operations need different rules, so those live in the SQL functions above.

**Supabase tables:** `passengers`, `providers`, `rides` (owned by the mobile backend repository), plus the
`admin_users` and `admin_audit_log`. `rides.passenger_id` and `rides.driver_id` reference
`auth.users`; the dashboard joins them to `passengers`/`providers` by id. The admin site never
selects `rides.otp`.

**Ride statuses** (owned by the mobile backend service): `requested` → `accepted` → `arriving` (driver at
pickup) → `ongoing` → `completed`, or `cancelled`. Admins may cancel `requested`, `accepted` and
`arriving` rides. `ongoing` rides are finished by the driver.

## Feature status

| Area | Status | Notes |
|---|---|---|
| Admin login, roles, session, logout | Implemented | Supabase password auth + `admin_users` |
| Dashboard | Implemented | Live counts, date-range metrics, trend, recent activity, API health |
| Customers + detail | Implemented | Search, sort, date filter, ride counts and history |
| Customer disable/delete | **Unsupported** | No account-status model exists; nothing is offered |
| Drivers + detail + verification | Implemented | Approve / reject / suspend / back to pending, with reasons and audit |
| Driver documents, rating, availability | Documents implemented | Licence, RC, vehicle photo and ID via Become a partner. Rating / live GPS still unsupported |
| Rides + detail + admin cancel | Implemented | All real statuses, search, filters, timeline, audited cancel |
| Final fare, payment status, cancel reason | **Unsupported** | Only the booking quote exists; admin cancel reasons are in the audit log |
| Live map | Partial | Real pickup/destination markers for active rides, Realtime updates. **No driver GPS**: the app never stores it |
| Reports + CSV + print | Implemented | Ride stats, growth, cancellation stages, verification. CSV capped at 10,000 rows per range |
| Payments | **Unsupported** | No payment data. The page explains what is needed |
| Fare / service settings | **Unsupported** | Fares are computed in backend code. Proposal on the Settings page |
| Notifications | **Unsupported** | No push/email/SMS infrastructure. Proposal on the page |
| System status | Implemented | Backend `/health`, Supabase checks, env presence (never values) |
| Audit log | Implemented | Append-only, written in the same transaction as each change |

## Security findings in the existing system (not changed)

These predate the admin site. They are listed here because the admin features depend on them. Each
fix changes mobile-app behaviour, so none was applied without your decision.

1. **Roles live in `user_metadata`.** Any signed-in user can call
   `supabase.auth.updateUser({ data: { role: 'driver' } })` and the backend's `isDriver()` will
   believe it. Fix: decide the role server-side, e.g. a driver must have a `providers` row, or store
   the role in `app_metadata` set by the backend.
2. **OTPs of open rides are readable.** Policy `rides read own or open` lets *any* authenticated user
   select every `requested` ride directly from Supabase, including `otp` and `passenger_phone`. Fix:
   remove `or status = 'requested'` and serve the open-ride list only through the backend (which
   already strips the OTP), or move the OTP to a separate table.
3. **Rides can be changed without the backend.** `rides driver accepts open` lets any
   authenticated user (passengers too) claim a ride, and both update policies allow changing any
   column (`fare`, `status`, …) directly. Fix: drop the direct update policies and let only the
   backend (or security definer functions) change rides.
4. **Driver approval is now enforced on pickup.** `POST /rides/:id/accept` requires
   `providers.verification_status = 'approved'`. Approve existing drivers first, or they will all be
   blocked. Website partner applications feed that same status.

## Proposed next steps (not implemented)

- **Driver live location:** add a `driver_locations` table (one row per driver: lat, lng, updated_at,
  online). The driver app writes it every 15–30 s only while online and on a trip, with clear consent
  text. RLS: own-row write, admin read. The live map would then show markers with "last updated", and
  hide anything older than ~2 minutes.
- **Payments, fare settings, notifications:** see the respective pages.
#   M - T u k  
 