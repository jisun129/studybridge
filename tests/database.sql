\set ON_ERROR_STOP on
-- Disposable, empty PostgreSQL database ONLY. Everything is rolled back.
begin;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema extensions;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public,extensions to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
alter default privileges in schema public grant all on tables to anon, authenticated;
\ir ../supabase/migrations/202610120001_studybridge.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into public.vocabulary(user_id,expression,meaning,usage,source_sentence,source_translation,examples,material_title,created_at)
values(auth.uid(),' Significant ','유의한','통계적 의미','The result is significant.','결과는 유의하다.','[{"english":"Example one.","korean":"예문 1."},{"english":"Example two.","korean":"예문 2."}]','Statistics','2000-01-01');
do $$ begin
 begin
  update public.vocabulary set meaning='Unauthorized update';
  raise exception 'Update privilege should be revoked';
 exception when insufficient_privilege then null; end;
 if (select count(*) from public.vocabulary) <> 1 then raise exception 'Owner cannot read own record'; end if;
 if (select created_at from public.vocabulary limit 1) < now()-interval '1 minute' then raise exception 'Caller controlled timestamp'; end if;
 begin
  insert into public.vocabulary(user_id,expression,meaning,usage,source_sentence,source_translation,examples,material_title) select auth.uid(),E'\tSIGNIFICANT\n',meaning,usage,source_sentence,source_translation,examples,material_title from public.vocabulary;
  raise exception 'Duplicate insertion should fail';
 exception when unique_violation then null; end;
 begin
  insert into public.vocabulary(user_id,expression,meaning,usage,source_sentence,source_translation,examples,material_title) select '00000000-0000-0000-0000-000000000002','significant',meaning,usage,source_sentence,source_translation,examples,material_title from public.vocabulary;
  raise exception 'Forged owner should fail';
 exception when insufficient_privilege then null; end;
 for n in 1..30 loop if not public.consume_ai_request() then raise exception 'Rate limiter blocked early'; end if; end loop;
 if public.consume_ai_request() then raise exception 'Rate limit exceeded'; end if;
end $$;
-- Same expression in a different source context is allowed.
insert into public.vocabulary(user_id,expression,meaning,usage,source_sentence,source_translation,examples,material_title)
select auth.uid(),'significant',meaning,usage,'A different significant result.',source_translation,examples,material_title from public.vocabulary limit 1;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ declare affected integer; begin
 if (select count(*) from public.vocabulary) <> 0 then raise exception 'Cross-user read leaked data'; end if;
 delete from public.vocabulary; get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Cross-user deletion succeeded'; end if;
 if not public.consume_ai_request() then raise exception 'Separate user shares rate limit'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if (select count(*) from public.vocabulary) <> 2 then raise exception 'Data isolation or contextual uniqueness failed'; end if;
 delete from public.vocabulary;
 if exists(select 1 from public.vocabulary) then raise exception 'Owner deletion failed'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform * from public.vocabulary; raise exception 'Anonymous read should fail'; exception when insufficient_privilege then null; end;
 begin perform public.consume_ai_request(); raise exception 'Anonymous rate-limit RPC should fail'; exception when insufficient_privilege then null; end;
end $$;
rollback;
\echo 'PASS: real PostgreSQL RLS, ownership, contextual uniqueness, timestamp, delete, and rate limit; Supabase identity simulated.'
