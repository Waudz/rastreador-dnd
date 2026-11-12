# Compêndio 5e — instruções para agentes (Codex e Claude)

Pasta única: `<raiz-do-repositorio>`. Repositório `Waudz/rastreador-dnd` (GitHub Pages, branch `main`). Só um agente edita por vez. Antes de começar: `git status` e `git pull --rebase origin main`. **Nunca fazer push nem alterar o Supabase sem o William pedir.**

## Ler primeiro (e só isso)
1. `docs/PENDENCIAS.md`: estado atual e **próxima tarefa**.
2. `docs/DECISOES.md`: decisões e requisitos permanentes (D&D 2014, personagem, magias, inventário, publicação).
3. Só quando a tarefa pedir: `docs/MODELO-PERSONAGEM.md`, `docs/SEGURANCA-SUPABASE.md`, `docs/MIGRACAO-ENDERECO.md`, `docs/CHECKLIST.md`. `docs/HISTORICO.md` é arquivo morto.

## Como trabalhar (economia de tokens)
- Trabalhe só na tarefa pedida. Leia só os arquivos necessários; sem auditorias completas fora de contexto.
- Durante o desenvolvimento rode testes específicos (`node --test tests/<arquivo>.cjs`); a suíte completa (`node --test tests/*.cjs`) ao concluir cada fase e antes de qualquer commit.
- Atualize a documentação só quando algo relevante mudar: estado e próxima tarefa em `docs/PENDENCIAS.md`; decisões em `docs/DECISOES.md`. Não duplicar conteúdo entre arquivos.
- Respostas curtas: alterações, testes, pendências e bloqueios. Não repetir o que já está documentado.
- Ao publicar mudança visível, aumentar `CACHE` em `sw.js`.

## O que é
Site estático (HTML/CSS/JS puro, scripts clássicos com `defer`, sem build, sem dependências novas): iniciativa, bestiário e magias SRD 5.1 (2014) em português, fichas, campanhas multiusuário no Supabase (`js/nuvem.js` com SDK em `vendor/supabase`), PWA offline (`sw.js`). CSP por `<meta>`: `script-src 'self'`; Supabase só em `https://pdjzahpxjrlbqqtzkfdr.supabase.co`. Nome e símbolo: `docs/IDENTIDADE-VISUAL.md`.

## Mapa rápido
- Páginas: `index.html`/`conta.html`, `campanha.html`, `personagem.html`, `criar-personagem.html` (criar, `?modo=nivel`, `?modo=editar`), `iniciativa.html` (`?aba=`), `entrar.html`, `admin.html`.
- Motor de personagem: `js/criador-regras.js` (`CRIADOR`) + `js/criador.js` (interface); regras comuns `js/regras.js` (`REGRAS`); magias de jogo `js/magias-jogo.js`; ficha `js/personagem.js`.
- Combate `js/iniciativa.js` (chave por campanha `dnd5e_initiative_tracker_v1:<id>`); campanha ativa `js/campanhas-ui.js`; painel `#dock-r`: `js/painel-detalhes.js` + `js/paineis-layout.js`.
- Carregamento: `js/esqueleto.js` (blocos `<!--esq:tipo-->` no HTML; `tests/esqueleto.test.cjs` exige sincronia), `js/pre-pagina.js`, `js/splash.js`.
- Dados SRD em `dados/`; SQL em `supabase/` (mudar o banco exige o William rodar o SQL).

## Convenções
- pt-BR. **Sem emojis; ícones SVG** (`js/icones.js`). Vocabulário: salvaguarda, círculo, metros.
- Não misturar dados de campanhas. Nunca pedir nem gravar senha, token, `service_role` ou chave secreta.
- Chaves de armazenamento e identificadores técnicos não mudam com o nome (`dnd5e_*`, `ini_*`, prefixo do cache `rastreador-vN`).
- Arquivos privados ficam em `<diretorio-privado>`, fora do repositório.
