# Smart Learning Companion

A responsive web application for Year 9–12 maths and science students. Claude generates quizzes, explanations, study suggestions and tutor replies; saved profiles and learning activity provide personal context.

## Key Features

- **Personalized Learning Paths** — AI-generated custom learning plans based on student performance.
- **Interactive Quizzes** — Quizzes and practice tests tailored to individual learning needs.
- **Topic Explanations** — AI-generated explanations and summaries for complex subjects.
- **Progress Tracking** — Monitors student progress and adapts learning materials accordingly.
- **Tutor learning memory** — Saved conversations, dated progress and relevant past learning records help the tutor answer questions about the student's own learning.

## Team

- Poojitha Myneni - 12265928
- Jahongir Yusupov - 12290667
- Lathish Muniraj - 12205208
- Joy Dev Nath - 12295603

## Project Structure

- `frontend/` — React + TypeScript (Vite), styled with Tailwind CSS.
- `backend/` — FastAPI + SQLAlchemy, PostgreSQL in production and SQLite for local development/tests.

## Status

Authentication, onboarding, quizzes, explanations, progress, learning paths and the tutor are integrated. Turnstile protects authentication and AI requests. Learning memory adds server-scored quiz answers, saved explanation text, persistent tutor chats and question-based retrieval.

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
ANTHROPIC_API_KEY=your-local-provider-key
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

## Persistent learning memory

New quiz generation saves the question/answer key on the server. Submission sends a quiz ID and selected answers; the backend verifies ownership, calculates the score and saves individual answers atomically with the progress record. Repeated identical submissions return the original result. The interface waits for a successful save before opening results, and retains answers on failure.

New topic explanations save their full generated text. Tutor requests send only the new question and an idempotency UUID. The backend retrieves prior turns from the database, adds the student's profile and relevant learning evidence, and saves a completed question/reply pair. Reloading shows the latest 50 turns; older chat text remains searchable. **Clear conversations** deletes that student's saved turns and chat memory, while retaining quiz and topic activity.

Retrieval combines SQL counts and topic/difficulty averages with ranked keyword matching over all of the signed-in student's saved learning text. It is retrieval-augmented generation, **not embedding/vector semantic search**. No additional API key or vector database is required. Exact wording and a small subject alias dictionary affect recall. Answers use a bounded selection (8 topic/difficulty groups, recent activity and up to 6 text records); the tutor must acknowledge missing evidence rather than claim complete memory. The chat UI shows the records supplied to the model, not a guarantee that every sentence is supported by those records.

Date filters support today, yesterday, this/last week, this/last month, the past N days, month names with an optional year, and ISO dates. Calendar filters use UTC. First/latest scores are compared within the same topic and difficulty. Retrieved conversations are labelled as student statements or previous AI suggestions, not verified learning outcomes. The learning-path generator uses the same retrieval service.

Deployment is additive: `saved_quizzes`, `learning_memories` and `tutor_turns` are created by the existing metadata initialization. Existing accounts, quiz summaries and topic history are unchanged. Historical individual answers, explanation bodies and chats cannot be reconstructed; detailed memory begins with new activity after deployment. Deploy both backend and frontend; an old in-progress quiz without a saved quiz ID must be regenerated. No secrets belong in these tables or in frontend environment variables.

Offline integration tests cover account isolation, old-record retrieval, date boundaries, score integrity, invalid submissions, duplicate requests, saved explanations, conversation restoration/deletion and AI failure. Frontend tests cover restored conversations, evidence display, retry identity, deletion confirmation and quiz save failures. PostgreSQL row locks serialize quiz submissions and a student's chat/clear operations; SQLite tests do not verify production lock contention.

Storage uses SQLAlchemy [JSON columns](https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.JSON) and [unique constraints](https://docs.sqlalchemy.org/en/20/core/constraints.html#unique-constraint).
