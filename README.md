# Smart Learning Companion

An educational mobile application that uses Generative AI to create personalized learning experiences for students. The app generates custom quizzes, explains complex topics, adapts to each student's learning pace, produces AI-generated study plans, and tracks progress over time.

## Key Features

- **Personalized Learning Paths** — AI-generated custom learning plans based on student performance.
- **Interactive Quizzes** — Quizzes and practice tests tailored to individual learning needs.
- **Topic Explanations** — AI-generated explanations and summaries for complex subjects.
- **Progress Tracking** — Monitors student progress and adapts learning materials accordingly.

## Team

- Poojitha Myneni - 12265928
- Jahongir Yusupov - 12290667
- Lathish Muniraj - 12205208
- Joy Dev Nath - 12295603

## Project Structure

- `frontend/` — React + TypeScript (Vite) app, styled with Tailwind CSS. Landing page, Login/Register UI, wired up to the backend auth API.
- `backend/` — FastAPI + SQLAlchemy + PostgreSQL. Auth API (register/login/JWT) is live; quiz generation, topic explanations and progress tracking (the GenAI features) are next.

## Status

Auth is fully wired end-to-end: register/login/logout works through the real backend and database, both locally and in production. GenAI-powered features (quizzes, topic explanations, personalized learning paths, progress tracking) are next.

## Live Deployment

Both projects auto-deploy on every push to `main` (Vercel + GitHub integration).

- **App**: https://smart-learning-companion-frontend.vercel.app
- **API**: https://smart-learning-companion-backend.vercel.app (interactive docs at `/docs`)
- **Database**: Neon Postgres (provisioned via Vercel Marketplace, connected to the backend project)

## Local Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (not committed):

```bash
DATABASE_URL=sqlite:///./dev.db  # or a Postgres URL — see Neon connection string in Vercel dashboard
SECRET_KEY=some-local-dev-secret
CORS_ORIGINS=http://localhost:5173
```

Run it:

```bash
uvicorn app.main:app --reload --port 8000
```

API is now at `http://localhost:8000` (docs at `/docs`).

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` (not committed):

```bash
VITE_API_URL=http://localhost:8000/api
```

Run it:

```bash
npm run dev
```

App is now at `http://localhost:5173`.

## Bot protection (Cloudflare Turnstile)

Turnstile protects registration, login, and every Claude generation request (quizzes,
explanations, learning paths, and tutor messages). The browser obtains a fresh token
for each operation; FastAPI validates it with Cloudflare and checks the action and
allowed hostname before running that operation. Missing/invalid tokens are rejected
with 403, and verification service failures with 503. Tokens are never stored or reused.
Progress reads and score saving remain behind normal authentication.

To activate in production:

1. Create a **Managed** widget in Cloudflare → Turnstile. Allow the frontend hostname
   `smart-learning-companion-frontend.vercel.app` (and any actual custom frontend domain).
2. In the **backend** Vercel project's Production environment, set:
   - `TURNSTILE_SITE_KEY`: the widget's public site key.
   - `TURNSTILE_SECRET_KEY`: the private secret key; never put it in a `VITE_` variable.
   - `TURNSTILE_HOSTNAMES`: comma-separated exact frontend hostnames, without schemes or paths.
   - `TURNSTILE_ENABLED=false` initially, then `true` after both code deployments below.
3. Deploy the backend code with `TURNSTILE_ENABLED=false` first, then deploy the updated
   frontend. Finally enable Turnstile and redeploy the backend. The frontend reads the
   public configuration from `/api/security/captcha`; no frontend key/build setting is needed.
4. Verify sign-up/login and all four AI features in a real browser. A direct request to
   `/api/quiz/generate` without `X-Turnstile-Token` must return 403 while enabled. Check that
   cancel/retry works and progress reads still load. Test keys must never be used in production.

Local development defaults to `TURNSTILE_ENABLED=false`. When enabled, incomplete
configuration fails closed; it does not silently turn protection off. Learning paths
are generated with the **Generate path** button so simply opening a page does not
start a challenge or spend Claude credits.

CAPTCHA reduces automated abuse; it is not a guarantee against every bot or AI.
Server-side rate limits and usage quotas would provide additional protection against
users or automation that pass verification. CORS alone is not bot protection.

Verification commands:

```bash
cd frontend
npm test
npm run lint
npm run build
# From backend/ (uses isolated SQLite, no real database or Claude calls):
DATABASE_URL=sqlite:// SECRET_KEY=test .venv/bin/python -m unittest discover -s tests -v
```

Provider documentation: [server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
