# Rastreador D&D — como publicar

Esta pasta é o conteúdo do repositório público `rastreador-dnd`.

1. Falta só o pdf.js (usado pelo importador do Livro do Jogador): coloque `pdf.min.mjs` e `pdf.worker.min.mjs`
   (pacote `pdfjs-dist` 4.4.168, pasta `build/`) em `vendor/pdfjs/`.
2. Envie tudo para o repositório `rastreador-dnd` e ative Settings → Pages (branch `main`, pasta `/`).
3. No site antigo (`Iniciativa.html`), sincronize; no site novo, informe repositório e token e sincronize.
4. Para testar no computador: `python -m http.server 8000` nesta pasta e abra `http://localhost:8000`.
5. Ao mudar qualquer arquivo já publicado, aumente o número em `CACHE` no `sw.js` para os aparelhos pegarem a versão nova.
