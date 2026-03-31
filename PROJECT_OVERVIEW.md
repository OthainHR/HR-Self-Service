# OthainSoft ESS Portal — Project Overview

**Employee Self-Service Portal for OthainSoft**
**Live URL:** https://ess.othain.com

---

## What Is This?

The **ESS Portal** is a web and mobile application for OthainSoft employees. It is a single platform where employees can raise support requests, book cabs, chat with an AI assistant, and view their HR information — all without calling or emailing departments manually.

---

## Who Uses It?

| User | What They Do |
|---|---|
| **Employees** | Raise tickets, book cabs, check leave/payslips, chat with AI |
| **HR Team** | Manage HR and Operations tickets, manage cab bookings |
| **IT Team** | Manage IT support tickets |
| **Accounts Team** | Manage expense and payroll tickets |
| **AI Team** | Manage AI-related requests |

---

## What Can You Do on the Portal?

### 1. Raise a Support Ticket
Employees can submit requests to different departments:

| Department | Type of Issues |
|---|---|
| **IT** | Laptop issues, software, internet, access |
| **HR** | Leave policies, HR queries, onboarding |
| **Accounts** | Salary, expenses, reimbursements |
| **Operations** | Lighting, AC, stationary, printing, supplies |
| **AI** | AI tools, requests |

Once a ticket is raised, the concerned department gets an email and can reply, update status, or reassign the ticket. Employees are notified at every step.

---

### 2. Book a Cab
Employees on the whitelist can book office cab/transport directly from the portal.

- Pick a **pickup time:** `9 PM`, `11:30 PM`, or `2:30 AM`
- Pick a **department:** GBT, Presidio, or Othain
- Booking **cutoff times:**
  - GBT → must book before **4:00 PM**
  - Presidio & Othain → must book before **7:00 PM**
- HR admin can view all bookings and export as Excel

---

### 3. AI HR Chatbot
Employees can chat with an AI assistant for quick answers on HR policies, leave rules, company info, etc. The AI uses the company's knowledge base to give relevant answers.

---

### 4. HR Self-Service (Keka)
Employees can connect their Keka account and view:
- Leave balance and apply for leave
- Attendance records
- Payslips
- Company holidays

---

### 5. Onboarding
New employees go through a guided onboarding wizard to get started.

---

## Technology (Simple Version)

| What | Tool Used |
|---|---|
| Website/App | React (web), Android & iOS (mobile) |
| Database | Supabase (cloud database) |
| Login/Auth | Supabase Auth |
| AI Chat | OpenAI GPT |
| HR Data | Keka HRMS |
| Email Notifications | Microsoft 365 |
| Hosting (Frontend) | Vercel |
| Hosting (Backend) | Render.com |

---

## How Tickets Work

```
Employee raises ticket
        ↓
Auto-assigned to the right department
        ↓
Department admin gets an email
        ↓
Admin updates ticket / replies
        ↓
Employee gets notified
        ↓
Ticket is resolved and closed
```

---

## Departments & Their Email Inboxes

| Department | Email |
|---|---|
| HR + Operations | hr@othainsoft.com |
| IT | it@othainsoft.com |
| Accounts / Payroll | accounts@othainsoft.com |
| AI | ai@othainsoft.com |

> Each department can **only see their own tickets** — no department can view another department's tickets.

---

## Key Points to Know

- Every employee logs in with their **OthainSoft email**
- Admins (HR, IT, Accounts) have extra access to manage tickets
- Cab booking is available only for **whitelisted employees** added by HR
- All email notifications are sent automatically — no manual effort needed
- The portal works on **web browser and mobile** (Android/iOS)

---

*For technical details, refer to `PROJECT_DOCUMENTATION.md`*
*Last updated: March 2026*
