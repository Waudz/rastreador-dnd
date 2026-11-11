# Migração de imagens em produção — 11/11/2026

Aplicada com autorização explícita de William no projeto Supabase **rastreador-dnd**, ref **pdjzahpxjrlbqqtzkfdr**, região sa-east-1. Nenhum push ou deploy.

## Conferências antes da aplicação

- Projeto confirmado pela API de gerenciamento; saudável, PostgreSQL 17.
- Arquivo aprovado: supabase/migrations/20261111194808_imagens_campanhas.sql.
- SHA-256: B3A24F3734839B7377D30E1CF0ED0958112E3D1C645E308F40DF505F01AF9BB2. Igual à cópia aprovada, sem alterações inesperadas.
- Não existiam a tabela campanha_visual, o bucket campanhas-visuais ou as novas funções. A migração não contém escrita em campanhas, membros, personagens ou documentos.
- Cópia do SQL aprovado, registro pré-migração e procedimento de contenção preservados em William-privado. A aplicação é transacional. O procedimento de contenção revoga o novo acesso, preservando tabela/bucket/arquivos e políticas antigas; não foi executado. Não foi alegado backup automático da plataforma, pois sua disponibilidade não foi confirmada.
- Migração, reaplicação, testes SQL de imagens e regressões do banco passaram em PostgreSQL descartável. 250 testes JavaScript passaram.

## Alterações efetivamente aplicadas

- public.campanha_visual, com RLS e SELECT para authenticated limitado aos participantes.
- Bucket privado campanhas-visuais, 2 MB, PNG/JPEG/WebP.
- Helpers privados visual_responsavel, visual_caminho, visual_pode_apagar e salvar_visual_campanha.
- Wrapper público salvar_visual_campanha: authenticated pode chamar; anon não pode.
- Policies Storage campanha_visual_ler, campanha_visual_enviar e campanha_visual_apagar. Sem UPDATE para sobrescrever arquivos.
- Policy de leitura visual_ler. Nenhum grant de escrita direta na tabela ao cliente.
- Histórico remoto registrado pela ferramenta como **20261111201451 / imagens_campanhas**. Esse identificador remoto foi gerado pela ferramenta; o conteúdo aplicado é exatamente o arquivo local aprovado. Não executar db push para tentar reconciliar versões sem revisar o histórico.

## Integridade após aplicar

| Dados existentes | Antes | Depois | Conteúdo |
| --- | --- | --- | --- |
| Campanhas | 1 | 1 | Hash idêntico |
| Membros | 3 | 3 | Hash idêntico |
| Personagens | 3 | 3 | Hash idêntico |
| Documentos | 10 | 10 | Hash idêntico |

Os hashes foram calculados no banco sobre todas as colunas e linhas, em ordem estável; não foram exportados dados pessoais. Políticas antigas docs_ler/enviar/trocar/apagar também permaneceram idênticas. A nova tabela estava vazia após a aplicação.

## Testes reais já realizados

- GET anônimo na API da tabela: HTTP 401, código 42501; bloqueado.
- POST anônimo na RPC: HTTP 401, código 42501; bloqueado, sem usar campanha existente.
- Metadados remotos conferidos: RLS ativa, bucket privado, limites/MIME corretos, policies e grants aprovados.
- Nova execução das regressões após aplicação: 250 testes JavaScript e os testes SQL/regressões no banco descartável aprovados.
- Advisors antes/depois: nenhum aviso novo. Persistem avisos anteriores sobre funções SECURITY DEFINER públicas e proteção contra senhas vazadas desabilitada; não foram alterados nesta tarefa. Referências: [funções acessíveis ao anônimo](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [funções acessíveis ao autenticado](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Pendências de validação real

Não há sessões identificadas de três contas de teste. Nenhum usuário foi criado; nenhuma campanha de teste foi criada, e a campanha principal não foi usada para testes destrutivos.

Aguardar William identificar as contas ou efetuar os logins, sem enviar senhas/tokens. Usar exclusivamente campanha temporária para testar upload/substituição/remoção independentes, falha de upload/gravação, jogador lendo sem escrever, não responsável bloqueado e atualização em outra sessão/dispositivo. As negações desses papéis já passaram no banco descartável, mas não equivalem a testes HTTP com sessões reais.

A interface atualizada permanece apenas local; por isso o site público ainda não expõe a integração nova. Push/deploy seguem bloqueados.
