# Supabase JS (cópia fixa)

Pacote oficial `@supabase/supabase-js` **2.118.0** (licença MIT, arquivo `LICENSE` ao lado), arquivo de navegador `dist/umd/supabase.js`.

- Origem: <https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.118.0.tgz>
- Integridade conferida contra o registro do npm: `sha512-` do pacote igual ao publicado.
- Versão escolhida por ter mais de duas semanas de publicação (a mais nova, 2.119.0, tinha 7 dias).
- Usado só para autenticação (`createClient(...).auth`). As chamadas de dados e de arquivos continuam em `js/nuvem.js`.
- Para atualizar: baixar a nova versão, conferir a integridade, trocar o arquivo, rodar `node --test tests/*.cjs`, aumentar `CACHE` em `sw.js` e testar login, renovação de sessão e saída em duas abas.
