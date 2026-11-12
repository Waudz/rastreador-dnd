# Publicação — proteção dos campos do mestre

Estado: preparada e testada somente em banco descartável. **Produção continua sem esta correção até autorização e aplicação.** Push/deploy bloqueados.

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
