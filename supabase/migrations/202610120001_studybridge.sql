-- Run as the migration owner in the Supabase SQL editor or `supabase db push`.
create table public.vocabulary (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 expression text not null check (char_length(expression) between 1 and 200),
 normalized_expression text generated always as (lower(regexp_replace(expression, '^[[:space:]]+|[[:space:]]+$', '', 'g'))) stored,
 meaning text not null check (char_length(meaning) between 1 and 1000),
 usage text not null check (char_length(usage) between 1 and 2000),
 general_meaning text not null default '' check (char_length(general_meaning) <= 1000),
 source_sentence text not null check (char_length(source_sentence) between 1 and 12000),
 source_translation text not null check (char_length(source_translation) between 1 and 16000),
 examples jsonb not null check (jsonb_typeof(examples) = 'array' and jsonb_array_length(examples) = 2),
 material_title text not null check (char_length(material_title) between 1 and 200),
 created_at timestamptz not null default now()
);
-- Digest avoids PostgreSQL btree index limits for long source sentences.
create extension if not exists pgcrypto with schema extensions;
alter table public.vocabulary add column source_hash text generated always as (encode(extensions.digest(source_sentence, 'sha256'), 'hex')) stored;
create unique index vocabulary_context_unique on public.vocabulary (user_id, normalized_expression, source_hash);
create index vocabulary_recent on public.vocabulary(user_id,created_at desc);
alter table public.vocabulary enable row level security;
revoke all on public.vocabulary from anon;
grant select, insert, delete on public.vocabulary to authenticated;
create policy vocabulary_read on public.vocabulary for select to authenticated using ((select auth.uid())=user_id);
create policy vocabulary_save on public.vocabulary for insert to authenticated with check ((select auth.uid())=user_id);
create policy vocabulary_delete on public.vocabulary for delete to authenticated using ((select auth.uid())=user_id);
-- Force server timestamps even for direct authenticated PostgREST inserts.
create function public.vocabulary_timestamp() returns trigger language plpgsql set search_path = '' as $$ begin new.created_at := now(); return new; end; $$;
create trigger vocabulary_timestamp before insert on public.vocabulary for each row execute function public.vocabulary_timestamp();
-- Durable atomic per-user hourly limiter shared by all application instances.
create table public.ai_request_windows (
 user_id uuid not null references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 count integer not null check(count between 1 and 30),
 primary key (user_id,window_start)
);
alter table public.ai_request_windows enable row level security;
revoke all on public.ai_request_windows from anon, authenticated;
create function public.consume_ai_request() returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 insert into public.ai_request_windows(user_id,window_start,count) values(uid,date_trunc('hour',now()),1)
 on conflict(user_id,window_start) do update set count=public.ai_request_windows.count+1 where public.ai_request_windows.count<30 returning count into n;
 -- Bounded housekeeping only affects this caller's expired windows.
 delete from public.ai_request_windows where user_id=uid and window_start < now()-interval '2 days';
 return n is not null;
end; $$;
revoke all on function public.consume_ai_request() from public, anon;
grant execute on function public.consume_ai_request() to authenticated;
