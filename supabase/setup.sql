-- Noite do Terror: configuração do banco (rodar UMA vez no SQL Editor do Supabase).
--
-- Uma tabela só, usada como quadro compartilhado em tempo real. Cada linha é um
-- pedaço do estado do evento:
--   config        configuração da roleta feita pelo ADM
--   spin          giro atual (seq, winner, state, by)
--   admin         hash do PIN do ADM
--   players/<id>  um participante e as cartas dele
--   history/<id>  um item do histórico
-- "ver" é o controle de concorrência otimista: o site só atualiza uma linha
-- "onde ver = versão que ele leu", e soma 1.
--
-- Segurança: o site usa a chave anon (pública) e as regras ficam no navegador.
-- O PIN evita uso por engano ou brincadeira, não impede alguém com
-- conhecimento técnico. Para um evento entre amigos isso foi aceito.

create table if not exists public.estado (
  key text primary key
    check (key ~ '^(config|spin|admin|timers|players/[a-z0-9]{4,40}|history/[a-z0-9]{4,40})$'),
  value jsonb,
  ver integer not null default 1 check (ver >= 1),
  updated_at timestamptz not null default now(),
  check (pg_column_size(value) <= 32768)
);

alter table public.estado enable row level security;

grant select, insert, update, delete on public.estado to anon;

drop policy if exists "leitura" on public.estado;
drop policy if exists "insercao" on public.estado;
drop policy if exists "edicao" on public.estado;
drop policy if exists "remocao" on public.estado;
create policy "leitura" on public.estado for select to anon using (true);
create policy "insercao" on public.estado for insert to anon with check (true);
create policy "edicao" on public.estado for update to anon using (true) with check (true);
create policy "remocao" on public.estado for delete to anon using (true);

-- Realtime: avisa todos os aparelhos quando uma linha muda
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'estado'
  ) then
    alter publication supabase_realtime add table public.estado;
  end if;
end $$;

-- Para bancos criados antes da aba Tempo: libera a linha "timers" (pode rodar de novo sem problema).
alter table public.estado drop constraint if exists estado_key_check;
alter table public.estado add constraint estado_key_check
  check (key ~ '^(config|spin|admin|timers|players/[a-z0-9]{4,40}|history/[a-z0-9]{4,40})$');

-- ============================================================
-- Segurança do ADM (senha no servidor). Participantes (anon) não
-- gravam em config, admin e timers; o ADM grava pela função
-- admin_write, que confere a senha. Para definir/trocar a senha,
-- rode no SQL Editor:   select public.admin_definir_senha('sua-senha');
-- ============================================================
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.admin_secret (
  id int primary key default 1 check (id = 1),
  pass_hash text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.admin_tentativas (ts timestamptz not null default now());
alter table public.admin_secret enable row level security;
alter table public.admin_tentativas enable row level security;
revoke all on public.admin_secret from anon, authenticated;
revoke all on public.admin_tentativas from anon, authenticated;

create or replace function public.admin_definir_senha(p_nova text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_nova is null or length(p_nova) < 8 then raise exception 'A senha precisa ter pelo menos 8 caracteres.'; end if;
  insert into public.admin_secret(id, pass_hash) values (1, extensions.crypt(p_nova, extensions.gen_salt('bf', 10)))
  on conflict (id) do update set pass_hash = excluded.pass_hash, updated_at = now();
  delete from public.admin_tentativas;
  return 'Senha do ADM definida.';
end $$;
revoke all on function public.admin_definir_senha(text) from public, anon, authenticated;

create or replace function public.admin_ok(p_pass text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare h text; falhas int;
begin
  select count(*) into falhas from public.admin_tentativas where ts > now() - interval '1 minute';
  if falhas >= 15 then raise exception 'Muitas tentativas erradas. Espere um minuto.'; end if;
  select pass_hash into h from public.admin_secret where id = 1;
  if h is not null and p_pass is not null and extensions.crypt(p_pass, h) = h then return true; end if;
  insert into public.admin_tentativas default values;
  delete from public.admin_tentativas where ts < now() - interval '1 hour';
  return false;
end $$;
revoke all on function public.admin_ok(text) from public;
grant execute on function public.admin_ok(text) to anon, authenticated;

create or replace function public.admin_write(p_pass text, p_key text, p_value jsonb, p_ver int) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.admin_ok(p_pass) then raise exception 'Senha do ADM incorreta.' using errcode = '42501'; end if;
  if coalesce(p_ver, 0) = 0 then
    if p_value is null then return 0; end if;
    insert into public.estado(key, value, ver) values (p_key, p_value, 1) on conflict (key) do nothing;
    get diagnostics n = row_count; return case when n = 1 then 1 else -1 end;
  end if;
  if p_value is null then
    delete from public.estado where key = p_key and ver = p_ver;
    get diagnostics n = row_count; return case when n = 1 then 0 else -1 end;
  end if;
  update public.estado set value = p_value, ver = p_ver + 1, updated_at = now() where key = p_key and ver = p_ver;
  get diagnostics n = row_count; return case when n = 1 then p_ver + 1 else -1 end;
end $$;
revoke all on function public.admin_write(text, text, jsonb, int) from public;
grant execute on function public.admin_write(text, text, jsonb, int) to anon, authenticated;

drop policy if exists "insercao" on public.estado;
drop policy if exists "edicao" on public.estado;
drop policy if exists "remocao" on public.estado;
create policy "insercao" on public.estado for insert to anon with check (key !~ '^(config|admin|timers)$');
create policy "edicao" on public.estado for update to anon using (key !~ '^(config|admin|timers)$') with check (key !~ '^(config|admin|timers)$');
create policy "remocao" on public.estado for delete to anon using (key !~ '^(config|admin|timers)$');

-- ============================================================
-- Sessões do ADM (substitui admin_ok/admin_write com senha).
-- O login devolve um código aleatório; as gravações usam esse código.
-- Senhas erradas: no máximo 5 a cada 10 minutos.
-- ============================================================
create table if not exists public.admin_sessoes (
  token text primary key,
  expires timestamptz not null default now() + interval '7 days'
);
alter table public.admin_sessoes enable row level security;
revoke all on public.admin_sessoes from anon, authenticated;

create or replace function public.admin_definir_senha(p_nova text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_nova is null or length(p_nova) < 4 then raise exception 'A senha precisa ter pelo menos 4 caracteres.'; end if;
  insert into public.admin_secret(id, pass_hash) values (1, extensions.crypt(p_nova, extensions.gen_salt('bf', 10)))
  on conflict (id) do update set pass_hash = excluded.pass_hash, updated_at = now();
  delete from public.admin_tentativas;
  delete from public.admin_sessoes;
  return 'Senha do ADM definida.';
end $$;
revoke all on function public.admin_definir_senha(text) from public, anon, authenticated;

create or replace function public.admin_login(p_pass text) returns text
language plpgsql security definer set search_path = '' as $$
declare h text; falhas int; tok text;
begin
  select count(*) into falhas from public.admin_tentativas where ts > now() - interval '10 minutes';
  if falhas >= 5 then raise exception 'Muitas tentativas erradas. Espere 10 minutos.'; end if;
  select pass_hash into h from public.admin_secret where id = 1;
  if h is null then raise exception 'A senha do ADM ainda não foi definida.'; end if;
  if p_pass is not null and extensions.crypt(p_pass, h) = h then
    tok := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.admin_sessoes(token) values (tok);
    delete from public.admin_sessoes where expires < now();
    return tok;
  end if;
  insert into public.admin_tentativas default values;
  delete from public.admin_tentativas where ts < now() - interval '1 day';
  return null;
end $$;
revoke all on function public.admin_login(text) from public;
grant execute on function public.admin_login(text) to anon, authenticated;

create or replace function public.admin_sessao_ok(p_token text) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists(select 1 from public.admin_sessoes where token = p_token and expires > now());
$$;
revoke all on function public.admin_sessao_ok(text) from public;
grant execute on function public.admin_sessao_ok(text) to anon, authenticated;

create or replace function public.admin_sair(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.admin_sessoes where token = p_token;
$$;
revoke all on function public.admin_sair(text) from public;
grant execute on function public.admin_sair(text) to anon, authenticated;

drop function if exists public.admin_write(text, text, jsonb, int);
drop function if exists public.admin_ok(text);
create function public.admin_write(p_token text, p_key text, p_value jsonb, p_ver int) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.admin_sessao_ok(p_token) then raise exception 'Sessão de ADM inválida. Entre de novo com a senha.' using errcode = '42501'; end if;
  if coalesce(p_ver, 0) = 0 then
    if p_value is null then return 0; end if;
    insert into public.estado(key, value, ver) values (p_key, p_value, 1) on conflict (key) do nothing;
    get diagnostics n = row_count; return case when n = 1 then 1 else -1 end;
  end if;
  if p_value is null then
    delete from public.estado where key = p_key and ver = p_ver;
    get diagnostics n = row_count; return case when n = 1 then 0 else -1 end;
  end if;
  update public.estado set value = p_value, ver = p_ver + 1, updated_at = now() where key = p_key and ver = p_ver;
  get diagnostics n = row_count; return case when n = 1 then p_ver + 1 else -1 end;
end $$;
revoke all on function public.admin_write(text, text, jsonb, int) from public;
grant execute on function public.admin_write(text, text, jsonb, int) to anon, authenticated;
