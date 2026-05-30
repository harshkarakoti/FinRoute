# FinRoute 💳
### Smart Subscription & Automated Expense Optimization Engine

FinRoute is a full-stack web application that helps you track, manage, and optimize your recurring subscriptions — with automated bank sync, real-time renewal countdowns, email alerts, and roommate bill splitting.

---

## 🚀 Live Demo
> **Frontend:** [Coming soon — Vercel]
> **Backend API:** [Coming soon — Render]

---

## ✨ Features

### ⏱️ Dynamic Deadline Countdown
Real-time countdown timers on every subscription. The most urgent renewals automatically float to the top of your dashboard.

### 🏦 Dual-Ingestion Pipeline
- **Manual**: Add subscriptions by hand via a clean form
- **Auto-detect**: Connect your bank via Plaid API (Sandbox) — FinRoute scans your transaction history, detects recurring payment patterns, and imports subscriptions automatically

### 📧 Budget Defense System
Automated email reminders via Resend API — sent X days before a charge hits, triggered by an external cron job.

### 🤝 Roommate Bill Splitting
Track shared subscriptions (Netflix, utilities, gym) and automatically calculate your fractional share (`yourShare = amount / totalRoommates`).

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React.js + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT + bcryptjs |
| Bank Sync | Plaid API (Sandbox) |
| Email | Resend API |
| Hosting | Vercel (frontend) + Render (backend) |

---

## 📁 Project Structure

```
FinRoute/
├── backend/
│   ├── config/          # DB + Plaid client
│   ├── controllers/     # Auth, Subscriptions, Alerts, Plaid
│   ├── middleware/       # JWT auth middleware
│   ├── models/          # User + Subscription schemas
│   ├── routes/          # Express routers
│   ├── services/        # Email service (Resend)
│   └── server.js        # Express entry point
└── frontend/
    └── src/
        ├── api/          # Axios instance
        ├── components/   # Navbar, Cards, Modals, PlaidConnect
        ├── context/      # Auth context
        ├── pages/        # Login, Register, Dashboard
        └── utils/        # Countdown hook, helpers
```

---

## ⚙️ Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/finroute.git
cd finroute
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=your_resend_key
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_sandbox_secret
PLAID_ENV=sandbox
CRON_SECRET=your_cron_secret
```

```bash
npm run dev
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

### 4. Open the app
Visit **http://localhost:5173**

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/subscriptions` | 🔒 JWT | Get all subscriptions |
| POST | `/api/subscriptions` | 🔒 JWT | Create subscription |
| PUT | `/api/subscriptions/:id` | 🔒 JWT | Update subscription |
| DELETE | `/api/subscriptions/:id` | 🔒 JWT | Delete subscription |
| POST | `/api/plaid/link-token` | 🔒 JWT | Generate Plaid link token |
| POST | `/api/plaid/exchange-token` | 🔒 JWT | Exchange public token |
| POST | `/api/plaid/sync` | 🔒 JWT | Sync transactions |
| GET | `/api/plaid/status` | 🔒 JWT | Get link status |
| DELETE | `/api/plaid/unlink` | 🔒 JWT | Unlink bank account |
| POST | `/api/alerts/trigger` | 🔑 Cron | Fire renewal email alerts |

---

## 👤 Author
**Harsh Karakoti** — [GitHub](https://github.com/yourusername)
