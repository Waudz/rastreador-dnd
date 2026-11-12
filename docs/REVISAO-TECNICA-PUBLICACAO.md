# Revisão técnica para publicação — 12/11/2026

Revisão direcionada de persistência, permissões e manutenção, sem refatoração geral. Leia também o README, `MODELO-PERSONAGEM.md` e `PUBLICACAO-CAMPOS-MESTRE.md`. O projeto é estático, com scripts clássicos e APIs globais; não depende de um processo de build.

## Correção de baixo risco realizada

`js/nuvem.js`: o adaptador HTTP convertia JSON inválido em `null`, inclusive em respostas 2xx. Agora rejeita explicitamente respostas malformadas. Interrupção durante a leitura do corpo é identificada como falha de rede. Preservados o status de erros HTTP, respostas vazias legítimas (204), a sessão e a política de não repetir gravações incertas. Três testes novos em `tests/auth.test.cjs` cobrem esses cenários. Cache preparado: v103.

O teste de segredos em `tests/rls-estatico.test.cjs` passou a incluir documentação e testes, antes excluídos. A chave Supabase publicável continua pública; credenciais administrativas não foram adicionadas.

## Fronteiras verificadas

- Salvamento da ficha usa versão carregada, serialização de envios e preservação das alterações pendentes em erro/conflito. Testes em `personagem-save.test.cjs`.
- Atualização de foto lê a versão atual e tem repetição limitada em conflito; atribuição de dono confirma a resposta do servidor. Testes em `personagens-dados.test.cjs`.
- Imagens de campanha usam arquivos imutáveis e RPC versionada; falha incerta não apaga arquivos anteriores. A assinatura e o cache são separados por usuário. Testes em `campanha-imagens.test.cjs`.
- A proteção dos campos do mestre foi aplicada no servidor, com RLS e gatilho privado. Testes SQL reais de mestre/jogador/mestre externo passaram em transação revertida; comparação com backup confirmou todos os registros existentes intactos. Isso não equivale a teste de login/JWT no navegador nem a autoridade integral das regras de jogo.
- Não encontrada dependência de execução do repositório privado nem código de depuração para remover com segurança. O log do servidor local informa seu endereço e foi mantido. Documentação de migração e comentários técnicos continuam úteis.

## Melhorias estruturais para uma etapa própria

| Ponto concreto | Consequência e próximo passo |
| --- | --- |
| `js/personagem.js` concentra renderização, eventos, estado e salvamento; o manipulador de ações próximo ao final atende várias áreas da ficha | Separar controladores de magias/inventário/jogo e um controlador de persistência, preservando os contratos e testes atuais. A extração deve ser incremental; não repetir os motores já compartilhados. |
| Funções densas em `js/criador-regras.js` e renderização por strings | Dificultam revisão e rastreamento de alterações de regras. Extrair operações com responsabilidade explícita e fixtures de entrada/saída; evitar reformatar todo o motor junto com mudanças funcionais. |
| Dependências globais e ordem manual dos scripts HTML | Ausência de contratos explícitos aumenta o risco de divergência entre ficha completa, painel e prévia. Manter testes de carregamento/esqueleto e planejar módulos/contratos sem introduzir framework por conveniência. |
| `nuvem.observar()` suprime erros da atualização periódica e mantém listener de visibilidade ao cancelar | Pode dificultar diagnóstico e retenção de closures em futuros ciclos de montagem. Definir canal de erro recuperável e ciclo de vida antes de expandir essa API; não confundir atualização de fundo com salvamento confirmado. |
| Caminhos de gravação em criador/ficha/campanha têm contratos próprios de confirmação e conflito | Consolidar apenas após mapear as diferenças. Um helper genérico apressado pode perder versão, permissões ou estado pendente. |
| Catálogo com resumos de suplementos e cobertura mecânica parcial | Manter descrição, licença e automação como conceitos distintos; ampliar regras somente com casos de aceitação e testes. |

Nenhum desses pontos justifica mascarar erros, desligar RLS ou mover validações de segurança para o cliente. Não houve mudança adicional no banco durante esta revisão.

## Privacidade e histórico

Foram examinados os 102 commits alcançáveis nas refs locais e 948 blobs de texto por assinaturas de segredos, JWT não anônimo, prompts/conversas e linguagem inadequada. Não foram encontrados esses conteúdos pelos padrões usados. Caminhos com identificação do computador existiam em versões antigas de AGENTS e dois documentos; foram generalizados nos arquivos atuais. Histórico e autoria Git não foram reescritos. A inspeção não é garantia universal sobre binários, conteúdo sem assinatura ou refs remotas não disponíveis localmente. O relatório de objetos e os backups ficam fora do repositório.

## Limites da validação antes de publicar

CI do GitHub só será observado depois do push. Login real no navegador e testes Android de instalação/nome, atualização, navegação e uso offline ainda exigem smoke test. A suíte pública não exige fotografias ou dados reais; os casos privados opcionais ficam fora do Git.

Resultado final: 393 testes JavaScript aprovados, zero falhas/pulados; 15 verificações independentes de regras aprovadas. Os casos privados opcionais foram lidos fora do repositório; a suíte pública funciona sem eles. Diff conferido. Nenhum push/deploy realizado.
