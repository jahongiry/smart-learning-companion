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
