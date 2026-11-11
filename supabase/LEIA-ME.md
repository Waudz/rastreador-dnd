# Configurar o Supabase (login e banco de dados)

Passo a passo para criar o projeto gratuito que guarda contas, campanhas, personagens e documentos. Leva uns 15 minutos. Este arquivo não contém nenhum segredo.

## 1. Criar o projeto

1. Entre em <https://supabase.com> e crie uma conta (pode ser com o GitHub). Não pede cartão.
2. **New project**. Nome: `rastreador-dnd`. Região: **South America (São Paulo)**.
3. Crie uma **senha do banco** forte e guarde no seu gerenciador de senhas. O site não usa essa senha; ela só serve para você acessar o banco diretamente, se precisar.
4. Aguarde o projeto ficar pronto (1 a 2 minutos).

## 2. Criar as tabelas e as regras de acesso

1. No menu lateral, **SQL Editor** → **New query**.
2. Abra o arquivo `01-schema.sql` desta pasta, copie tudo, cole no editor e clique em **Run**.
3. Deve aparecer "Success. No rows returned". Se aparecer algum erro, copie a mensagem e me mande.

## 3. Endereços do site no login

Em **Authentication → URL Configuration**:

- **Site URL**: o endereço do seu site no GitHub Pages (por exemplo `https://SEUUSUARIO.github.io/rastreador-dnd/`).
- **Redirect URLs**: acrescente o mesmo endereço seguido de `**` e também `http://localhost:8000/**` (para testes no computador).

## 4. Como os jogadores vão entrar (cadastro público)

O cadastro público exige **e-mail confirmado** e **senha forte**. O aplicativo já trata os dois casos (tela "Confirme seu e-mail", "Esqueci minha senha", troca de senha com a senha atual), mas **quem decide é o servidor**: as configurações abaixo precisam estar ligadas no painel. A lista completa, com a ordem e a forma de conferir, está em [`docs/SEGURANCA-SUPABASE.md`](../docs/SEGURANCA-SUPABASE.md).

Resumo do que precisa estar assim em **Authentication**:

| Onde | Configuração |
|---|---|
| Sign In / Providers → Email | **Confirm email: ligado** (antes este guia mandava desligar; não desligue) |
| Sign In / Providers → Email | Tamanho mínimo da senha: **10**; exigir **letras e dígitos** ("Letters and digits") |
| Sign In / Providers → Email | **Secure password change** e **Require current password**: ligados |
| Emails → SMTP Settings | **SMTP próprio ligado** (Brevo ou Gmail), senão o limite é de 2 e-mails por hora no projeto inteiro |
| URL Configuration | Site URL do GitHub Pages; Redirect URLs só o site e `http://localhost:8000/**` |

O link "Entrar por link no e-mail" também usa o e-mail próprio (SMTP) configurado acima.

## 5. Me passar os dados do projeto

Em **Project Settings → API** copie:

- **Project URL** (algo como `https://abcdefgh.supabase.co`);
- **anon public key** (uma chave longa que começa com `eyJ`).

Esses dois valores são públicos por desenho: ficam no código do site, e a proteção está nas regras do passo 2. **Nunca envie** a `service_role key` nem a senha do banco, para ninguém.

## 6. Evitar que o projeto pause

Projetos gratuitos podem ser pausados depois de um período sem uso. O repositório terá uma rotina semanal do GitHub Actions que faz uma consulta simples ao banco para manter o projeto ativo. Se mesmo assim ele pausar, é só clicar em **Restore** no painel.

## O que cada tabela guarda

| Tabela | Conteúdo | Quem acessa |
|---|---|---|
| `perfis` | nome de exibição | o próprio usuário e quem participa das mesmas campanhas |
| `campanhas` | nome, mestre, código de convite | membros veem; o código só o mestre |
| `membros` | quem participa de cada campanha e o papel | membros da campanha |
| `personagens` | ficha, vida, CA, inventário, dinheiro | o dono e o mestre da campanha |
| `documentos` | resumos de sessão, notas e arquivos | membros leem o que for visível; só o mestre cria e edita |

Qualquer pessoa logada pode criar campanhas (e ser mestre delas) e participar de várias, com um código de convite. Os arquivos (PDF, imagens, texto, até 10 MB cada) ficam num bucket privado do Supabase Storage.
