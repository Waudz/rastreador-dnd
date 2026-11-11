# Validação da migração 02

Aplicar 01-schema.sql primeiro e depois 02-acervos-e-transferencia.sql no SQL Editor do Supabase.

Antes da publicação:
- Entrar com duas contas de teste. Cada uma só deve ler e alterar seu próprio registro em acervos.
- Importar um backup na conta A e confirmar que B não consegue consultar esse registro.
- Sincronizar duas criações diferentes em dois aparelhos de A. Ambas devem permanecer.
- Excluir uma criação e sincronizar um aparelho com cópia mais antiga: a exclusão deve prevalecer.
- Como jogador, tentar trocar dono_id de um personagem: o gatilho deve preservar o dono original.
- Como mestre, transferir um personagem a outro membro da campanha: ele passa a aparecer para esse jogador.
- Como mestre, tentar atribuir a alguém fora da campanha: deve falhar.

A migração é transacional e pode ser reaplicada. Não apaga personagens nem os JSONs do GitHub.
A política de acervos e a função de mesclagem precisam ser validadas no projeto Supabase; os testes locais não substituem essa verificação.
