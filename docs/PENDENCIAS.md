# Pendências e estado da atualização

Atualizado em 11/11/2026. Revisão atual baseada na `main`, commit `161ea27`. O usuário autorizou o envio ao GitHub ao final. Relatório: [revisão dos fluxos](REVISAO-FLUXOS-2026-11-11.md).

## Implementado nesta revisão

- Campanha ativa por usuário restaurada na Iniciativa após validação de pertencimento; seleção, criação e entrada pelo mesmo botão Campanhas. Preferência inválida é removida. Respostas atrasadas não podem preencher o contexto de outra campanha.
- Início do combate considera as fichas marcadas, prepara/rola os participantes, ordena e persiste o turno. Mantido o bloqueio para iniciativas pendentes e os combates separados por campanha.
- Convite centralizado em Grupo. Menu de três pontos restrito à aparência. Menus temporários com controlador compartilhado.
- Aparência com Voltar, confirmação de descarte, campos de upload alinhados e nome do arquivo. Mantidos os controles de permissão e versionamento existentes.
- Leitor de personagem compartilhado entre Campanha, Biblioteca e Iniciativa; magia usa o mesmo renderizador da consulta. Voltar preserva a ficha e a aba. Controles de preparar/remover magia continuam na lista.
- Leituras de monstros/magias encerradas ao mudar de seção, sem restaurar HTML antigo. Filtros e rolagem da seção têm estado próprio.
- Cartões compactos, retratos maiores, PV integrado e feedback temporário. Cabeçalho B em largura total preservado; capa com recuo desktop de 28 px.
- Cache `rastreador-v87`. **274 testes JavaScript aprovados**; navegador local com backend sintético, seis larguras de 320 a 1920 px, sem rolagem horizontal. Não houve escrita no Supabase de produção.

## Migração de enquadramento — aguarda autorização

- **12/11/2026:** o SQL citado abaixo não estava no repositório nem nas pastas locais. Foi reescrito em `supabase/migrations/20261112090000_enquadramento_campanhas.sql` (aditivo, com reversão comentada) e testado em PostgreSQL descartável (PGlite) com `tests/enquadramento-campanhas.test.sql`, junto das regressões de imagens, permissões e administração. **Continua NÃO aplicado em produção.** É essa migração que falta para o ajuste de enquadramento do fundo funcionar.

- A coluna JSONB e a RPC versionada para gravar x/y/zoom desktop/mobile **não foram aplicadas**. Autorizar o envio visual ao GitHub não autoriza a migração.
- SQL definitivo e rollback foram preparados fora do repositório e validados na rodada anterior com 45/45 casos em PostgreSQL 17.5 e 45/45 em PostgreSQL 18.6 locais. Produção 17.11 foi somente consultada naquela revisão.
- Sem o novo contrato no servidor, o app continua permitindo a troca normal das imagens com as posições legadas e desabilita o enquadramento avançado. Não declarar sua sincronização entre dispositivos como concluída.
- A capa circular continua usando o arquivo já recortado pelo editor; esse arquivo é o recurso compartilhado. Não existe um enquadramento geométrico circular separado nessa proposta.
- Após eventual autorização: aplicar o SQL revisado, testar com JWT/Storage reais, mestre responsável, jogador, conflito de versão, duas contas/dispositivos e rollback. Nenhuma imagem de produção foi excluída ou alterada nesta revisão.

## Validações ainda necessárias

- Renovação do convite até a conclusão pelo navegador: a automação chegou à confirmação e ficou bloqueada nesse diálogo. A cópia do código foi conferida; a renovação não foi certificada pela UI.
- Upload real de arquivo, corte, nome do arquivo selecionado, cancelamento dos editores e salvamento em Storage real. Abertura/Voltar e gravação versionada com backend sintético foram conferidas; confirmação de descarte tem teste automatizado.
- Android/iOS físicos, teclado virtual, instalação e atualização da PWA, uso realmente desconectado e reabertura instalada. A emulação de largura não comprova esses cenários.
- Dois usuários reais: mestre vincula personagem existente, jogador vê seus personagens, NPCs e inimigos respeitam as políticas. Testes locais de permissão não substituem RLS/JWT reais.
- Concorrência de ficha, combate e outro dispositivo. Há testes de serialização e conciliação de PV, mas isso não certifica toda a concorrência de produção.
- Fotos do catálogo 2014 sincronizadas entre duas contas; confirmar que personalizados continuam privados e que importados antigos estão classificados corretamente. Duas fichas antigas não tinham foto na origem e exigem atribuição manual.

## Trabalho funcional pendente de pedidos anteriores

- **Iniciativa ao vivo para jogadores**, somente leitura, sem PV atuais de inimigos/NPCs aliados e sem ações de mestre. O combate ainda é local ao navegador. Exige um contrato compartilhado que filtre dados privados no servidor antes de entregá-los ao jogador; esconder PV por CSS não resolve.
- Sincronizar a preferência da campanha ativa entre dispositivos. A restauração atual é por usuário no mesmo navegador, validada pelos membros retornados pelo servidor.
- Completar subclasses e escolhas do Livro do Jogador 2014: há 20 subclasses, não todas as 40. Faltam outros domínios/tradições/juramentos, Arquifada/Corruptor, Mestre das Feras e Caminho dos Quatro Elementos.
- Completar automação de talentos, recursos e efeitos condicionais por nível. Resumos não equivalem à execução automática. Magia Selvagem e substituições históricas de magias de Cavaleiro Místico/Trapaceiro Arcano exigem trabalho adicional.
- Expandir defesas obtidas por itens, magias e efeitos temporários. Só é possível calcular efeitos registrados explicitamente.
- Continuar centralizando cálculos específicos de CA, PV e recursos nas fontes compartilhadas. A unificação desta revisão não elimina toda duplicação do aplicativo.
- Rever explicitamente a diferença entre administrador e mestre. O controle visual de aparência exige o responsável; as políticas existentes não foram ampliadas nesta revisão.
- Pinça para zoom é opcional e não foi implementada; existem os controles de zoom e arraste já disponíveis.
- O erro do login do Codex por QR code no Android pertence ao Codex e não foi resolvido por esta atualização do site.

## Evolução e edição de personagens (12/11/2026, base `603be7f`)

**Implementado e testado**
- **Subir de nível** guiado, nível por nível: escolhe-se quantos níveis (1 a 20 - nível atual); cada nível passa pelas telas Classe, Pontos de vida, Novidades da classe, Raça, Atributos e talentos e Magias, **só as que têm novidade**, e termina num resumo do nível. Ao concluir um nível, o que foi escolhido fica bloqueado. Revisão final lista cada nível e os PV recebidos. Nada é gravado antes de "Confirmar novo nível"; sair da página não altera a ficha.
- **PV:** valor fixo (2014) ou rolagem informada, com dado de vida, Constituição e mínimo de 1 PV por nível; Anão da Colina soma +1.
- **Multiclasse:** escolha da classe a cada nível, com pré-requisitos de atributos de 2014; limite do nível total 20.
- **Raça:** novidades por nível para Fada, Elfo (Drow), Tiefling (magias nos níveis 3 e 5) e Draconato (dano do sopro nos níveis 6, 11 e 16); Anão da Colina (+1 PV por nível).
- **Editar Personagem** abre o criador completo em modo de edição (`?modo=editar`): dados carregados, todas as etapas liberadas, revisão com "Alterações que serão aplicadas", PV e inventário preservados, confirmação quando os PV mudam.
- Motor (testes em `tests/progressao-niveis.test.cjs`): as 12 classes do catálogo de 1 a 20, um nível por vez, sem características duplicadas, com as melhorias de atributo certas (Guerreiro 7, Ladino 6, demais 5), PV mínimo, teto 20 e multiclasse.

**Limitações conhecidas (não implementado)**
- Substituição de magia ao subir de nível (regras 2014 de Bardo, Feiticeiro, Bruxo, Patrulheiro e Mago) ainda não aparece como escolha do nível.
- Editar personagem não permite revisar PV nível a nível; ele preserva os PV ou recalcula por valor fixo (ou pelos valores gravados em níveis anteriores) e pede confirmação.
- Personagens importados sem escolhas gravadas (perícias, magias, estilo de luta) mostram essas escolhas como pendentes no modo Editar e na revisão; é preciso resolvê-las para salvar.
- Rolar o dado dentro do aplicativo para os PV não foi implementado (só valor fixo ou rolagem informada).
- Subclasses: 20 das 40 do Livro do Jogador 2014; as demais seguem pendentes (ver acima). Raças fora das listadas acima aparecem sem novidades por nível.
- Espaços de magia de multiclasse e magias preparadas/conhecidas por classe usam o motor existente; não houve revisão completa de todas as combinações.
- Não verificado em Android real nem com personagens reais.

## Para retomar

1. Conferir `main`, SHA publicado, Actions/Pages e modificações locais antes de editar; preservar o trabalho existente.
2. Reproduzir o problema na conta, rota e versão exatas. Distinguir uma aba antiga da versão publicada.
3. Usar `REGRAS`, `FICHA_COMPONENTES`, `MAGIAS_UI`, `LEITOR_FICHAS`, `CAMPANHAS_UI` e `MENUS` em vez de criar cópias de regras ou controladores.
4. Manter as seis abas, as rolagens, os filtros sobre dados autorizados, a navegação mobile e o espaço reservado aos painéis no desktop.
5. Não executar SQL nem modificar políticas de produção com a autorização de publicação visual. Atualizar este arquivo somente com evidência de implementação e teste.
