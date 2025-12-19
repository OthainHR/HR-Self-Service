# Othain ESS — VAPT Remediation Plan (Markdown)

**Version:** 1.0\
**Date:** 2025‑09‑03\
**Applies to:** [https://ess.othain.com](https://ess.othain.com)\
**Source:** TOP Certifier VAPT Report (Testing: 13 Aug 2025, Report: 29 Aug 2025)\
**Owners:** Security (Primary), Platform/Infra, Web, Data, Compliance

---

## 0) Objectives

1. **Eliminate all findings** from the VAPT report with verifiable controls and proofs.
2. **Prevent regression** via policy, CI/CD gates, and monitoring.
3. **Document runbooks** (key rotation, incident response, header/CORS changes) for repeatability.

---

## 1) Findings → Fixes (At‑a‑Glance)

| ID  | Finding                                                     | Severity (Report) | Primary Owner | Fix Status | Proof of Fix                                             |
| --- | ----------------------------------------------------------- | ----------------- | ------------- | ---------- | -------------------------------------------------------- |
| F1  | Input fields not filtered (`/tickets`)                      | Medium            | Web/API       | ❑          | Unit tests + blocked payloads                            |
| F2  | Hardcoded Supabase **anon** key exposure (`/auth/v1/token`) | Medium            | Platform      | ❑          | Key rotated + RLS enforced + 403 on direct calls         |
| F3  | Weak password policy (`/login`)                             | Medium            | Auth          | ❑          | Policy configured + rejects weak list + rate‑limit       |
| F4  | File upload validation weak (`/tickets`)                    | Medium            | Web/API       | ❑          | Magic‑byte validation + AV scan + non‑executable storage |
| F5  | Insecure CORS                                               | Medium            | Platform      | ❑          | Allowlist exact origins only + verified preflight        |
| F6  | Missing `X-Content-Type-Options`                            | Low               | Platform      | ❑          | `nosniff` present                                        |
| F7  | Missing **Content‑Security‑Policy**                         | Low               | Platform      | ❑          | CSP enforced (gradual)                                   |
| F8  | Missing `X-XSS-Protection`                                  | Low               | Platform      | ❑          | (Deprecated) Optional legacy header + CSP covers XSS     |
| F9  | Missing `X‑Frame‑Options`                                   | Low               | Platform      | ❑          | `SAMEORIGIN` + CSP `frame-ancestors`                     |
| F10 | OWASP A01 Broken Access Control (summary table)             | —                 | API/Data      | ❑          | RLS + server authz tests                                 |
| F11 | OWASP A03 Injection (inferred via F1)                       | —                 | API           | ❑          | Parametrized queries + escaping                          |
| F12 | OWASP A04 Insecure Design (general)                         | —                 | Eng           | ❑          | Secure defaults + threat model notes                     |
| F13 | OWASP A05 Security Misconfiguration (general)               | —                 | Platform      | ❑          | HSTS + WAF + env hygiene                                 |

> Legend: ❑ = To do, ✅ = Done

---

## 2) Prioritized Remediation Plan

### 🚀 **Day 0–2 (Quick Wins / High Impact)**

- Rotate leaked/anonymized **Supabase anon key** and **service role** (F2).
- Enforce **strict CORS allowlist** (prod & staging) (F5).
- Add security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, **CSP (Report‑Only)**, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal, **HSTS** (F6/F7/F9, plus hardening).
- Switch **file uploads** to non-executable storage + size cap + extension + content-type checks (basic) (F4).
- Turn on **rate limiting** for auth endpoints, lockout policy (F3).

### 🧱 **Week 1**

- Implement **server‑side validation** for every input (schema validators) + blocklists for dangerous payloads (F1/F11).
- Supabase **RLS policies** for all tables; verify anon has *read‑only* (or none) where applicable (F2/F10).
- Replace any client‑side secret uses with **Edge Functions / API layer** (F2).
- Harden file upload pipeline: magic-byte detection, AV scan, sanitize metadata, **content-disposition: attachment** (F4).
- Move CSP from Report‑Only → **Enforce** (tighten directives with nonces/hashes) (F7).

### 🧪 **Week 2–3**

- Password policy: forbid top 10k passwords, **min length 12** (+ complexity if needed), **MFA** for privileged users (F3).
- Add **WAF rules** (Cloudflare/NGINX ModSecurity CRS) for common attacks (F1/F11/F13).
- CI/CD **secrets scanning** (git‑secrets, TruffleHog) + **SCA** for dependencies.
- Monitoring & alerting for header/CORS regressions + anomaly login alerts.
- Full **retest checklist** (Section 8).

---

## 3) Implementation Guides (Copy‑Paste Ready)

### 3.1 CORS — Allowlist only (F5)

**Option A — Express/Node API**

```ts
import cors from 'cors';

const ALLOWLIST = [
  'https://ess.othain.com',
  'https://admin.othain.com',
  'https://staging-ess.othain.com'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWLIST.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
```

**Option B — NGINX (reverse proxy)**

```nginx
map $http_origin $cors_origin {
  default "";
  ~^https://(ess|admin|staging-ess)\.othain\.com$ $http_origin;
}

server {
  # ...
  add_header Vary "Origin" always;
  if ($cors_origin != "") {
    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Methods "GET,POST,PUT,PATCH,DELETE,OPTIONS" always;
  }
  if ($request_method = OPTIONS) { return 204; }
}
```

> **Never** use `*` when `credentials: true`. Keep staging and prod allowlists separate.

---

### 3.2 Security Headers (F6, F7, F8\*, F9)

(\*`X-XSS-Protection` is deprecated; include only for legacy browsers.)

**NGINX**

```nginx
# HSTS (enable only after confirming all subdomains are HTTPS)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# MIME sniffing protection
add_header X-Content-Type-Options "nosniff" always;

# Clickjacking protection
add_header X-Frame-Options "SAMEORIGIN" always;
# Stronger modern control (use with or instead of X-Frame-Options)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-__NONCE__'; style-src 'self' 'nonce-__NONCE__'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.othain.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" always;

# Optional legacy XSS header
add_header X-XSS-Protection "1; mode=block" always;

# Additional privacy-hardening
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

> Roll out CSP in **Report‑Only** first:

```nginx
add_header Content-Security-Policy-Report-Only "default-src 'self'" always;
```

Then migrate to `Content-Security-Policy` with nonces/hashes once violations are addressed.

**Express (Helmet)**

```ts
import helmet from 'helmet';
app.use(helmet({
  frameguard: { action: 'sameorigin' },
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block'); // optional legacy
  next();
});
// CSP with nonces (example)
app.use((req, res, next) => {
  const nonce = Buffer.from(crypto.randomBytes(16)).toString('base64');
  res.locals.nonce = nonce;
  res.setHeader('Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.othain.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`);
  next();
});
```

---

### 3.3 Supabase — Key Exposure, RLS, and Server Boundary (F2, F10)

**Immediate**

1. **Rotate keys** in Supabase dashboard: regenerate `anon` and `service_role`.
2. Search repos/build outputs for old JWTs and purge caches; invalidate front‑end deployments.
3. Move any sensitive operations to a **server/edge function**; client only uses `anon` for strictly public read.

**RLS Examples (Postgres SQL)** — `tickets` table

```sql
-- Enable RLS and default deny
alter table public.tickets enable row level security;
revoke all on public.tickets from anon, authenticated;

-- Policy: owners can read their own tickets
create policy tickets_select_own
on public.tickets for select
using (auth.uid() = user_id);

-- Policy: owners can insert their own tickets (server may also insert)
create policy tickets_insert_self
on public.tickets for insert
with check (auth.uid() = user_id);

-- Policy: owners can update only their tickets while status is not 'closed'
create policy tickets_update_own
on public.tickets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id and status <> 'closed');

-- Admin role can do everything (map via JWT claim 'role' = 'admin')
create policy tickets_admin_all
on public.tickets for all
using (current_setting('request.jwt.claims', true)::jsonb ? 'role'
       and (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin');
```

**Storage Bucket Policy** (files not publicly listable)

```sql
-- Example bucket: attachments
-- Only the file owner or admins can read; all writes via server URL signing
-- Pseudocode – adapt to your storage schema
```

**Server boundary**: Clients **never** send `service_role` or write directly into privileged tables; use a server endpoint to attach `user_id` from JWT, not from client payloads.

**Blocking direct PostgREST calls**: Create a network ACL/WAF rule so only your API origin can reach Supabase REST if desired.

---

### 3.4 Input Validation & Injection Defense (F1, F11)

**Server‑side schema validation** (TypeScript + Zod example)

```ts
import { z } from 'zod';

const ticketCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(5000),
  priority: z.enum(['low','medium','high']),
  attachments: z.array(z.string().uuid()).optional()
});

app.post('/api/tickets', async (req, res) => {
  const parsed = ticketCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  // use parameterized queries / ORM — no string concat
});
```

**Parameterized queries** (Node pg)

```ts
await pool.query('insert into tickets(user_id,title,description) values($1,$2,$3)', [uid, title, desc]);
```

**Output encoding**: escape any user content when rendering HTML; in React default escaping helps; avoid `dangerouslySetInnerHTML`.

**WAF**: Enable CRS rules for SQLi/XSS; log blocked attempts.

---

### 3.5 Password Policy, Brute‑Force Controls, MFA (F3)

**Policy**

- Min length **≥ 12**.
- Must include at least 3 of: upper, lower, digit, symbol **or** adopt a passphrase policy (min 3 words).
- Block top 10k breached passwords (k‑anonymity HIBP lookup or local list).
- Rotate reset tokens quickly (≤ 10 minutes); single‑use.

**Rate limiting**

```ts
import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });
app.use('/auth/login', login
```
