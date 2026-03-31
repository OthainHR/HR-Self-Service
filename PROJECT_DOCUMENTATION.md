# OthainSoft ESS Portal — Complete Project Documentation

> **Version:** Current (March 2026)  
> **Live URL:** https://ess.othain.com  
> **Repository:** https://github.com/OthainHR/HR-Self-Service

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Folder Structure](#4-folder-structure)
5. [Frontend Pages & Routes](#5-frontend-pages--routes)
6. [Ticketing System — Categories & Routing](#6-ticketing-system--categories--routing)
7. [Cab Booking Service](#7-cab-booking-service)
8. [Email Notification System](#8-email-notification-system)
9. [User Roles & Permissions](#9-user-roles--permissions)
10. [Database (Supabase) Tables](#10-database-supabase-tables)
11. [Row Level Security (RLS) Rules](#11-row-level-security-rls-rules)
12. [Backend (FastAPI) — AI & HR Integration](#12-backend-fastapi--ai--hr-integration)
13. [Keka HRMS Integration](#13-keka-hrms-integration)
14. [Deployment Setup](#14-deployment-setup)
15. [Environment Variables](#15-environment-variables)
16. [SQL Fix Scripts Reference](#16-sql-fix-scripts-reference)
17. [Known Issues & Resolutions Log](#17-known-issues--resolutions-log)

---

## 1. Project Overview

The **OthainSoft Employee Self-Service (ESS) Portal** is a full-stack web and mobile application that allows employees at OthainSoft to:

- Raise and track support tickets (IT, HR, Accounts, Operations, Expense, AI)
- Book cab / transport services
- Chat with an AI-powered HR assistant
- View leave balances, payslips, attendance, and holidays (via Keka HRMS)
- Manage their profile

Admins (HR, IT, Accounts, Operations, AI teams) use the same portal to manage and resolve tickets, assign cabs, and export reports.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React (Create React App) | 18.2.0 |
| **UI Framework** | Material UI (MUI) | v5 |
| **Routing** | React Router | v6 |
| **Animations** | Framer Motion | v12 |
| **Charts** | Recharts | v2 |
| **Icons** | FontAwesome + MUI Icons | — |
| **Database & Auth** | Supabase (PostgreSQL + Auth) | v2 |
| **Edge Functions** | Supabase Edge Functions (Deno) | — |
| **AI Chatbot Backend** | FastAPI (Python) | — |
| **AI Model** | OpenAI GPT API | — |
| **Knowledge Search** | FAISS vector search + OpenAI embeddings | — |
| **HR Integration** | Keka HRMS API (OAuth + Direct Key) | — |
| **Mobile** | Capacitor (Android + iOS) | — |
| **Frontend Deploy** | Vercel | — |
| **Backend Deploy** | Render.com | — |
| **Email Delivery** | Microsoft Graph API (MS365 mailboxes) | — |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     User / Employee                      │
│              Browser (ess.othain.com)                    │
│              Mobile App (Android / iOS)                  │
└───────────────────────┬─────────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   React Frontend    │
              │   (Vercel)          │
              └──┬──────────────┬──┘
                 │              │
    ┌────────────▼───┐   ┌──────▼───────────────┐
    │   Supabase      │   │  FastAPI Backend      │
    │   (PostgreSQL)  │   │  (Render.com)         │
    │   - Auth        │   │  - AI Chat (OpenAI)   │
    │   - Tickets     │   │  - Keka HRMS sync     │
    │   - Cab Books   │   │  - Knowledge base     │
    │   - RLS         │   │  - FAISS search       │
    │   - Edge Fns    │   └──────────┬────────────┘
    └────────────┬───┘              │
                 │          ┌───────▼────────┐
                 │          │  Keka HRMS API  │
                 │          │  (External)     │
                 │          └────────────────┘
                 │
    ┌────────────▼──────────────┐
    │  Microsoft Graph API       │
    │  (Email notifications)     │
    │  hr@othainsoft.com         │
    │  it@othainsoft.com         │
    │  accounts@othainsoft.com   │
    └────────────────────────────┘
```

---

## 4. Folder Structure

```
HR-Self-Service/
│
├── frontend/                          # React web + mobile app
│   ├── src/
│   │   ├── App.js                     # Root component, routes, theme
│   │   ├── pages/                     # One file per page/route
│   │   ├── features/
│   │   │   └── ticketing/             # All ticket-related components
│   │   │       ├── components/        # TicketForm, KanbanBoard, TicketList, etc.
│   │   │       ├── pages/             # TicketDetailPage
│   │   │       └── TicketingPage.jsx  # Feature wrapper
│   │   ├── components/                # Shared UI (NavBar, Chat, HR widgets)
│   │   │   └── hr/                    # HR-specific widgets (leave, payslips, etc.)
│   │   ├── contexts/                  # AuthContext, DarkModeContext
│   │   ├── services/                  # supabase.js, api.js, hrServiceDirect.js
│   │   ├── utils/                     # ticketUtils.js, helper functions
│   │   └── hooks/                     # Custom React hooks
│   ├── public/                        # Static assets, logos
│   ├── vercel.json                    # Vercel deployment config
│   └── .env.production                # DISABLE_ESLINT_PLUGIN=true
│
├── backend/                           # FastAPI Python backend
│   ├── app/
│   │   ├── main.py                    # App entry point, CORS, middleware
│   │   ├── routers/                   # API route handlers
│   │   ├── services/                  # Business logic
│   │   ├── models/                    # Pydantic data models
│   │   └── utils/                     # Auth, Supabase, OpenAI helpers
│   ├── requirements.txt
│   └── render.yaml                    # Render.com deployment config
│
├── supabase/
│   ├── functions/
│   │   └── reset-password/index.ts    # Edge function: admin password reset
│   └── migrations/                    # Database schema migrations
│
├── cab_migrations/                    # Cab service DB migrations
│
└── *.sql                              # Root-level SQL fix/migration scripts
```

---

## 5. Frontend Pages & Routes

| Route | File | Who Can Access | Description |
|---|---|---|---|
| `/login` | `Login.js` | Public | Email/password login |
| `/register` | `Register.js` | Public | New user registration |
| `/` or `/home` | `Home.js` | All logged-in | Home dashboard with quick links |
| `/chat` | `Chat.js` | All logged-in | AI HR chatbot |
| `/hr` | `HRSelfService.js` | All logged-in | Leave, payslips, attendance (Keka) |
| `/tickets` | `TicketingPage.jsx` | All logged-in | Raise and track tickets |
| `/expense-tickets` | `ExpenseTicketingPage.jsx` | All logged-in | Expense tickets |
| `/ticket/:id` | `TicketDetailPage.jsx` | Requester + Assignee | Single ticket detail view |
| `/ticket-dashboard` | `TicketDashboard.jsx` | Admins | Ticket overview dashboard |
| `/cab-service` | `CabService.js` | Whitelisted employees | Cab booking |
| `/profile` | `Profile.js` | All logged-in | Profile & photo management |
| `/onboarding` | `OnboardingPage.jsx` | All logged-in | New employee onboarding wizard |
| `/knowledge` | `Knowledge.js` | All logged-in | Knowledge base viewer |
| `/report` | `AdminReport.js` | Admin only | Reports & analytics |
| `/admin` | Admin page | Admin only | Admin control panel |

---

## 6. Ticketing System — Categories & Routing

### Ticket Categories

| Category | Prefix | Assigned To | Email Sender |
|---|---|---|---|
| **IT Requests** | `OTH-IT` | `it@othainsoft.com` | `it@othainsoft.com` |
| **HR Requests** | `OTH-HR` | `hr@othainsoft.com` | `hr@othainsoft.com` |
| **Accounts / Payroll** | `OTH-ACC` / `OTH-PAY` | `accounts@othainsoft.com` | `accounts@othainsoft.com` |
| **Expense Management** | `OTH-EXP` | `accounts@othainsoft.com` | `accounts@othainsoft.com` |
| **Operations** | `OTH-OPS` | `hr@othainsoft.com` | `hr@othainsoft.com` |
| **AI Requests** | `OTH-AI` | `sunhith.reddy@othainsoft.com` | `it@othainsoft.com` |

### Operations Sub-Categories (All go to HR)
- Lighting
- Air Conditioning (AC)
- Stationary
- Printing
- Supply Requests
- Facilities & Events

### Ticket Lifecycle

```
Employee raises ticket
        ↓
Auto-assigned to department admin
        ↓
Email sent to: requester + assignee (HR is always CC'd on Operations)
        ↓
Admin views ticket → changes status / adds comments
        ↓
Email notification sent on every update/reply
        ↓
Ticket closed → status = RESOLVED / CLOSED
```

### Ticket Statuses

| Status | Description |
|---|---|
| `WAITING FOR SUPPORT` | Newly created, not yet picked up |
| `WAITING FOR APPROVAL` | Pending approval from a manager |
| `IN_PROGRESS` | Being actively worked on |
| `RESOLVED` | Issue resolved |
| `CLOSED` | Ticket closed |

### Ticket Priorities

`Low` → `Medium` → `High` → `Urgent`

### Who Can See Which Tickets (RLS)

| Role / Email | Visible Categories |
|---|---|
| `hr@othainsoft.com` | HR Requests + Operations |
| `it@othainsoft.com` | IT Requests |
| `accounts@othainsoft.com` | Accounts + Payroll + Expense |
| `operations@othainsoft.com` | Operations |
| `ai@othainsoft.com` | AI Requests |
| `tickets@othainsoft.com` | ALL (super-admin) |
| Employee (any) | Only their own tickets |
| `admin` role | ALL |

---

## 7. Cab Booking Service

### How It Works

1. Employee opens **Cab Service** page
2. Only **whitelisted employees** (added by HR) can book
3. Employee selects:
   - **Pickup Time** — `9pm`, `11:30pm`, `2:30am`
   - **Department** — `GBT`, `Presidio`, `Othain`
   - **Pickup Location** — from whitelisted location
   - **Drop-off Location** — from whitelisted location
4. Booking is saved in `cab_bookings` table
5. HR Admin views all bookings by date and exports Excel reports

### Department Booking Cutoff Times (IST)

| Department | Cutoff Time |
|---|---|
| **GBT** | 4:00 PM IST |
| **Presidio** | 7:00 PM IST |
| **Othain** | 7:00 PM IST |

### Overall Booking Window

Bookings are **open from 3:30 AM to 2:30 AM IST** (closed only 2:30 AM – 3:30 AM IST).

### HR Admin Controls

- Add/remove employees from the whitelist
- Assign fixed pickup time, pickup location, and drop-off location per employee
- Enable/disable cab service globally
- Export daily booking reports as Excel (`.xlsx`)
- Group bookings by location for easy cab coordination
- Send reminders to employees

### Key Database Tables

| Table | Purpose |
|---|---|
| `cab_bookings` | All booking records |
| `cab_booking_whitelist` | Employees permitted to book |
| `cab_locations` | Known pickup/drop-off locations with coordinates |
| `cab_location_groups` | Groupings of locations for Excel export |

---

## 8. Email Notification System

Emails are sent via **Microsoft Graph API** from the relevant department mailbox.

### Trigger Points

| Event | Recipients |
|---|---|
| New ticket created | Requester + Assignee |
| Ticket updated (status/priority/assignee) | Requester + Assignee |
| Admin replies to ticket | Requester |
| Employee replies to ticket | Assignee |
| Internal note added | Assignee |
| Any Operations ticket event | HR always included in TO + CC |
| Any AI ticket event | `sunhith.reddy@othainsoft.com` always CC'd |

### Email From Addresses

| Category | Sent From |
|---|---|
| IT | `it@othainsoft.com` |
| HR + Operations | `hr@othainsoft.com` |
| Accounts + Payroll + Expense | `accounts@othainsoft.com` |
| AI | `it@othainsoft.com` |

### Supabase Edge Function

The email logic lives in:
`frontend/src/features/ticketing/components/emailsend.ts`

This file is deployed as a **Supabase Edge Function** (Deno runtime). It is triggered by database webhooks on INSERT/UPDATE of tickets and ticket communications.

> **To redeploy after changes:**
> ```bash
> supabase functions deploy send-email
> ```

---

## 9. User Roles & Permissions

### Role Definitions

| Role | Description |
|---|---|
| `admin` | Global admin — sees all tickets, all data |
| `hr_admin` | HR team — manages HR Requests + Operations tickets |
| `it_admin` | IT team — manages IT Requests tickets |
| `payroll_admin` | Accounts team — manages Payroll + Expense tickets |
| `operations_admin` | Operations team (legacy, now handled by HR) |
| `ai_admin` | AI team — manages AI Requests tickets |
| *(none)* | Regular employee — sees only their own tickets |

### How Roles Are Set

Roles are stored in the **Supabase auth user metadata** (`user_metadata.role`).  
Set by a Supabase admin in the Supabase Dashboard → Authentication → Users.

### Admin Emails (Auto-detected as admin in UI)

The following emails are automatically treated as admin users in the frontend:
- Anyone with `@othainsoft.com` email domain
- `hr@othainsoft.com`
- `it@othainsoft.com`
- `accounts@othainsoft.com`
- `ai@othainsoft.com`

---

## 10. Database (Supabase) Tables

### Core Tables

| Table | Description |
|---|---|
| `tickets` | All support tickets (IT, HR, Accounts, Operations, Expense, AI) |
| `categories` | Ticket categories (IT Requests, HR, Operations, etc.) |
| `sub_categories` | Sub-categories under each category |
| `ticket_communications` | Comments, admin replies, customer replies, internal notes |
| `ticket_additional_emails` | Extra email recipients CC'd on ticket updates |
| `ticket_assignees` | Users who can be assigned tickets (by role) |
| `cab_bookings` | Cab booking records |
| `cab_booking_whitelist` | Employees allowed to book cabs |
| `cab_locations` | Known pickup/drop-off locations with GPS coordinates |
| `cab_location_groups` | Location groupings for Excel export |
| `users` | Synced user profile data |

### Views

| View | Description |
|---|---|
| `v_ticket_board` | Full ticket data including category/assignee/requester details |
| `v_user_emails` | Maps user IDs to email addresses (used for auto-assignment) |
| `v_booking_with_coords` | Cab bookings joined with location coordinates |

### Key Functions (Supabase RPC)

| Function | Purpose |
|---|---|
| `get_user_id_by_email(email)` | Returns user UUID for a given email |
| `get_user_role()` | Returns the current user's role from JWT |
| `get_ticket_additional_emails(ticket_id)` | Returns extra email recipients for a ticket |
| `user_in_additional_emails(ticket_id, user_id)` | Boolean check used in RLS |
| `handle_disclaimer_acknowledgement()` | Records when user accepts disclaimer |

---

## 11. Row Level Security (RLS) Rules

All tables have RLS enabled. The rules ensure strict data isolation.

### Tickets Table — Access Rules

```
SELECT / UPDATE allowed when ANY of these is true:
  - You are the ticket requester (requested_by = your user ID)
  - You are the ticket assignee (assignee = your user ID)
  - You are tickets@othainsoft.com (super-admin)
  - Your email is hr@ AND category is HR Requests or Operations
  - Your email is it@ AND category is IT Requests
  - Your email is accounts@ AND category is Accounts/Payroll/Expense
  - Your email is ai@ AND category is AI Requests
  - Your role is hr_admin AND category is HR Requests or Operations
  - Your role is it_admin AND category is IT Requests
  - Your role is payroll_admin AND category is Accounts/Payroll/Expense
  - Your role is ai_admin AND category is AI Requests
  - You are in the ticket's additional_emails list
  - Your role is admin (global admin)
```

> **To apply RLS changes:** Run `fix_operations_rls.sql` in Supabase SQL Editor.

---

## 12. Backend (FastAPI) — AI & HR Integration

**Base URL:** `https://hr-self-service.onrender.com`

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/token` | Login, returns JWT |
| `POST` | `/api/auth/register` | Register new user |
| `GET` | `/api/auth/me` | Get current user info |
| `GET` | `/api/chat/sessions` | List chat sessions |
| `POST` | `/api/chat/sessions` | Create new chat session |
| `POST` | `/api/chat/public` | Send message to AI (streaming) |
| `GET` | `/api/hr/profile` | Get employee Keka profile |
| `GET` | `/api/hr/leave-balance` | Get leave balances |
| `POST` | `/api/hr/leave-apply` | Apply for leave |
| `GET` | `/api/hr/attendance` | Get attendance records |
| `GET` | `/api/hr/payslips` | Get payslip list |
| `GET` | `/api/hr/holidays` | Get company holidays |
| `POST` | `/api/knowledge/upload` | Upload knowledge document |
| `GET` | `/api/knowledge/search` | Search knowledge base |
| `POST` | `/api/sync/keka` | Trigger Keka employee sync |

### AI Chat Flow

```
Employee sends message
        ↓
FastAPI receives request
        ↓
Build context from:
  - Chat history (Supabase)
  - HR data (Keka)
  - Knowledge base (FAISS)
        ↓
Send to OpenAI GPT
        ↓
Stream response back to frontend
        ↓
Save message to Supabase
```

---

## 13. Keka HRMS Integration

The portal integrates with **Keka HRMS** to fetch employee data in real-time.

### Data Fetched from Keka

| Data Type | Used In |
|---|---|
| Employee profile (name, designation, department, manager) | `/hr` page, AI chat context |
| Leave balances | `/hr` page → Leave Management tab |
| Leave applications / history | `/hr` page |
| Attendance records | `/hr` page → Attendance tab |
| Payslips | `/hr` page → Payslips tab |
| Company holidays | `/hr` page → Holidays tab |

### Authentication Methods

1. **Direct API Key** — Employee connects their Keka account via API key
2. **OAuth** — OAuth2 flow for Keka account linking

### Data Sync

A scheduled job syncs all employee data from Keka into Supabase for offline access and AI chat context. Triggered via `/api/sync/keka`.

---

## 14. Deployment Setup

### Frontend — Vercel

| Setting | Value |
|---|---|
| **Repository** | `github.com/OthainHR/HR-Self-Service` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `DISABLE_ESLINT_PLUGIN=true npm run build` |
| **Output Directory** | `build` |
| **Live URL** | `https://ess.othain.com` |

**Required Environment Variables in Vercel:**
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_URL=https://hr-self-service.onrender.com
```

### Backend — Render.com

| Setting | Value |
|---|---|
| **Service Type** | Web Service |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app.main:app -c gunicorn_config.py` |
| **Live URL** | `https://hr-self-service.onrender.com` |

### Supabase Edge Functions

Deployed manually via Supabase CLI:
```bash
supabase functions deploy send-email    # Email notifications
supabase functions deploy reset-password  # Password reset
```

---

## 15. Environment Variables

### Frontend (set in Vercel Dashboard)

| Variable | Description |
|---|---|
| `REACT_APP_SUPABASE_URL` | Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `REACT_APP_API_URL` | FastAPI backend URL |

### Backend (set in Render Dashboard)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for AI chat |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `JWT_SECRET_KEY` | JWT signing secret |
| `CORS_ORIGINS` | Allowed frontend origins |

### Supabase Edge Function (set in Supabase Secrets)

| Variable | Description |
|---|---|
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID |
| `MICROSOFT_CLIENT_ID` | Azure app client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure app client secret |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `APP_BASE_URL` | `https://ess.othain.com` |
| `DEFAULT_SENDER_EMAIL` | Fallback sender email |

---

## 16. SQL Fix Scripts Reference

All SQL scripts are in the project root and should be run in **Supabase → SQL Editor**.

| File | Purpose | Run When |
|---|---|---|
| `fix_ticket_assignment.sql` | Fix ticket assignee routing + recreate `v_user_emails` | Initial setup or re-setup |
| `fix_operations_assignee_to_hr.sql` | Reassign existing Operations tickets from IT → HR | One-time data migration |
| `fix_operations_rls.sql` | Apply strict per-department RLS policies | After any RLS change |
| `fix_pickup_time_enum.sql` | Add `2:30am` to cab pickup_time enum; migrate `3:30am` → `2:30am` | After cab time change |
| `complete_ticket_fix.sql` | Full ticket RLS policy reset (nuclear option) | If tickets stop working |
| `fix_missing_functions.sql` | Recreate missing DB functions | If RPC calls fail |
| `database_functions.sql` | Create ticket numbering and additional email functions | Initial setup |

---

## 17. Known Issues & Resolutions Log

| Issue | Root Cause | Fix Applied |
|---|---|---|
| Operations tickets assigned to IT | `fix_ticket_assignment.sql` used `it@othainsoft.com` for Operations | Updated SQL + frontend assignee logic |
| HR can see IT tickets, IT can see HR tickets | Blanket email list in RLS SELECT policy | `fix_operations_rls.sql` — category-specific email access |
| "Failed to update assignee: RLS violation" on Operations tickets | `hr_admin` role not allowed to UPDATE Operations category | `fix_operations_rls.sql` — added Operations to hr_admin UPDATE policy |
| Cab booking error: `invalid input value for enum pickup_time: "3:30am"` | DB enum didn't include `2:30am` | `fix_pickup_time_enum.sql` — added `2:30am` to enum, migrated data |
| Vercel build fails: `npm run build exited with 1` | ESLint warnings treated as errors in CI | `vercel.json` build command + `.env.production` set `DISABLE_ESLINT_PLUGIN=true` |
| `fix_ticket_assignment.sql` not visible in Supabase | Used `ticket_categories` (wrong table name) | Corrected to `public.categories` |

---

*Document last updated: March 2026*
