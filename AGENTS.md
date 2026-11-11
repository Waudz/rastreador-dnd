# Rastreador D&D 5e — contexto para agentes (Codex e Claude)

Pasta única de trabalho: `C:\Users\LocaGOra\Downloads\William`. Repositório: `Waudz/rastreador-dnd` (GitHub Pages, branch `main`).
Só um agente edita por vez. Antes de começar: `git status` e `git pull --rebase origin main`. **Nunca fazer push sem o William pedir.**

## O que é
Site estático (HTML/CSS/JS puro, scripts clássicos com `defer`, sem build e sem dependências novas) com rastreador de iniciativa, bestiário/magias SRD 5.1 (2014) em português, fichas, campanhas multiusuário no Supabase (cliente próprio em `js/nuvem.js`, sem SDK), PWA offline (`sw.js`).
CSP por `<meta>`: `script-src 'self'`; Supabase só em `https://pdjzahpxjrlbqqtzkfdr.supabase.co`.

## Mapa rápido
- Páginas: `index.html`/`conta.html` (campanhas, personagens, conta), `campanha.html`, `personagem.html`, `criar-personagem.html`, `iniciativa.html` (iniciativa + Monstros + Magias por `?aba=`), `admin.html`.
- `js/campanhas-ui.js` campanha ativa por usuário (`ini_campanha:<id>`); `js/iniciativa.js` combate (chave por campanha `dnd5e_initiative_tracker_v1:<id>`); `js/campanha-ini.js` personagens da campanha na iniciativa.
- `js/painel-detalhes.js` + `js/paineis-layout.js`: painel único `#dock-r` (ficha, monstro, magia; Voltar/Fechar).
- `js/regras.js` regras de classes/raças/magias; `js/personagem.js` ficha; `dados/` SRD em português (`magias.json`, `bestiario/`, `srd-pt.json`).
- `supabase/` SQL; mudar o banco exige o William rodar o SQL no Supabase.

## Regras de trabalho
- pt-BR, respostas curtas. **Sem emojis; usar ícones SVG** (`js/icones.js`).
- Vocabulário do site: salvaguarda, círculo, metros.
- Não misturar dados de campanhas diferentes. Permissões vêm do servidor (RLS), nunca da URL ou do `localStorage`.
- Nunca pedir nem gravar senha, token de sincronização, `service_role` ou chave secreta. Só a URL e a chave pública do Supabase.
- Texto do Livro do Jogador (PDF) não entra no repositório público; só SRD (CC-BY-4.0).
- Ao publicar mudança visível, aumentar `CACHE` em `sw.js`.
- Testes: `node --test tests/*.cjs` (precisa passar antes de qualquer commit).
- Arquivos privados (notas, scripts, backup do trabalho pendente do Codex) ficam em `C:\Users\LocaGOra\Downloads\William-privado`, fora do repositório.
