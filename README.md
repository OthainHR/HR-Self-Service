# OthainSoft ESS Portal

**Employee Self-Service Portal**
**Live:** https://ess.othain.com

---

## What Is This?

The ESS Portal is a web and mobile application for OthainSoft employees to raise support tickets, book cabs, chat with an AI HR assistant, and view their HR information — all in one place.

---

## Features at a Glance

| Feature | Description |
|---|---|
| **Ticketing** | Raise IT, HR, Accounts, Operations, and Expense tickets |
| **Cab Booking** | Book office cab with department-wise cutoff times |
| **AI HR Chat** | Ask HR questions to an AI assistant |
| **HR Self-Service** | View leave, payslips, attendance (via Keka) |
| **Onboarding** | Guided wizard for new employees |
| **Knowledge Base** | Search and upload company documents |
| **Admin Dashboard** | Ticket management, reports, and analytics |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Material UI v5, React Router v6 |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| AI Chatbot | FastAPI + OpenAI GPT |
| HR Data | Keka HRMS API |
| Email | Microsoft Graph API (MS365) |
| Mobile | Capacitor (Android + iOS) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render.com |

---

## Prerequisites

Before running locally, make sure you have:

- **Node.js** v16 or higher
- **Python** 3.9 or higher
- **Supabase** project with credentials
- **OpenAI** API key
- **Keka** API credentials

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/OthainHR/HR-Self-Service.git
cd HR-Self-Service
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm start
```

Frontend runs at: **http://localhost:3000**

---

### 3. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder:

```
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
JWT_SECRET_KEY=your-jwt-secret
CORS_ORIGINS=http://localhost:3000,https://ess.othain.com
KEKA_API_KEY=your-keka-api-key
KEKA_CLIENT_ID=your-keka-client-id
KEKA_CLIENT_SECRET=your-keka-client-secret
KEKA_COMPANY_NAME=othainsoft
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend API runs at: **http://localhost:8000**

---

## Deployment

### Frontend — Vercel

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `DISABLE_ESLINT_PLUGIN=true npm run build` |
| Output Directory | `build` |

Set these in the Vercel Dashboard under **Environment Variables:**
```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_API_URL
```

### Backend — Render.com

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app.main:app -c gunicorn_config.py` |

Set all backend `.env` variables in the Render Dashboard.

---

## Database Setup (Supabase)

Run the following SQL scripts in **Supabase → SQL Editor** in this order:

| Step | File | Purpose |
|---|---|---|
| 1 | `database_functions.sql` | Create core DB functions |
| 2 | `fix_ticket_assignment.sql` | Set ticket routing and assignee logic |
| 3 | `fix_operations_rls.sql` | Apply per-department security rules |
| 4 | `fix_pickup_time_enum.sql` | Add `2:30am` cab pickup time to DB |

---

## How Ticketing Works

1. Employee raises a ticket from `/tickets`
2. Ticket is **auto-assigned** to the right department inbox
3. Department admin receives an **email notification**
4. Admin updates the ticket, replies, or reassigns
5. Employee is notified at every step
6. Ticket is closed when resolved

### Ticket Routing

| Category | Assigned To |
|---|---|
| IT Requests | it@othainsoft.com |
| HR Requests | hr@othainsoft.com |
| Operations | hr@othainsoft.com |
| Accounts / Payroll / Expense | accounts@othainsoft.com |
| AI Requests | ai@othainsoft.com |

---

## How Cab Booking Works

1. Only **whitelisted employees** (added by HR) can book
2. Employee selects pickup time: `9 PM`, `11:30 PM`, or `2:30 AM`
3. Booking cutoff times:
   - **GBT** → 4:00 PM IST
   - **Presidio** → 7:00 PM IST
   - **Othain** → 7:00 PM IST
4. HR admin views all bookings and exports as Excel

---

## Project Structure

```
HR-Self-Service/
├── frontend/                  # React app
│   ├── src/
│   │   ├── pages/             # All page components
│   │   ├── features/          # Ticketing module
│   │   ├── components/        # Shared UI components
│   │   ├── services/          # Supabase and API clients
│   │   └── utils/             # Helper functions
│   └── vercel.json            # Vercel config
│
├── backend/                   # FastAPI Python backend
│   ├── app/
│   │   ├── routers/           # API route handlers
│   │   ├── services/          # Business logic (AI, Keka, Knowledge)
│   │   └── utils/             # Supabase, OpenAI helpers
│   └── requirements.txt
│
├── supabase/
│   └── functions/             # Supabase Edge Functions
│
├── *.sql                      # Database migration scripts
├── PROJECT_OVERVIEW.md        # Non-technical summary (share with team)
└── PROJECT_DOCUMENTATION.md  # Full technical documentation
```

---

## User Roles

| Role | Access |
|---|---|
| Employee | Own tickets only |
| `hr_admin` | HR Requests + Operations tickets |
| `it_admin` | IT Requests tickets |
| `payroll_admin` | Accounts + Payroll + Expense tickets |
| `ai_admin` | AI Requests tickets |
| `admin` | All tickets |

Roles are set in **Supabase → Authentication → Users → user_metadata**.

---

## Security

- All tables have **Row Level Security (RLS)** enabled
- Departments can **only see their own tickets** — no cross-department visibility
- Environment variables are never committed to the repository
- Rate limiting is applied on authentication endpoints
- JWT tokens are used for all API calls

---

## Useful Links

| Resource | Link |
|---|---|
| Live App | https://ess.othain.com |
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |
| Backend (Render) | https://render.com/dashboard |
| Keka HRMS | https://othainsoft.keka.com |

---

## Related Docs

- `PROJECT_OVERVIEW.md` — Simple overview for non-technical team members
- `PROJECT_DOCUMENTATION.md` — Full deep-dive technical documentation
- `QUICK_START_GUIDE.md` — Keka API quick setup guide

---

*Last updated: March 2026 | OthainSoft Engineering*
