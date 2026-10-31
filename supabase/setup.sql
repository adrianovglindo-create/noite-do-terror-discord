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
