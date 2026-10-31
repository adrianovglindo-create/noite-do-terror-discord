# Introdução para o Claude: leia antes de mexer no repositório

Este é o site do evento **Noite do Terror**, a noite de jogos de Halloween de um servidor do Discord. Este arquivo explica o que é o projeto, as regras que não podem ser quebradas e como trabalhar aqui. Leia tudo antes da primeira mudança.

## Antes de começar

- **Quem pede mudanças aqui muitas vezes não é programador.**
  - Explique em português simples o que você mudou e como a pessoa confere no site.
  - Sem jargão.
  - Se o pedido for ambíguo e mexer nas regras do evento, pergunte antes.
- Antes de editar:
  1. Rode `git status` e `git pull`.
  2. Se houver mudanças de outra pessoa que você não fez, preserve-as.
- Antes de entregar:
  1. Rode `npm run build`. Se der erro, conserte.
  2. Confira a mudança no navegador com `npm run dev`.
  3. Para simular dois aparelhos, abra uma janela normal e uma anônima: cada uma é uma "pessoa" diferente.
- Não há testes automatizados no projeto (foram removidos de propósito). A conferência é manual.
- Commits e textos da interface em **português do Brasil**.

## O evento

- **Sexta 30/10/2026 às 17h até domingo 01/11/2026.** A live é controlada pelos participantes. Uma roleta sorteia jogos co-op, e quem acumular mais horas jogadas ganha **R$100**.
- O site tem duas abas:
  - **Catálogo**: 143 jogos com busca e filtros (jogadores, tema, tamanho).
  - **Roleta**: sorteio ponderado, com as cartas de cada participante mexendo nas chances.
- Jogos não podem repetir, mas isso é **manual**: o ADM usa "Banir (ADM)" nos que já foram jogados.

## Regras das cartas

Foram definidas pelo dono do evento. Não mude sem ele pedir.

- Cada participante cria uma conta com **nome, cor e PIN de 4 números**.
  - Cores: Azul, Verde, Amarelo, Roxo, Rosa, Vermelho, Preto, Branco.
  - A cor aparece ao lado das cartas.
- Cada um recebe:
  - **3 cartas de pular** (joker colorido). Quando a roleta cai num jogo, a pessoa pode pular: gasta uma carta e a roleta gira de novo.
  - **1 carta de banir** (joker preto). Tira um jogo da roleta.
  - **1 carta de salvar** (joker vermelho). Dobra a chance de um jogo não banido. Cada carta de salvar no mesmo jogo multiplica por 2 de novo (2 cartas = 4×).
- Banir e salvar podem ser colocadas e retiradas à vontade.
- Todos veem quantas cartas cada um tem e onde cada carta foi colocada.
- Cada um só mexe nas próprias cartas. O ADM mexe nas de todos.
- O desenho das cartas hoje é um chapéu de bobo genérico em SVG (`JokerCard`, em `src/components/common.jsx`). O dono vai mandar o design próprio.
  - **Não use** as imagens de referência que ele mostrou antes: uma tinha marca d'água de banco de imagens e a outra era ilustração de terceiros.

## O ADM

- O PIN do ADM é definido no primeiro acesso e **só pode ser definido uma vez**.
- Só o ADM vê:
  - o botão de girar;
  - a área "Quem entra na roleta" (filtros, desmarcar jogo, "Banir (ADM)", porcentagens com precisão de 0,01%);
  - "Vai ser esse! ✅";
  - "devolver carta" no histórico;
  - "Devolver todas as cartas e limpar histórico".
- O giro:
  1. O ADM gira e o resultado vai para o banco.
  2. Todos os aparelhos animam até o mesmo jogo.
  3. Aparece "Alguém quer pular?". Se duas pessoas apertam juntas, só a primeira gasta a carta.
  4. Quando alguém pula, a tela do ADM gira de novo sozinha depois de 1,7 s.
  5. Quando o ADM aperta "Vai ser esse! ✅", todos veem a comemoração em tela cheia (`src/components/Celebration.jsx`): explosões, confete, abóboras voando, tela tremendo e som sintetizado (botão 🔊/🔇, lembrado em `nt-som`). Como o navegador só libera som depois de um toque na página, a aba Roleta mostra "🔊 Toque aqui para ativar o som da festa" até a pessoa tocar em algo. Ela só começa depois que a roda parou em cada tela, não aparece para quem abre a página depois e fecha sozinha em 9 s, com "Fechar", clique fora ou Esc. Com "reduzir movimento" ligado no aparelho, a festa fica mais calma.
- Quando o ADM gira, quem estiver na aba Catálogo é levado para a aba Roleta para ver o giro.
- Aba **⏱️ Tempo** (`src/components/Timers.jsx`): todos veem os cronômetros e o ranking ao vivo, mas só o ADM controla: Iniciar/Pausar, somar ou tirar minutos, zerar (com confirmação), "Pausar todos" e ranking. Mostra quantas pessoas estão contando, o último jogo escolhido na roleta e um aviso quando há menos de 3 pessoas contando (regra 1). Os tempos ficam na linha `timers` do banco (`{idDoParticipante: {total, since}}`), então recarregar a página não perde nada; o relógio usado é o do aparelho do ADM.
- Histórico (só ADM): "devolver carta" num pulo, "excluir" um registro (se for um pulo, pode excluir devolvendo a carta), "🗑 limpar histórico" e "devolver pulos de todos". No painel de cartas, o ADM também tem "devolver pulos" por participante. Tudo pede confirmação na janela de `src/components/ConfirmDialog.jsx` (`useConfirm`).

## Como funciona por dentro

- **React 19 + Vite**, em JavaScript, sem TypeScript e sem biblioteca de estado.
- Publicado na **Vercel** (https://noite-do-terror-discord.vercel.app), ligada ao GitHub: cada commit na `main` vira deploy sozinho. A Vercel detecta o Vite (build `npm run build`, pasta `dist`); cabeçalhos extras ficam em `vercel.json`.
- **Supabase é o único lugar onde o estado vive.** Não existe modo local/offline: cada participante usa as cartas no próprio aparelho, e a roleta que vale é a do ADM, que aparece na live.
- Tudo fica em **uma tabela**, `public.estado`, com as colunas `key` (texto), `value` (json), `ver` (número da versão) e `updated_at`. O SQL está em `supabase/setup.sql`.
- Cada linha é um pedaço do estado:

  | key | conteúdo |
  |---|---|
  | `config` | configuração da roleta feita pelo ADM (filtros, desmarcados, banidos pelo ADM, porcentagens). Todos calculam a mesma roleta a partir dela |
  | `spin` | giro atual: `{seq, winner, state: live/skipped/chosen, by}` |
  | `admin` | `{pin}` (hash do PIN do ADM) |
  | `players/<id>` | um participante: `{name, color, pin, skipsUsed, ban, save, ts}` |
  | `history/<id>` | um item do histórico: `{game, type: pulado/escolhido, by, ts, undone}` |

- **Toda escrita passa por `Store.tx`** (`src/lib/store.js`):
  1. Lê a linha.
  2. Calcula o valor novo.
  3. Grava só "onde `ver` = versão lida", tentando de novo até 6 vezes.

  É isso que garante "só o primeiro pulo vale" e "PIN do ADM só uma vez". **Não troque por gravação direta (`upsert`)**.
- Cliques do ADM e das cartas aparecem na tela na hora (`{ optimistic: true }`) e o banco confirma em seguida. Pular e PIN do ADM **não** são otimistas, de propósito.
- As mudanças chegam a todos pelo Realtime do Supabase. Ao (re)conectar, e quando a aba volta a ficar visível, o estado inteiro é recarregado.
- PINs são guardados como hash SHA-256 (`src/lib/hash.js`).
- `localStorage` só lembra "quem sou eu neste aparelho" (`nt-me`, `nt-adm`). Todo acesso a ele passa por `src/lib/storage.js` (com try/catch), porque alguns navegadores bloqueiam o armazenamento e isso já derrubou o site uma vez.

### Onde fica cada coisa

| Arquivo | O quê |
|---|---|
| `src/data/games.js` | Lista de jogos (adicionar/corrigir jogo é aqui) e links da Steam |
| `src/lib/filters.js` | Filtros do catálogo e textos como "2 a 4 jogadores", "~5 GB" |
| `src/lib/wheel.js` | Pesos, efeito das cartas e sorteio |
| `src/lib/pool.js` | Monta o grupo da roleta a partir da `config` do ADM |
| `src/lib/store.js` | Leitura e escrita no Supabase + tempo real |
| `src/state/evento.js` | Estado global (`useEvento()`) e todas as ações: criar conta, pular, girar, colocar carta… |
| `src/components/` | Telas: `Catalog`, `Roulette`, `SpinResult`, `PlayersCards`, `AccountBox`, `AdminPanel`, `HistoryList`, `WheelSvg`, `WheelList` (lista "Na roleta agora" / "Fora da roleta", visível para todos), `Celebration` (festa do jogo escolhido), `ConfirmDialog` (janela de confirmação), `Timers` (aba Tempo: todos veem, só o ADM controla), `common` |
| `src/style.css` | Todo o visual (cores em variáveis no `:root`, tema claro e escuro) |
| `src/config.js` | URL e chave anon do Supabase |
| `supabase/setup.sql` | Criação da tabela, permissões e tempo real |
| `LEIA-ME.md` | Passo a passo para humanos: criar o Supabase, publicar na Vercel, usar no dia |

## Regras que não podem ser quebradas

- **Nunca** coloque a chave `service_role`/`secret` do Supabase no código nem em lugar nenhum do repositório. Só a `anon`/`publishable` (que é pública) vai em `src/config.js`.
- **Nunca** apague nem altere dados do banco do evento por conta própria (contas, cartas, PIN do ADM). Se precisar, explique o que seria feito e peça para a pessoa confirmar.
- Mudança no banco (tabela, permissões) vai em `supabase/setup.sql`, escrita para poder rodar de novo sem erro (`if not exists`, `drop policy if exists`). Avise que alguém precisa rodá-la no SQL Editor do Supabase.
- Mudou alguma regra das cartas ou da roleta? Atualize este arquivo também.

## Segurança (já combinado com o dono)

A segurança é só no navegador. O PIN impede uso por engano ou brincadeira, mas alguém com conhecimento técnico consegue burlar, porque a chave anon pode escrever na tabela. Para um evento entre amigos isso foi aceito. Não precisa "consertar" sem pedido.

## Comandos

```bash
npm install
npm run dev       # site em http://localhost:5173 (precisa de src/config.js preenchido)
npm run build     # gera dist/ (rode sempre antes de entregar)
```

## Pendências

- [x] Criar o projeto no Supabase, rodar `supabase/setup.sql` e preencher `src/config.js` (feito em 12/10/2026, projeto `bpughareviyswxvcnyae`, região São Paulo).
- [x] Ligar a Vercel ao repositório do GitHub (projeto `noite-do-terror-discord`, equipe `adriano-49ab`).
- [ ] Teste real com 2 ou 3 pessoas antes do evento.
- [ ] Abrir o projeto do Supabase alguns dias antes e no dia (projeto gratuito pausa após ~7 dias sem uso).
- [ ] Trocar os jokers genéricos pelo design próprio das cartas quando o dono enviar.

## Segurança do ADM (no servidor)

- A senha do ADM fica só no Supabase, na tabela privada `admin_secret` (bcrypt). Ninguém de fora lê essa tabela.
- Definir ou trocar a senha: no **SQL Editor** do Supabase, rode `select public.admin_definir_senha('sua-senha');` (mínimo 4 caracteres). Trocar a senha desconecta todos os ADMs logados.
- Participantes (chave pública/anon) **não conseguem gravar** nas linhas `config`, `admin` e `timers`: o banco recusa (RLS).
- O login (`admin_login`) devolve uma sessão aleatória, guardada no navegador (`nt-adm-sessao`), que vale 7 dias. O ADM grava tudo pela função `admin_write`, que confere a sessão. No login, no máximo 5 senhas erradas a cada 10 minutos (para todos); quem já está logado continua funcionando mesmo durante o bloqueio.
- O site só entra no modo ADM depois que o servidor confirma a sessão (`admin_sessao_ok`). Trocar dados no navegador não dá acesso.
- Continua aberto aos participantes, de propósito: as próprias contas, cartas, o "pular" (linha `spin`) e o histórico.
- Filtro **Preço** (catálogo e roleta): Grátis, Hydra (pago) e A confirmar. Sem nada marcado, entram todos; marcando, entram só os escolhidos (ex.: Grátis + A confirmar). Na roleta fica salvo na `config` (`filters.status`).
