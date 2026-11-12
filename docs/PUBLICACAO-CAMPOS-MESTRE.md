# Publicação — proteção dos campos do mestre

Estado: migração autorizada e aplicada em produção em 12/11/2026; validação SQL de permissões aprovada. Publicação ainda não realizada.

## Mudança proposta

- Migração: `supabase/migrations/20261112171652_proteger_campos_mestre.sql`.
- SHA-256 para revisão: `48f6559b2ac33be1405853b987eef15b4be333b6241daba8f57ce089c5935a1e`.
- Cria uma tabela privada de referências do catálogo (com RLS e sem privilégios para anon/authenticated), cinco funções privadas e um gatilho BEFORE INSERT/UPDATE em personagens. Não cria RPC pública, não muda as políticas RLS públicas nem reescreve personagens/campanhas.
- O mestre responsável é identificado por `campanhas.mestre_id = auth.uid()`, nunca por flags do JSON ou metadados editáveis. Um administrador não responsável não ganha autorização para editar estas definições por seu override global de leitura/gestão.
- Protege `ficha.magiasMestre` e as cópias/concessões em `ficha.magias`, mesmo disfarçadas com fonte de classe: conteúdo, modo, vínculo, usos máximos e recarga. Uso corrente é permitido dentro dos limites e precisa coincidir entre registro e cópia; preparação e campos derivados continuam editáveis pelo fluxo normal.
- Protege efeitos, consumo, máximo/recarga/custo de cargas, exigência de sintonia e raridade dos itens existentes. Consumo/descarte, quantidade, carga atual e sintonia continuam funcionando. Identificadores duplicados e tentativas de apagar propriedades sem remover o item são rejeitados.
- Itens novos com efeitos são aceitos do catálogo versionado no servidor, com definição exata. Alterar a referência ou alegar origem "mestre" não autoriza efeitos arbitrários. Itens personalizados novos/alterados precisam ser concedidos pelo mestre; itens comuns e pergaminhos continuam no fluxo atual.
- Catálogo servidor/cliente é comparado por teste para impedir divergências em próximas atualizações.

## Evidência local

390 testes JavaScript passaram, incluindo seis casos privados parciais das fotos. Sete suítes SQL passaram em PostgreSQL descartável: permissões gerais, campanhas/documentos/Storage, administradores, imagens, enquadramento, jogo e campos do mestre. Testados ataques diretos, INSERT, cópias retaggeadas, falsificação de catálogo, remoção de definições, UIDs duplicados, limites/tipos de contadores, jogador, mestre responsável, mestre externo e administrador não responsável. Fixtures positivas são geradas pelos motores reais: edição, preparação estrutural de grimório, uso de magia, cargas, sintonia, poção e descanso. Testes incorporados ao CI; ainda não executados no GitHub, pois não houve push.

As três migrações atuais do CI foram aplicadas e reaplicadas no banco descartável. Preflight somente leitura e recuperação/reaplicação também foram verificados. Não houve acesso a dados ou Auth do Supabase real.

## Ordem para liberar a publicação (aguarda autorização)

1. Confirmar o projeto de produção `rastreador-dnd` e a referência configurada no aplicativo; conferir as migrações existentes. Entre os dez commits locais anteriores a esta preparação, não apareceu outra migração de banco pendente em relação a origin/main. Isso não comprova o estado aplicado no serviço real.
2. Com autorização para leitura, executar `supabase/preflight/campos-mestre.sql`. O script retorna somente IDs, formatos e contagens, sem despejar fichas/fotos. O mestre precisa revisar a origem de concessões/efeitos legados: a correção não autentica retroativamente o que foi gravado antes dela. Resolver formatos malformados/contadores inválidos antes da ativação. Nada será corrigido, descartado ou preenchido automaticamente.
3. Confirmar backup recuperável do banco e exportação privada dos personagens afetados. Não existe confirmação de backup real nesta etapa. Conferir novamente o SHA-256 e aplicar a migração transacional autorizada.
4. Rodar advisors e validar com contas reais de teste (mestre/jogador/não responsável) em campanha descartável, com autorização específica. Confirmar esquema privado fora da Data API e as configurações de Auth já previstas em `docs/SEGURANCA-SUPABASE.md`; nenhum valor de produção foi presumido como verificado.
5. Só depois solicitar autorização para publicar os commits acumulados. Cache preparado: `rastreador-v102`; manifest mantém name, id, scope, URLs, cores e ícones, com short_name = Compêndio. Validar atualização/instalação da PWA no Android e sessões reais após a publicação autorizada.

## Recuperação e limites

Uma falha antes do COMMIT não deixa migração parcial. Se houver incompatibilidade após a ativação, manter publicação/gravações suspensas e preferir revisão dos dados pelo mestre. O script `supabase/rollback/campos-mestre.sql` só remove o gatilho; preserva funções, catálogo e todos os personagens. Exige aprovação e configuração explícita `compendio.autorizar_rollback_campos_mestre = sim`: **reabre a vulnerabilidade**, portanto não é uma ação automática. A reaplicação restaura a proteção e foi testada.

A proteção não transforma todo o jogo em regras autoritativas no servidor: atributos, construção e estado normal continuam editáveis conforme o produto existente. Não implementa concessões extras futuras, sentidos por alvo, recursos de todas as subclasses nem regras ausentes. Dados legados inconsistentes podem ter salvamentos recusados até revisão; registros existentes não são apagados. As validações locais não substituem Auth, configuração, backup e Android reais.

Referências: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [gatilhos PostgreSQL](https://supabase.com/docs/guides/database/postgres/triggers).

## Preflight real — 12/11/2026

- Base local: commit `754371a`, cache v102; sem alterações de código. Projeto confirmado: `rastreador-dnd` / `pdjzahpxjrlbqqtzkfdr`, ACTIVE_HEALTHY, PostgreSQL 17.11. SHA-256 da migração confere com o plano.
- Leitura de produção: 3 campanhas, 7 vínculos, 5 personagens. Nenhum formato inválido, contador inválido, concessão de mestre legada ou item com efeitos a revisar. Coluna e RPC de enquadramento já existem, apesar de não constarem no histórico remoto de migrações.
- Backup lógico privado em `<diretorio-privado>\publicacao-20261112\backup-publicacao.json`, SHA-256 `9f6b78e67367a1cbcfa82b3b24268fc34d50287b396f36f931fc66b339324e6b`. Inclui 9 perfis, 3 campanhas, 7 vínculos, 5 personagens e 2 registros visuais. Restauração em PGlite aprovada, conteúdo e integridade referencial conferidos; migração de segurança aplicada somente nessa cópia. Verificação em `verificacao.json`, no mesmo diretório. Não inclui Auth nem arquivos Storage; não foi possível confirmar backups automáticos pelo conector. Esses serviços não são alterados pela migração proposta.
- Advisors: alertas de execução de SECURITY DEFINER incluem gatilhos/event trigger e RPCs autenticadas existentes; não demonstram nova falha. Proteção contra senhas vazadas está desativada no Auth (configuração não alterada; referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Nenhuma escrita em produção, push ou deploy. Aguardar autorização explícita para aplicar **somente** `20261112171652_proteger_campos_mestre.sql`; depois validar permissões reais e fluxos essenciais antes de publicar. Não repetidos os 390 testes completos: não houve mudança de implementação. Permanecem pendentes testes Android de instalação/nome, atualização do cache, navegação mobile e uso offline após publicação.

## Aplicação autorizada e validação — 12/11/2026

Aplicado exclusivamente o conteúdo aprovado de `20261112171652_proteger_campos_mestre.sql` no projeto `pdjzahpxjrlbqqtzkfdr`, via conector Supabase (histórico remoto: `20261112180759_proteger_campos_mestre`; o serviço atribuiu o horário de aplicação, mantendo o conteúdo aprovado). Gatilho ativo, catálogo com 10 referências e RLS; authenticated sem gravação no catálogo nem execução da função de gatilho.

Suíte direcionada executada no banco real sob SET ROLE authenticated e auth.uid das contas temporárias existentes, com campanhas/personagens sintéticos dentro de transação integralmente revertida: jogador bloqueado ao forjar/remover concessões, definições de itens, recargas, limites e cópias; mestre responsável autorizado; mestre externo sem acesso. Fluxos gerados pelos motores reais aprovados: derivação/edição, preparação, uso de magia, cargas/sintonia, poção, descanso, catálogo, criação comum e descarte. Nenhum usuário criado ou alterado; teste de administrador permaneceu na evidência local, sem elevar conta real.

Comparação recursiva pós-teste com backup confirmou conteúdo integral idêntico dos 9 perfis, 3 campanhas, 7 vínculos, 5 personagens e 2 registros visuais. Nenhuma campanha sintética permaneceu. Sete testes de fase5-integracao passaram; não houve mudança de implementação que justificasse repetir os 390. Não foi realizado login/browser end-to-end com contas reais: esta validação cobre RLS/gatilhos no servidor, não emissão de JWT ou navegação. Não houve push/deploy; tecnicamente pronto para solicitar publicação, com smoke test das sessões e Android após publicar.
