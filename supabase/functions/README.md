# Tin Cup notification workers

These functions are source-only until production activation is separately approved.

- `enqueue-tee-reminders` runs on a schedule and creates one deduplicated reminder per opted-in user and round.
- `dispatch-push` claims pending outbox records, filters by explicit preferences, retries transient failures, and disables expired subscriptions.

Required local secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY`.

Serve locally with `supabase functions serve <name> --env-file supabase/functions/.env.local`. Never commit that env file.
