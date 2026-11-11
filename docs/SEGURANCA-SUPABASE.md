# Segurança do Supabase: configurar, validar e testar

Este guia é para quem administra o projeto. **Nada aqui é aplicado pelo código.** São configurações do painel do Supabase e consultas de leitura. Os nomes dos menus podem variar um pouco na versão atual do painel. Em dúvida, a documentação oficial é a referência: <https://supabase.com/docs/guides/auth>.

O aplicativo nunca guarda senha: ela vai só ao Supabase por HTTPS. O navegador guarda apenas a sessão (`nuvem_sessao`). A chave que está no site é a **publicável**; a `service_role` nunca deve aparecer em arquivo, conversa ou commit.

## 1. Configurações obrigatórias antes do cadastro público

Faça nesta ordem e marque cada item.

1. **SMTP próprio** (Authentication → Emails → SMTP Settings). Sem ele, o projeto envia no máximo 2 e-mails por hora e a confirmação não funciona para mais de duas pessoas. Opções gratuitas: Brevo ou Gmail com senha de app (veja `LEIA-ME.md`). No provedor, **desligue o rastreio de links** (click tracking): ele reescreve o link de confirmação e o quebra. Use um remetente verificado.
2. **Confirm email: LIGADO** (Authentication → Sign In / Providers → Email). O aplicativo mostra "Confirme seu e-mail" e oferece reenviar.
3. **Senha** (mesmo lugar): tamanho mínimo **10** e exigência de **letras e dígitos** ("Letters and digits"). O aplicativo aplica a mesma regra no navegador só para dar retorno rápido: **quem decide é o servidor**. Contas antigas com senha mais curta continuam entrando; ao trocar a senha precisam seguir a regra.
4. **Secure password change** e **Require current password** (mesmo lugar): LIGADOS. O aplicativo confere a senha atual no servidor antes de alterar e, se o servidor exigir, pede o código enviado ao e-mail.
5. **URL Configuration**: *Site URL* = endereço do GitHub Pages; *Redirect URLs* = o mesmo endereço com `**` e `http://localhost:8000/**`. Sem isso, os links de confirmação e de recuperação não voltam ao site.
6. **Rate Limits** (Authentication → Rate Limits): conferir os valores padrão. Os de login e cadastro são por IP; com SMTP próprio o limite de e-mails sobe.
7. **Segurança de dados** (Project Settings → Data API): apenas o esquema `public` exposto (nunca `private`).
8. **Chaves**: usar só a chave publicável no site. Se a `service_role` (ou chave "secret") alguma vez foi colada em um lugar público, gere uma nova e revogue a antiga.

Recomendados (próxima fase): **CAPTCHA** no cadastro, login e recuperação (Turnstile ou hCaptcha; exige liberar o domínio dele na política de segurança do site); plano **Pro** para proteção contra senhas vazadas, para o projeto não pausar por inatividade e para baixar backups.

## 2. Consultas de leitura para conferir o banco real

Rode no SQL Editor. São só consultas (`select`), não alteram nada. Guarde o resultado e compare com o esperado.

```sql
-- 1) RLS ligado em tudo (esperado: rowsecurity = true em todas as tabelas de public e private)
select schemaname, tablename, rowsecurity from pg_tables where schemaname in ('public','private') order by 1,2;

-- 2) Políticas (esperado: as listadas em supabase/01, 02 e 03; nenhuma para o papel anon)
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname in ('public','storage') order by 1,2,3;

-- 3) Permissões de tabela (esperado: nada para anon; campanhas só com SELECT de colunas, sem "codigo")
select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema in ('public','private') and grantee in ('anon','authenticated','public') order by 1,2,3;
select table_name, column_name, grantee, privilege_type from information_schema.column_privileges
where table_schema = 'public' and table_name = 'campanhas' and grantee in ('anon','authenticated') order by 2;

-- 4) Funções que o navegador pode chamar (esperado: sem anon; só as funções do aplicativo)
select routine_schema, routine_name, grantee from information_schema.routine_privileges
where routine_schema in ('public','private') and grantee in ('anon','authenticated','public') order by 1,2,3;

-- 5) Storage (esperado: bucket documentos privado, 10 MB, tipos limitados)
select id, public, file_size_limit, allowed_mime_types from storage.buckets;

-- 6) Administradores (esperado: só as contas que você designou; veja a quantidade)
select count(*) as administradores from private.administradores;

-- 7) Cadastros sem e-mail confirmado (esperado: 0 depois de ligar a confirmação, exceto contas antigas)
select count(*) as sem_confirmacao from auth.users where email_confirmed_at is null;

-- 8) Tempo real (esperado: se o aplicativo não usa, a publicação pode ficar sem estas tabelas)
select * from pg_publication_tables where pubname = 'supabase_realtime';
```

Depois rode o **Security Advisor** (menu Advisors → Security) e leia cada alerta. Alertas sobre RLS desligado, funções com `search_path` aberto ou tabelas expostas devem ser resolvidos antes do lançamento. Para designar um administrador (só pelo SQL Editor, nunca pelo site): `insert into private.administradores(usuario_id) values ('<id da conta>');`

## 3. Roteiro de testes com duas contas (mestre e jogador)

Use e-mails de teste e senhas descartáveis; não registre senhas nem tokens em relatórios.

**Cadastro e acesso**
1. Criar conta com senha fraca: o site recusa antes de enviar. Com senha forte: aparece "Confirme seu e-mail" e nenhuma sessão é aberta.
2. Abrir o link do e-mail neste aparelho: entra logado. Tentar reutilizar o mesmo link: mensagem de link expirado.
3. "Esqueci minha senha": a mensagem é a mesma para e-mail existente e inexistente. O link leva à tela "Defina uma nova senha". Entrar com a nova senha.
4. Trocar a senha na conta: senha atual errada é recusada; certa pede, se o servidor exigir, o código enviado ao e-mail.
5. Sair em um aparelho e conferir o outro (a sessão deve cair quando renovar).

**Mestre e jogador**
6. Mestre cria campanha e vê o código de convite; jogador entra com ele (entra como jogador).
7. Jogador cria a própria ficha: o mestre a vê; um terceiro jogador (ou conta sem convite) não.
8. Jogador tenta, pelo console do navegador, alterar a ficha de outro, trocar o dono, ler documento oculto, listar arquivos da campanha e ler a coluna `codigo`: tudo deve falhar.
9. Mestre sobe um documento oculto e outro visível: o jogador só baixa o visível, inclusive por link direto do Storage.
10. Mestre troca o código: o antigo deixa de funcionar para novos jogadores; quem já entrou continua.
11. Conta comum tenta se tornar administradora (inserir em `private.administradores`): deve falhar.

**Dados entre aparelhos**
12. Criar um monstro no aparelho A; no B (mesma conta) ele aparece após sincronizar. Uma segunda conta nunca o vê.
13. Backup: em Minha conta → Backup, baixar o arquivo; em outra conta, restaurar: só adiciona; itens existentes não mudam sem confirmação.

## 4. O que sincroniza entre aparelhos (e o que não)

| Dado | Onde fica | Aparece em outro aparelho? |
|---|---|---|
| Contas, campanhas, participantes, fichas, diário, documentos | Supabase | Sim |
| Criações próprias (monstros, NPCs) e fotos | IndexedDB do navegador **e** cópia na conta (`acervos`) | Sim, após sincronizar |
| **Estado do combate** (ordem, rodada, turno, efeitos, valores de iniciativa, combatentes avulsos) | **Somente `localStorage` deste navegador**, uma chave por campanha | **Não** |
| Vida (PV atual) de personagens da campanha adicionados à iniciativa | Gravada na ficha (`personagens.pv_atual`) pelo mestre e relida a cada poucos segundos | Sim, só a vida |
| Campanha ativa, ordem do diário, filtros | `localStorage` | Não |

Ou seja: o combate **não** sincroniza entre aparelhos. Se o mestre abrir a iniciativa em outro aparelho ou limpar os dados do navegador, o combate em andamento não aparece. Só a vida dos personagens da campanha acompanha a ficha. Compartilhar o combate com os jogadores exigiria uma tabela própria no banco e regras de acesso (por exemplo, esconder PV de inimigos antes de enviar ao jogador); isso **não foi implementado** e é uma decisão de projeto separada.

## 5. Dados antigos e o repositório privado

Veja `docs/MIGRACAO-REPOSITORIO-PRIVADO.md`. Em resumo: o site não usa mais o GitHub; arquive o repositório (não exclua e não revogue o token) só depois de baixar um ZIP e conferir que as criações estão na conta. A tela **Minha conta → Backup e restauração** serve para isso: baixar um backup, restaurar um arquivo e "Procurar dados antigos neste navegador" (lê o banco antigo `bestiario` sem apagar nada; restaura só o que falta).

## 6. Fase B: sessão, CAPTCHA e modo visitante

**Sessão.** O login usa o SDK oficial (`vendor/supabase/`, versão e procedência em `LEIA-ME.md`), com PKCE, sessão persistente e renovação automática. A sessão fica no navegador (também na PWA) até a pessoa sair. Falta de internet na renovação nunca desconecta nem apaga dados locais; só o servidor recusar a sessão (ou o botão Sair) encerra.

**Entrada.** `entrar.html` concentra login, cadastro, recuperação e nova senha. As outras páginas que exigem conta enviam para `entrar.html?voltar=<página>` (só páginas do próprio site são aceitas como destino).

**Turnstile (desligado por padrão).** Para ativar, nesta ordem: (1) criar o widget no Cloudflare (modo invisível/gerenciado) com o domínio do site; (2) colocar a chave de site (pública) em `turnstileSiteKey`, em `js/config-nuvem.js`; (3) no Supabase, Authentication, proteção contra bots: ativar CAPTCHA com o provedor Turnstile e colar a chave secreta SÓ lá; (4) testar cadastro, login manual e recuperação, conferindo se a política de segurança (CSP) de `entrar.html` basta, e ajustar se o Cloudflare exigir mais (por exemplo `worker-src`). O CAPTCHA é pedido somente nessas ações; nunca na navegação, na iniciativa, em monstros, em magias nem na renovação da sessão. Não ativar o item 3 antes dos testes.

**Modo visitante.** Sem conta: pesquisar monstros, consultar magias e usar toda a iniciativa (combatentes manuais, estado salvo no aparelho). Exigem conta: criar fichas/monstros permanentes, fotos, personagens e campanhas. O visitante nunca chama o Supabase. Em "Dados deste aparelho" (iniciativa) é possível baixar/restaurar o combate e baixar as criações do visitante. Ao entrar numa conta, o site oferece uma vez levar as criações deste navegador (prévia e confirmação; nada é apagado nem sobrescrito).

**Roteiro extra de testes.** Duas contas e um visitante; login, fechar e reabrir navegador/PWA sem novo login; duas abas com sair em uma; modo avião com a sessão aberta (continua conectado); link de confirmação aberto no mesmo navegador (PKCE); recuperação de senha; visitante usando a iniciativa e depois entrando (dados preservados).

