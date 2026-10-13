# Voxxy Inventory

Private internal inventory app with Google sign-in, an Express API, and Supabase persistence.

## Local development

1. Use Node.js 24.12 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set the server-side values.
4. Set `ADMIN_EMAILS` to the comma-separated email addresses allowed to sign in.
5. Start the app with `npm run dev`.

Local development serves the API and Vite app from the Express server. Authentication is enforced in production; local development is intended to run on a trusted machine.

## Vercel deployment

1. Import this GitHub repository as a Vercel project. Keep the repository public only if all committed source and sample data are safe to disclose.
2. Set the project to use Node.js 24.x and configure the following environment variables for Production (and Preview only if needed):
   - `SUPABASE_URL`: Supabase project URL.
   - `SUPABASE_SECRET_KEY`: server-only Supabase service-role key. Never use a `VITE_` prefix.
   - `FIREBASE_PROJECT_ID`: Firebase project ID used by the browser sign-in app.
   - `ADMIN_EMAILS`: comma-separated Google account email addresses authorized to use the app.
3. In Firebase Console, enable Google as an Authentication provider and add the Vercel deployment domain to Authorized domains.
4. Run the SQL script shown in the app's Supabase tab in the Supabase SQL Editor. Row Level Security is enabled; the API accesses these tables using the server-only service-role key.
5. Deploy and verify that the signed-in app reports all three Supabase tables as available.

The frontend is built into `dist`; requests under `/api/*` are handled by the Express serverless function in `api/[...path].ts`. Persistent inventory records must be stored in Supabase because Vercel function filesystems are ephemeral.

## Security notes

- Never commit `.env`, a Supabase service-role key, Firebase Admin service-account credentials, employee records, or real inventory backups.
- `ADMIN_EMAILS` and Supabase credentials are read only by the server. API routes require a verified Firebase ID token and an allowlisted email.
- The Firebase web config is public client configuration, not an Admin SDK credential. Restrict its API key and authorized domains in Google Cloud/Firebase settings.
