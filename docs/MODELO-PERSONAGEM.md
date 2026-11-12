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

## Ainda a fazer neste modelo
Magias (grimório, preparadas, origem, substituição), inventário com itens mágicos e pergaminhos, recursos com usos e descansos, condições e efeitos. Ver `docs/PENDENCIAS.md`.
