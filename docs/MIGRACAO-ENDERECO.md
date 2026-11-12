# Mudança de endereço: `rastreador-dnd` para `compendio-5e`

Objetivo: renomear o repositório `Waudz/rastreador-dnd` para `Waudz/compendio-5e` (mesmo repositório, mesmo histórico) e passar a servir o site em `https://waudz.github.io/compendio-5e/`.

**Nada disto foi executado.** Este documento é a análise e a sequência. Renomear o repositório, mudar o Supabase e publicar dependem de autorização do William.

## 1. O que muda e o que não muda

| Item | Efeito da mudança |
|---|---|
| Endereço do site | Passa de `.../rastreador-dnd/` para `.../compendio-5e/`. **O GitHub não redireciona sites de projeto (Pages).** O endereço antigo passa a dar 404. |
| Origem (`https://waudz.github.io`) | **Não muda.** |
| `localStorage` e IndexedDB | Ficam presos à **origem** (esquema + domínio + porta), não ao caminho. Como a origem é a mesma, os dados locais e a sessão guardados no endereço antigo **continuam visíveis** no novo, no mesmo navegador. Isto vale para o navegador e para a PWA instalada, que usam o mesmo armazenamento da origem. Não é uma cópia: é o mesmo armazenamento. |
| Dados no Supabase (contas, campanhas, personagens, fotos) | Não mudam. O banco não depende do endereço do site. |
| Código do site | **Nada a alterar.** Não há endereço fixo no código: `manifest.json` usa `./` (relativo), o service worker usa caminhos relativos, e os links de e-mail são montados com `location.href` / `location.origin + location.pathname` (`js/nuvem.js`, `js/entrar.js`). |
| `manifest.json` | `id`, `start_url` e `scope` são `./` e continuam válidos no novo endereço. O `id` é resolvido contra a origem, que não muda. |
| Service worker e cache | O escopo do service worker é o caminho: o novo endereço registra um service worker novo. O cache offline é montado de novo na primeira visita online. O prefixo do cache (`rastreador-vN`) é só um nome técnico e pode continuar. |
| PWA já instalada | Aponta para o caminho antigo. Depois da mudança, online, ela abre uma página 404; offline, ainda abre a cópia guardada. Cada instalação precisa ser refeita a partir do novo endereço. |
| Links de e-mail já enviados (confirmação, recuperação de senha) | Apontam para o endereço antigo e deixam de funcionar. Quem pediu algum e-mail pouco antes precisa pedir outro. |
| Referências no repositório ao endereço antigo | Só três: `AGENTS.md` (linha 3, nome do repositório) e `supabase/LEIA-ME.md` (linhas 8 e 22, nome do projeto e exemplo de Site URL). Atualizar depois da mudança. |
| Git local | O GitHub redireciona o endereço antigo do repositório por um tempo, mas convém atualizar o remote. |
| GitHub Actions | O workflow não cita o nome do repositório. Continua funcionando. O histórico de execuções acompanha o repositório. |
| Turnstile (se um dia for ativado) | A chave é por domínio (`waudz.github.io`), sem caminho. Não muda. |

## 2. Estratégia de segurança dos dados

Como o armazenamento local é compartilhado entre os dois endereços, a migração dos dados **não depende de copiar nada**. Mesmo assim, não presumimos isso: antes de renomear, faça os backups abaixo, em cada aparelho onde houver dados que talvez não estejam sincronizados.

1. **Minha conta, "Backup e restauração":** baixar o backup das criações (monstros e fichas próprias, com fotos). Sincroniza e baixa o que está na conta.
2. **Iniciativa, "Dados deste aparelho":** baixar o backup do combate (por campanha, o combate ativo) e, se usou o aplicativo sem conta, o backup das criações de visitante.
3. **Repositório:** guardar uma cópia completa do histórico fora do GitHub, por exemplo `git clone --mirror https://github.com/Waudz/rastreador-dnd.git` em `<diretorio-privado>`, antes de renomear.
4. Conferir no Supabase (painel, Table Editor) que as tabelas de campanhas e personagens têm os dados esperados. A mudança não os toca, mas é o ponto de referência.

Recuperação, se algo parecer vazio no novo endereço (por exemplo, outro navegador ou perfil, onde nunca houve dados locais): entrar na conta (campanhas, personagens e criações sincronizadas voltam do servidor) e usar "Restaurar" com os arquivos de backup. A restauração só adiciona e nunca apaga nem sobrescreve sem confirmação.

## 3. Sequência recomendada

**Antes (nenhuma mudança no endereço):**
1. Publicar a versão atual (identidade Compêndio 5e), se aprovada, ainda no endereço antigo, e conferir Actions e Pages.
2. Fazer os backups da seção 2.
3. **Supabase, Authentication, URL Configuration:** *adicionar* à lista de Redirect URLs `https://waudz.github.io/compendio-5e/**`. **Não remover** a antiga ainda. Não mudar o Site URL ainda.

**A mudança:**
4. **GitHub, repositório, Settings, General, Repository name:** renomear para `compendio-5e`. Em Settings, Pages, a fonte (branch `main`) permanece. Aguardar a publicação (Actions, "pages build and deployment") e abrir `https://waudz.github.io/compendio-5e/`.
5. Máquina local: `git remote set-url origin https://github.com/Waudz/compendio-5e.git` e `git remote -v` para conferir.

**Depois:**
6. **Supabase, URL Configuration:** mudar o **Site URL** para `https://waudz.github.io/compendio-5e/`. Manter a URL antiga na lista por algum tempo e removê-la depois, quando ninguém mais precisar dela.
7. Atualizar as referências da seção 1 (`AGENTS.md`, `supabase/LEIA-ME.md`) e aumentar o `CACHE` em `sw.js`. Commit e publicação só com autorização.
8. Testar no novo endereço, no mesmo navegador usado antes: continua conectado, campanhas e personagens aparecem, o combate local e as criações estão lá, entrar e sair, recuperação de senha e confirmação de e-mail (com links novos), instalação da PWA.
9. Cada pessoa que instalou a PWA remove o ícone antigo e instala de novo a partir do novo endereço (o ícone e o nome já são os do Compêndio 5e).

## 4. Riscos conhecidos

- **404 no endereço antigo, sem redirecionamento.** Quem tiver o link ou a PWA antiga online verá 404 até reinstalar. A única forma de manter um redirecionamento é existir algo servido em `https://waudz.github.io/rastreador-dnd/` (por exemplo, um repositório com esse nome, ou uma pasta `rastreador-dnd/` num repositório `waudz.github.io`). Isso é um repositório novo, fora do que foi pedido, então não foi preparado. Se quiser, é uma decisão para depois.
- **Janela de transição opcional.** Antes de renomear, é possível publicar uma versão com um aviso "O Compêndio 5e mudou de endereço" e link para o novo. Quem abrir o aplicativo nesse intervalo, ou offline depois da mudança (a cópia guardada ainda abre), verá o aviso. Não foi implementado; depende de você querer.
- **E-mails em trânsito.** Links de confirmação ou recuperação enviados antes da mudança quebram. Escolher uma hora de pouco uso, ou avisar.
- **Dois endereços ao mesmo tempo.** Enquanto os dois existirem, compartilham o mesmo armazenamento da origem, e o service worker de um pode apagar caches com nome diferente do seu (o do outro). Isso só afeta o uso offline do endereço mais antigo; os dados do usuário (localStorage, IndexedDB) não são tocados pelo service worker.
