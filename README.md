# Blostem

Blostem is a React + TypeScript financial planning dashboard with a lightweight Express backend and SQLite persistence.

The app helps users sign up, complete onboarding with income, expenses, goals, and tax preferences, then generates a personalized cash flow, tax comparison, and investment plan. Live market data and risk-aware guidance are surfaced through the backend.

Deployed live at : https://blostemhackathon.vercel.app/

## Tech stack

- Frontend: React 19, TypeScript, Vite
- UI: Recharts, Lucide icons
- Backend: Node.js, Express, SQLite
- Authentication: JWT
- Server-side market data caching

## Features

- Email/password sign up and login
- Step-by-step onboarding for profile, income, expenses, goals, tax settings, and risk profile
- Personalized dashboard with:
  - monthly take-home and investable surplus
  - tax regime comparison (old vs new)
  - cash flow plan and allocation insights
  - goal progress and peer benchmarking
- Market data endpoints for:
  - Forex
  - Crypto
  - Indian indices (Sensex / NIFTY)
  - Mutual funds
- Quant engine that generates and persists financial plans

## Repository structure

- `src/` — frontend source code
  - `pages/` — app screens like `Login`, `Onboarding`, `Dashboard`, `MoneyStory`
  - `context/` — app state and auth provider
  - `services/` — API client
  - `utils/` — financial helpers
- `backend/` — Express backend
  - `routes/` — auth, data, market, and quant routes
  - `services/` — business logic and cache
  - `db.js` — SQLite initialization and schema

## Getting started

### 1. Install dependencies

From the root:

```bash
npm install
npm install --prefix backend
```

### 2. Configure environment variables (optional)

Create `backend/.env` if you want custom values:

```env
PORT=3000
JWT_SECRET=your_secret_here
```

If no `.env` is present, defaults are used:
- `PORT=3000`
- `JWT_SECRET=super-secret-key-for-blostem`

### 3. Run development servers

From the project root:

```bash
npm run dev
```

This starts both the frontend and backend together. The frontend proxies API calls to the backend via `/backend-api`.

### 4. Build for production

```bash
npm run build
```

### 5. Preview production build

```bash
npm run preview
```

### 6. Run backend separately

```bash
npm run server
```

Or from the backend folder:

```bash
npm run dev
```

## Backend API overview

The frontend communicates with the backend through proxied routes under `/backend-api`.

Core endpoints:

- `POST /backend-api/auth/signup` — create a user account
- `POST /backend-api/auth/login` — authenticate and obtain JWT
- `GET /backend-api/data` — fetch consolidated user profile and planning data
- `PUT /backend-api/data/profile` — update profile fields
- `PUT /backend-api/data/income` — update income settings
- `PUT /backend-api/data/tax-profile` — update tax / deduction settings
- `PUT /backend-api/data/risk-profile` — update investment risk profile
- `PUT /backend-api/data/onboarding` — mark onboarding complete
- `POST /backend-api/data/expenses` — add expense
- `DELETE /backend-api/data/expenses/:id` — remove expense
- `POST /backend-api/quant/plan` — generate a financial plan
- `GET /backend-api/quant/plan` — retrieve latest saved plan
- `POST /backend-api/markets/mutual-funds` — fetch cached mutual fund data

## Notes

- The SQLite database file is created automatically at `backend/database.sqlite`.
- The frontend expects the backend to run at `http://localhost:3000`; Vite proxies requests from `/backend-api` to `/api`.
- Authentication state is stored in `localStorage` under `blostem_token`.

## License

This repository does not include a license file. Add one if you want to publish or share the project publicly.
