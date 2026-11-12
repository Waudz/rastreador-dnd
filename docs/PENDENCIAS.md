# Pendências e próxima tarefa

Atualizado em 12/11/2026. Decisões permanentes: `docs/DECISOES.md`. Histórico antigo: `docs/HISTORICO.md` (não ler por rotina).

## Estado atual
- Remoto `origin/main` em `32dd13d` (cache v91). Commits locais não publicados: `aca3f57`, `603be7f`, `5889cbc`, `8d670da`, `10829ee`, `daa9f1e`, `0618597` `4016af9` e o fechamento local da integração da fase 4 (cache `rastreador-v100`). **Nada publicado. Fase 4 conferida na prévia local do navegador; sem validação no Supabase real ou no Android.**
- Fase 1 (ficha como interface de jogo): concluída localmente. Fase 2 (magias): **base entregue, mas o sistema de magias NÃO está integralmente concluído** (ver pendências obrigatórias). Fase 3 (inventário): base entregue localmente.
- Fase 3 entregou: `js/inventario.js` (itens com `uid`, `ref`, origem, propriedades, `magiaVinculada`; contêiner `{dono, itens, movimentos}`; adicionar, retirar, consumir, transferir, sintonia máx. 3, cargas; histórico em `ficha.movimentos`, máx. 200); `js/itens-efeitos.js` (uso atômico de consumíveis e itens com efeitos: cura com rolagem no app ou resultado manual, PV temporários que não se acumulam, modificador, atributo, condição, resistência, manual, passivos de item equipado/sintonizado, cargas; efeitos ativos com duração e fim em descanso curto/longo; amostras SRD: 4 poções de cura, Heroísmo, Resistência, Invisibilidade, Antitoxina, Anel de Proteção, Varinha de Mísseis Mágicos); pergaminhos reais no inventário, copiados para o grimório consumindo o item; editor de efeitos do item para o mestre; concessão do mestre com forma escolhida (conhecida, grimório, sempre preparada, uso limitado com recarga, outra); troca de magia só entre magias da classe (sem raciais, talentos ou subclasses). Detalhes em `docs/MODELO-PERSONAGEM.md`.
- Testes: 369 passando, 0 falhando; a interface foi testada com DOM simulado, **não no navegador com Supabase real nem no Android**.

## Pendências obrigatórias do sistema de magias
Resolvidas (com testes em `tests/magias-classes.test.cjs`):
- **Paladino:** `dados/magias.json` agora traz Paladino nas 31 magias SRD da lista (1º a 5º círculo; sem truques). As magias de Paladino que não são SRD (marcas/smites, auras, Duelo Compelido, Manto do Cruzado etc.) não estão no catálogo e não devem ser copiadas para o repositório.
- **Arcanum Místico do Bruxo:** grupos de escolha de 6º, 7º, 8º e 9º círculo nos níveis 11, 13, 15 e 17 (`gruposMagias`, chave `magias|Warlock|arcanumN`); entradas na ficha com `arcanum`, `fonte:"classe"`, sempre ativas, fora dos espaços de Pacto e da troca por nível; registradas na progressão. Tela integrada: "Conjurar Arcanum", consumo independente, bloqueio de repetição e recarga no descanso longo.
- **Conjuração multiclasse:** revisada e testada contra a tabela do Livro do Jogador (níveis de conjurador, metade e um terço, classe única usa a própria tabela, Pacto separado, preparação e círculo máximo por classe). Nenhum erro encontrado no cálculo. Na ficha, os botões gastam espaços comuns e de Pacto separadamente, inclusive em multiclasse, com limites e recargas testados. O jogador escolhe o espaço manualmente, sem associação automática ao botão de concentração.
Resolvidas nesta integração: auditoria das oito listas padrão contra as páginas 105–114 do SRD 5.1 oficial; corrigidas associações indevidas de Clérigo, Druida e Bruxo (incluindo Comando), sem alterar as concessões de subclasses. Referência reproduzível em `tests/fixtures/listas-magias-srd2014.json`. Redução de nível preserva níveis, PV rolados, escolhas e progressão em `criacao.niveisInativos`; magias removidas ficam inativas e voltam apenas quando válidas. O editor mostra esse histórico. Restrições de escolas de Cavaleiro Místico/Trapaceiro Arcano e exceções dos níveis 3/8/14/20 validadas e explicadas junto das escolhas.

## Fase 4: integração local entregue
- Motores carregados na ficha completa, na ficha embutida, na prévia isolada, no service worker e no harness. Cache `rastreador-v100`.
- `js/jogo-ui.js` compartilha a interface: recursos de classe e correção de uso, condições com explicações, exaustão, concentração e fila de salvaguardas por fonte, morte/estabilização, Arcanum, Recuperação Arcana e diário. Estado salvo junto aos PV na gravação serializada existente; construção permanece no criador.
- Dano/cura, dados de vida, descansos e gasto de espaços passam pelos motores. Tipo de dano e crítico são opcionais. PV máximo efetivo e barra consideram exaustão; deslocamento considera condições. PV temporários não evitam teste de concentração nem falhas de morte a 0 PV. Referência: Sage Advice oficial de 2014 (`https://media.wizards.com/2016/downloads/DND/SA-Compendium.pdf`).
- Poções continuam atômicas; curar a partir de 0 PV remove a inconsciência automática. Condições conhecidas de itens passam por JOGO e encerram concentração quando necessário, na mesma gravação.
- Regressões específicas: poção a 0 PV, resistência + PV temporários + concentração, morte/crítico, descansos após exaustão, dados de vida, slots multiclasse/Pacto, Arcanum, redução/restauração de nível e preservação dos gastos ao evoluir. Erro real de atualização de classe sem repertório corrigido e coberto.
- Navegador real, prévia sem nuvem: recursos, Agarrado, exaustão, dano até 0 PV e d20 = 20 conferidos; larguras 320/375/430/1280 sem transbordamento horizontal. Capturas desktop/mobile entregues fora do repositório. Ainda falta validar sessões reais e PWA instalada no Android.
- Limites deliberados: vantagem/desvantagem por condição, vulnerabilidade/imunidade, Fúria impedindo concentração, Combatente Mágico, duração em rodadas e passagem real de tempo/comida/bebida são resolvidos à mesa. Recursos de subclasse/raça e concessões extras com efeitos dependentes de alvo ficam para a próxima etapa.

## Limites conhecidos da fase 3
- Efeitos em outro alvo só ficam registrados (a ficha do alvo não é alterada: exigiria permissão do servidor).
- Não suportados (use efeito manual): dado a cada rodada (Bênção), conjurar magia por item, dano a terceiros, área, recarga automática de cargas, expiração automática por tempo, conflito entre efeitos iguais.
- Preço, compra e venda, peso de pergaminho e catálogo completo de itens SRD não foram feitos.

## Funcionalidades futuras (registradas; NÃO implementar agora)
- Concessões extras do mestre (características, estilos, talentos e proficiências), independentes das escolhas normais de classe. Caso de aceitação: Lydia Farwind, Guerreira 4 / Mestre de Batalha, Duelista normal + Luta às Cegas adicional (Tasha, 2014), ambos preservados com seus efeitos e cegueira permanente. Resolver percepção às cegas de 3 m por alvo, distância, cobertura (inclusive total), ocultação e fontes de vantagem/desvantagem; nunca apagar a condição Cega. Depende de um contexto de alvo nas rolagens, composição de efeitos de características e permissões de concessão, hoje ausentes: etapa arquitetural seguinte, conforme ressalva do William; não implementada nesta fase nem alterada no Supabase.
- Privacidade dos grimórios (quem pode ver ou copiar o grimório de quem).
- Visibilidade de monstros por permissão (o que o jogador pode ver de cada criatura).
- Encontros preparados pelo mestre.
- Instâncias individuais de criaturas (PV, condições e inventário de cada criatura de um encontro).
- Saques próprios (cada criatura/baú com seu inventário e distribuição). A estrutura de contêiner de `js/inventario.js` já foi pensada para isso.

## Próxima tarefa
Fase 5: validar integração com sessões reais e Android, revisar limitações declaradas e planejar concessões extras/contexto de alvo do caso Lydia antes de implementar novos sistemas de campanha. Manter tudo local.

## Depois
- Fase 5: auditoria e testes de integração. Troca opcional de magia ao subir de nível ainda está disponível somente para Bardo, Feiticeiro, Bruxo e Patrulheiro; estender para Cavaleiro Místico/Trapaceiro Arcano exige identificar a escolha livre de escola no histórico. Não confundir essa limitação com as restrições de seleção já validadas.
- Não implementar lojas, baús, Enciclopédia nem Itens da campanha antes de o William pedir.

## Aguardando o William
- Autorização para publicar (push) os commits locais; nenhuma alteração no Supabase sem pedido.
- Validação real (Supabase e Android) com as 3 contas temporárias (roteiro em `William-privado`); limpeza das contas/campanha temporárias só com confirmação dele.
- Renomear o repositório para `compendio-5e`: plano em `docs/MIGRACAO-ENDERECO.md`, não executado.
