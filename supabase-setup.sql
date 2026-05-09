-- ═══════════════════════════════════════════════════════
--  FLOSSWORK ALIGNERIQ — SUPABASE SETUP GUIDE
--  Run this SQL in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── STEP 1: Create the cases table ──────────────────────
create table public.cases (
  id               uuid default gen_random_uuid() primary key,
  created_at       timestamptz default now(),

  -- Auth
  user_id          uuid references auth.users(id) on delete cascade not null,

  -- Patient
  patient_name     text,
  patient_age      int,
  patient_sex      text,

  -- Scores
  severity         text,
  mds_score        int,
  bss_score        int,
  bss_label        text,
  rls_score        int,
  rls_label        text,
  tsi_score        int,
  tsi_label        text,
  confidence       int,
  confidence_label text,

  -- Clinical output
  archetype        text,
  aligners_min     int,
  aligners_max     int,
  duration_low     int,
  duration_high    int,
  retention_level  int,

  -- Arrays / JSON
  auxiliaries      text[],
  selected_plans   text[],
  explainability   text[],
  params           jsonb   -- raw 13-param values
);

-- ── STEP 2: Row Level Security (users see only their cases)
alter table public.cases enable row level security;

create policy "Users can insert their own cases"
  on public.cases for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own cases"
  on public.cases for select
  using (auth.uid() = user_id);

create policy "Users can delete their own cases"
  on public.cases for delete
  using (auth.uid() = user_id);

-- ── STEP 3: Index for fast per-user queries ──────────────
create index cases_user_id_idx on public.cases(user_id, created_at desc);


-- ═══════════════════════════════════════════════════════
--  STEP 4: Enable Google OAuth in Supabase Dashboard
-- ═══════════════════════════════════════════════════════
--
--  1. Go to: Authentication → Providers → Google
--  2. Toggle ON
--  3. Paste your Google OAuth Client ID and Secret
--     (create these at console.cloud.google.com →
--      APIs & Services → Credentials → OAuth 2.0 Client ID)
--  4. Add your site URL as an Authorized Redirect URI:
--     https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
--
--  For magic link (email OTP):
--  → Authentication → Providers → Email is already ON by default
--  → No extra config needed
--
-- ═══════════════════════════════════════════════════════
--  STEP 5: Configure app.js
-- ═══════════════════════════════════════════════════════
--
--  In app.js, find CONFIG.supabase and replace:
--
--    supabase: {
--      url:    'YOUR_SUPABASE_URL',     ← e.g. https://abcdef.supabase.co
--      anonKey:'YOUR_SUPABASE_ANON_KEY' ← from Project Settings → API
--    },
--
--  Both values are in: Supabase Dashboard → Project Settings → API
--
-- ═══════════════════════════════════════════════════════
--  That's it! The app will now:
--  • Gate access behind Google / magic-link auth
--  • Auto-save each completed case when summary is opened
--  • Let any signed-in user browse and reload their past cases
-- ═══════════════════════════════════════════════════════
