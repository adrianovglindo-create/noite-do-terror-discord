# Noite do Terror

Site do evento de Halloween do Discord (30/10 a 01/11/2026): catálogo de jogos co-op e roleta com cartas de pular, banir e salvar, sincronizada ao vivo entre todos os participantes pelo Supabase.

Feito com React + Vite. O banco é o Supabase (uma tabela só, com tempo real).

## 1. Criar o banco no Supabase (uma vez)

1. Entre em https://supabase.com e crie um projeto (o plano gratuito serve). Anote a senha do banco em algum lugar, mas ela não vai no site.
2. No projeto, abra **SQL Editor**, cole todo o conteúdo de [`supabase/setup.sql`](supabase/setup.sql) e clique em **Run**.
3. Vá em **Project Settings > API** e copie:
   - **Project URL** (ex.: `https://abcdefghijkl.supabase.co`)
   - a chave **anon** / **publishable** (é pública, pode ir no código)
   - **Nunca** use a chave `service_role` / `secret` no site.
4. Coloque as duas em [`src/config.js`](src/config.js) (no projeto atual isso já está feito):
   ```js
   url: import.meta.env.VITE_SUPABASE_URL || "https://abcdefghijkl.supabase.co",
   key: import.meta.env.VITE_SUPABASE_KEY || "eyJ...a-chave-anon...",
   ```

> Projetos gratuitos do Supabase pausam depois de cerca de 7 dias sem uso. Abra o painel do projeto (e o site) alguns dias antes do evento e de novo no dia, para garantir que está ativo.

## 2. Publicar na Vercel

O site está em **https://noite-do-terror-discord.vercel.app**, num projeto da Vercel ligado a este repositório. Cada mudança enviada para a `main` vira um deploy sozinha, e cada pull request ganha um link de prévia.

Para ligar de novo do zero (outra conta, por exemplo):

1. Em https://vercel.com/new, escolha **Import Git Repository > GitHub** e importe este repositório. Se ele não aparecer, libere o acesso em **Adjust GitHub App Permissions**.
2. A Vercel reconhece o Vite sozinha (comando `npm run build`, pasta `dist`). É só clicar em **Deploy**.
3. Não precisa de variáveis de ambiente: a URL e a chave pública do Supabase já estão em `src/config.js`.

## 3. No dia do evento

1. O dono do evento abre o site, vai na aba **Roleta**, abre "Definir PIN do ADM (primeiro acesso)" e define o PIN. Só dá para definir uma vez.
2. Cada participante abre o site no próprio aparelho, cria a conta (nome, cor e PIN de 4 números) e recebe 3 cartas de pular, 1 de banir e 1 de salvar.
3. O ADM monta o grupo de jogos (filtros, desmarcar, "Banir (ADM)" para os já jogados, porcentagens) e gira. Todo mundo vê a roleta girar até o mesmo jogo.

Antes do evento, faça um teste real com 2 ou 3 pessoas. No fim do teste, o ADM usa "Devolver todas as cartas e limpar histórico". Para começar do zero (apagar contas e o PIN do ADM), rode no SQL Editor: `delete from public.estado;`

## Rodar no computador (para quem vai mexer no código)

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm run build      # gera a pasta dist
```

Vai mexer no código com o Claude? Ele lê o [`INTRODUCAO.md`](INTRODUCAO.md) antes (o `CLAUDE.md` aponta para ele). Se estiver usando o Claude pelo chat, cole esse arquivo na conversa primeiro.
