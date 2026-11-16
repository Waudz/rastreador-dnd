# Interface Vue 3 + Vite (piloto isolado)

Esta pasta é uma **base experimental**, não uma migração completa do Compêndio 5e. As páginas HTML, o Supabase, o service worker e o GitHub Pages atuais permanecem intactos.

## Rodar localmente
```bash
cd frontend
npm install
npm run dev
```

## Compilar
```bash
npm run build
```

O resultado fica em `frontend/dist/`. **Não publicar esse diretório sobre a raiz do site atual**: isso substituiria páginas existentes. A integração futura deve ser feita por rotas específicas e com revisão do cache offline e do pipeline de deploy.

O componente `CatalogoBase.vue` demonstra pesquisa, ordenação alfabética e lista/grade com dados fictícios. A integração com os catálogos reais, permissões, filtros avançados e armazenamento das preferências ainda será desenvolvida.

O `vite.config.js` usa `@vitejs/plugin-vue`; dependências devem ser instaladas antes de compilar.
