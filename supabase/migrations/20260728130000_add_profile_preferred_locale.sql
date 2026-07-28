alter table public.profiles
  add column if not exists preferred_locale text not null default 'en'
  check (preferred_locale in ('en', 'ko', 'zh', 'ja', 'es', 'hi', 'ar'));
