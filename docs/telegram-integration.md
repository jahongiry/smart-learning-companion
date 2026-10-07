# Telegram learning companion

The integration is enabled by server configuration; without credentials it remains unavailable. No Telegram messages are sent by the offline tests. The bot token must belong to a dedicated bot created through [BotFather](https://t.me/BotFather).

## Student flow

Open Dashboard → Learn on Telegram → Connect Telegram. Press Start in the bot, return to the website, and confirm the displayed Telegram account. The linking token is single-use, expires in ten minutes, and is stored hashed in the connection table. Before confirmation, the bot cannot retrieve any learning history. One Telegram private chat can be connected to one website account.

Students may ask text questions about maths, science, and studying. The tutor uses their existing profile, learning history and chat history, and saves its replies to the same website tutor history. The initial limit is 30 successful questions per UTC day, configurable through `TELEGRAM_DAILY_QUESTION_LIMIT`.

Daily messages require a separate opt-in. Default delivery time is 18:00 Australia/Sydney; each student can change their time and IANA timezone. The bot sends one educational fact plus five questions with answer buttons. After all five are answered, one scored attempt and the actual answers are added to website progress and learning memory. A new daily lesson is generated from their records and the previous seven lessons to reduce repetition; AI-generated content can still repeat or contain mistakes.

`/stop` pauses daily delivery but keeps the tutor available. `/resume` enables daily delivery. `/disconnect`, or Disconnect Telegram on the website, unlinks the account and cancels unsent daily lessons. Existing learning records are preserved. Blocking the bot causes the connection to be removed when Telegram reports HTTP 403. Phone notifications are controlled by the student's Telegram settings.

## Server configuration

Set these variables in the **backend project's Production environment**, never in `VITE_` variables or committed files:

| Variable | Value |
| --- | --- |
| `TELEGRAM_ENABLED` | `false` during setup, then `true` when ready |
| `TELEGRAM_BOT_TOKEN` | Secret token from BotFather |
| `TELEGRAM_BOT_USERNAME` | Bot username without `@` |
| `TELEGRAM_WEBHOOK_SECRET` | Random URL-safe secret, at least 32 random bytes |
| `CRON_SECRET` | A separate random URL-safe secret, at least 32 random bytes |
| `FRONTEND_URL` | `https://smart-learning-companion-frontend.vercel.app` |
| `TELEGRAM_DAILY_QUESTION_LIMIT` | Optional; default `30` |

Existing `DATABASE_URL`, `SECRET_KEY` and `ANTHROPIC_API_KEY` are reused. The application adds `telegram_connections`, `telegram_updates` and `telegram_daily` through the existing additive table initialization. No existing table columns change.

Deploy backend and frontend, configure a scheduler as below, enable `TELEGRAM_ENABLED`, redeploy backend, and register the webhook. With the same variables available securely in the shell or ignored `backend/.env`, run from `backend/`:

```sh
.venv/bin/python scripts/configure_telegram.py \
  --webhook-url https://smart-learning-companion-backend.vercel.app/api/telegram/webhook
```

The script verifies the bot username, refuses to replace an unrelated webhook, configures commands, and preserves pending updates. It never prints tokens. Add `--check` to inspect the existing configuration without changing anything.

## Scheduler (required for both replies and daily delivery)

Telegram webhooks validate and persist incoming updates, then process that update immediately in a thread pool. The durable worker retries failed or interrupted work and sends daily lessons. Invoke **GET `/api/telegram/worker` regularly** with `Authorization: Bearer <CRON_SECRET>`. Replies normally arrive after the AI call completes; failures may wait for a scheduler retry. Set `TELEGRAM_PROCESS_INLINE=false` only for worker-only operation.

The configured Hobby-compatible scheduler is `.github/workflows/telegram-worker.yml`: GitHub Actions invokes the worker every five minutes using the `TELEGRAM_CRON_SECRET` repository secret. It has no repository token permissions and checks out no code. The workflow also supports manual dispatch. Scheduled jobs can be delayed during GitHub load, and public-repository schedules are disabled after 60 days without repository activity; monitor workflow runs and re-enable when necessary. Delivery times are approximate, not a guaranteed minute.

For **Vercel Pro**, add this property to `backend/vercel.json` and deploy:

```json
"crons": [{ "path": "/api/telegram/worker", "schedule": "* * * * *" }]
```

Vercel adds the `CRON_SECRET` authorization header automatically. Keep the existing function duration of 120 seconds. Use either the GitHub workflow or Vercel cron. The checked-in configuration uses GitHub because the current Vercel team has a Hobby plan.

For **Vercel Hobby**, use the checked-in GitHub workflow, or an external authenticated scheduler. Hobby Vercel cron only runs daily, which is insufficient for frequent retries or per-user delivery times. Configure the secret header in the scheduler's secret store; never put it in a URL. Do not use a daily cron as a substitute. A local developer can invoke the same authenticated endpoint or call `run_worker(db)` with isolated test settings.

## Reliability and limits

The database inbox deduplicates Telegram `update_id`. One daily lesson is reserved per user/local calendar date. Generated replies/content are committed before delivery, and each sent message advances a checkpoint. PostgreSQL row locks protect each step, and retries are bounded with backoff. HTTP 429 respects Telegram's retry delay. Quiz answers are owned by the linked account; repeat button presses cannot create duplicate quiz attempts.

Telegram does not provide an idempotency key for `sendMessage`. A process crash after Telegram accepts a message but before the database commit can repeat **that one message** on retry. The system does not claim exactly-once external delivery. Old incoming updates expire after 24 hours, and unsent daily lessons from earlier local dates are cancelled rather than flooding students with a backlog.

This is a small-deployment worker, capped at 20 work steps per invocation and a soft 45-second budget (one in-progress call may extend it). Monitor pending/failed rows and Vercel scheduler errors. Before scaling to many students, move work to dedicated queue workers with a measured throughput budget. PostgreSQL lock behavior is not reproduced by the SQLite unit tests. AI calls and scheduler invocations consume the existing provider/hosting quotas. Turning `TELEGRAM_ENABLED=false` stops processing; no data is deleted.

## Verification

```sh
cd backend
DATABASE_URL=sqlite:// SECRET_KEY=test .venv/bin/python -m unittest discover -s tests -v
cd ../frontend
npm test
npm run lint
npm run build
```

Live acceptance checks after provisioning: link a dedicated test account; check confirmation before accessing history; ask a question; opt in and set a near-future time; receive one fact and five interactive questions; answer all five and verify website progress; pause and disconnect. Check the bot webhook for errors and confirm scheduler invocations. Never substitute production student data for test fixtures.

References: [Telegram webhook authentication](https://core.telegram.org/bots/api#setwebhook), [Telegram deep links](https://core.telegram.org/bots/features#deep-linking), [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [cron secrets](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Python function duration](https://vercel.com/docs/functions/configuring-functions/duration).

GitHub scheduler reference: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
