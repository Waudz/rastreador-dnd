# Modelo de dados do personagem (v2)

Decisão de 12/11/2026: ainda não existe personagem completo no Compêndio, então não há compatibilidade com fichas antigas. Os registros atuais são de teste e podem ser recriados pelo criador. **Nada foi apagado no Supabase.** Qualquer exclusão ou migração exige autorização do William, com a lista exata do que será afetado.

## Um único motor de regras
`js/criador-regras.js` (`window.CRIADOR`) serve criação, subir de nível e editar. A interface (`js/criador.js`) só coleta decisões e mostra resultados.

## Decisões do jogador (fonte) e valores derivados
Fonte, em `ficha.criacao` (e campos de construção em `ficha`):
- `criacao.niveis`: lista **cronológica** `[{c: 'Fighter', pv: {modo: 'maximo'|'fixo'|'rolagem', valor?}}]`. É daqui que saem a ordem dos níveis (multiclasse) e os PV de cada nível.
- `criacao.selecoes`: escolhas por grupo (perícias, estilo de luta, magias conhecidas, equipamento...).
- `ficha.melhorias` e `criacao.talentos`: melhoria de atributo ou talento por nível de classe.
- `ficha.classes`, `raca`, `backgroundId`, `criacao.base` (pontos de atributo).

Derivado (recalculado por `derivar`, nunca editado à mão):
- `ficha.progressao[i] = {total, classe, nivelClasse, pv: {modo, dado, valor, ganho}, automaticas: [ids], escolhas: {grupo: [ids]}, melhoria}`: histórico por nível, com as características automáticas, as escolhas feitas naquele nível e os PV recebidos.
- Atributos finais, perícias, proficiências, idiomas, `caracteristicas`, `magias` automáticas.

## PV: um só cálculo
`pvTotal(f)` soma o ganho de cada nível da progressão: o 1º nível do personagem usa o dado no máximo; os demais, valor fixo ou rolagem informada; modificador de Constituição; +1 por nível do Anão da Colina; mínimo 1 por nível. Criação, evolução e edição usam as mesmas funções (`ganhoPV`, `pvTotal`).
- **Criar:** `pv_max = pvTotal`, `pv_atual = pv_max`.
- **Subir de nível:** acrescenta um item em `criacao.niveis`; `pv_max` e `pv_atual` ganham o valor do nível.
- **Editar:** `pv_max = pv_max salvo + (pvTotal novo - pvTotal antigo)`; `pv_atual` é preservado (limitado ao novo máximo); mudança exige confirmação.

## Salvamento
`CRIADOR.salvamento(q, {modo, original})` é o único ponto que monta o que vai para o banco (equipamento inicial só na criação, PV, marcações). Cancelar nunca grava nada.

## Jogo (fora da construção)
PV atuais e temporários, espaços usados, dados de vida, inventário, moedas, notas e `modTemp` (modificadores temporários de atributo, que **nunca** alteram o atributo permanente: `REGRAS.atributoEf`).

## Persistência das decisões
A `progressao` é só resultado. As decisões moram em `criacao.niveis`, `criacao.selecoes` (perícias, características, magias, equipamento), `criacao.talentos`, `ficha.melhorias`, `ficha.classes[].sub` (subclasse), `criacao.base` e escolhas raciais. Testado: salvar, reabrir e recalcular preserva exatamente essas decisões; apagar a `progressao` e recalcular dá o mesmo resultado; ao reduzir o nível, as seleções gravadas não são apagadas em silêncio.

## PV (2014)
- **Subir de nível:** PV máximos e atuais aumentam pelo ganho do nível.
- **Editar:** PV atuais são preservados (só mudam se passarem do novo máximo); um nível adicionado na edição aumenta o máximo mas não cura. A revisão mostra máximos e atuais antes e depois, com confirmação.

## Salvamento seguro
Toda alteração de um personagem é **uma única linha** (`personagens`) gravada por **um único PATCH** com controle de versão (`versao=eq.N`): ou grava tudo ou nada. Se a rede falha ou a ficha mudou em outro aparelho, o assistente avisa, mantém o rascunho local e não altera a ficha. Operações que envolvam mais de uma linha ou tabela (por exemplo compra em loja: moedas do personagem + estoque da coleção + histórico) **devem ser uma função SQL (RPC) transacional**, nunca duas gravações separadas do navegador. Isso exigirá migração e só será feito com autorização do William.

## Inventário e itens (fase 3, `js/inventario.js` e `js/itens-efeitos.js`)
Item: `{uid, ref, nome, qtd, peso, preco, tipo, equipado, origem:{tipo,id?,nota?}, propriedades:{...}, magiaVinculada:{en,n,l}|null, desc}`; `tipo` = equipamento, consumivel, magico, pergaminho, outro. `uid` identifica a instância (itens antigos recebem um uid estável derivado de personagem, posição e nome; passa a valer na próxima gravação). A coluna `inventario` continua sendo `jsonb` (sem migração).
- Contêiner `{dono:{tipo,id}, itens, movimentos}`: o personagem usa `P.inventario` e `ficha.movimentos`. As operações (`adicionar`, `retirar`, `consumir`, `transferir`) são as mesmas que servirão a NPCs, monstros, lojas, baús e saques; transferir parte de uma pilha cria nova instância e registra entrada e saída nos dois lados. Sem interface de lojas ou central de itens.
- Histórico: toda entrada, saída, uso, descarte, carga, cópia de pergaminho e transferência vira um registro `{tipo, uid, nome, qtd, nota, origem?, alvo?, resultado?, consumido?, quando}`.
- Pergaminho: item real ligado à magia (`magiaVinculada`); copiar para o grimório consome uma unidade (sucesso ou falha) e fica no histórico; usar o pergaminho é outra ação (consome, a magia é conjurada à mesa).
- Efeitos: `propriedades.efeitos = [{tipo, ...}]` com os tipos cura, pv-temp, modificador, atributo, condicao, resistencia e manual (ver o cabeçalho de `js/itens-efeitos.js` para campos, o que é passivo e o que não é suportado). Outros campos: `consumo` (unidade, carga, nenhum), `cargas`, `custoCarga`, `sintonia`, `raridade`. Para um novo tipo basta acrescentar uma entrada em `TIPOS_EFEITO`.
- Uso: `ITENS_EFEITOS.usar(P, uid, escolhas)` valida tudo antes, calcula numa cópia e só no fim grava (inventário, PV e efeitos juntos); falha não consome nada. A ficha grava com uma única requisição.
- Efeitos ativos em `ficha.efeitosAtivos` (duração: manual, até descanso curto ou longo). `REGRAS.bonusTemp` e `REGRAS.atributoEf` somam os efeitos ativos; efeitos passivos de item são recalculados do inventário (equipado e, se exigir, sintonizado).

## Magias (fase 2, `js/magias-jogo.js`)
Cada magia em `ficha.magias[]` guarda `fonte` (classe, raca, mestre), `classeConj` (classe que conjura; multiclasse), `noGrimorio`, `prep`, `semprePreparada`, `ativa` (false = círculo ainda não alcançado; guardada, não preparável) e `registroOrigem` (`classe`, `nivel`, `copia-pergaminho`, `copia-grimorio`, `mestre`...).
- Decisões que sobrevivem ao recálculo: `criacao.grimorioExtra` (cópias), `criacao.historicoMagias` (cópias com custo, horas, CD e resultado; concessões), `ficha.magiasMestre`, `criacao.niveis[i].troca = {de, para}` (também exposta em `progressao[i].troca`) e `prep` anterior.
- Cópia para o grimório: 50 PO e 2 h por círculo; Evocation Savant (Escola de Evocação) paga metade para magia de evocação. Pergaminho: teste de Inteligência (Arcanismo) CD 10 + círculo; o pergaminho é destruído em qualquer resultado. Uma só gravação (ficha, inventário e dinheiro).
- Troca ao subir de nível: só Bardo, Feiticeiro, Bruxo e Patrulheiro; uma por nível; a nova magia precisa estar na lista da classe e em círculo com espaços; não troca magia racial, de talento ou de subclasse, nem no 1º nível da classe.
- Concessão do mestre (`concessao.modo`): conhecida (sem preparar nem contar no limite), grimorio (entra no grimório do Mago), sempre (sempre preparada), uso-limitado (`usos:{max,usados,recarga}`, recupera no descanso conforme a recarga) e outra (`forma` em texto).
- Bônus temporários por categoria em `ficha.bonusTemp` (`testes`, `ataques`, `salvaguardas`, `ca`, `cdMagia`); só `ficha.modTemp` (atributo) altera a capacidade de preparar.

## Ainda a fazer neste modelo
Recursos de classe com usos e descansos, condições, concentração e efeitos de duração (fase 4). Ver `docs/PENDENCIAS.md`.
