# Imagens de campanhas — proposta de integração para aprovação

## Estado desta etapa — 11/11/2026

Foram revisados o código local e o Supabase remoto `rastreador-dnd` (`pdjzahpxjrlbqqtzkfdr`) com consultas de metadados somente de leitura. A migração e os testes SQL estão preparados localmente, **sem execução**. Nenhuma alteração no banco/Storage, upload, push ou deploy foi feito nesta etapa. A interface continua na prévia temporária até a implementação após aprovação.

## Estrutura confirmada no projeto remoto

- `campanhas`: id, nome, codigo, mestre_id, criado_em. RLS ativa; código não é leitura pública do cliente.
- `membros`: campanha_id, usuario_id, papel, entrou_em. RLS ativa.
- Bucket privado `documentos`: 10 MB, com políticas ligadas aos documentos da campanha.
- Não existem `campanha_visual` nem bucket `campanhas-visuais`.
- `eh_membro()` verifica participação. **`eh_mestre()` também concede acesso a administradores globais**, conforme `03-administracao-conta.sql`; não será usada como autorização de edição das imagens.
- `nuvem.js` tem envio, assinatura de URL e exclusão no bucket documentos; o SDK oficial já é carregado pelo aplicativo. Não serão adicionadas dependências.
- O service worker não intercepta requisições de outro domínio, incluindo o Supabase.

## Migração preparada, ainda não aplicada

Arquivo: `supabase/migrations/20261111194808_imagens_campanhas.sql`, criado pela CLI oficial (`migration new`, operação local).

1. Tabela `public.campanha_visual`: uma linha por campanha, dois caminhos opcionais e independentes (`simbolo_path`, `backdrop_path`), posições verticais de computador/celular, versão e data. FK com exclusão em cascata; posições entre 0–100; caminhos restritos ao UUID da campanha e ao tipo de imagem. Nenhuma imagem/base64 no banco.
2. Bucket **privado** `campanhas-visuais`: até 2 MB por arquivo preparado, somente PNG/JPEG/WebP. O bucket documentos e suas políticas não mudam.
3. Função privada de responsabilidade: exige simultaneamente `campanhas.mestre_id = auth.uid()` e registro de membro com papel mestre. Não aceita papel vindo da URL, localStorage ou claims editáveis; administradores não responsáveis não recebem exceção para imagens.
4. RLS: participantes leem a aparência; escrita direta na tabela não é concedida. Gravação somente pela RPC autenticada `salvar_visual_campanha`, que revalida o responsável no servidor, confere versão, enquadramento, caminho, existência e metadados do arquivo no bucket correto.
5. Storage: somente o responsável envia e exclui; participantes leem somente arquivos publicados na aparência. O responsável pode ler seus uploads ainda não publicados para prévia/limpeza. Sem policy UPDATE: substituição usa arquivo novo com UUID novo, sem sobrescrever o anterior.
6. Arquivos ainda referenciados não são apagáveis diretamente. A remoção limpa primeiro a referência; depois limpa o arquivo pelo Storage. A RPC e a política de limpeza usam bloqueio da campanha para coordenar publicação e exclusão.
7. Helpers privilegiados ficam em `private`, com `search_path` vazio, checagem de identidade e grants restritos. O wrapper público é invoker. Não expor `private` na Data API nem usar chave secreta no navegador.

Campanhas antigas sem linha visual continuam com símbolo padrão e fundo atual; não há preenchimento obrigatório ou alteração dos dados existentes. A migração não muda funções de permissão antigas, campanhas, personagens, convites ou combates. Pode ser reaplicada, mas não deve ser aplicada automaticamente.

## Fluxo da integração após aprovação

1. Substituir a prévia temporária por edição com Salvar/Cancelar, exibida somente ao responsável real; jogadores apenas visualizam.
2. Manter símbolo circular (68/52 px), fundo com fade e enquadramentos independentes para desktop/celular. Sem imagem, não reservar altura vazia.
3. Decodificar e otimizar no navegador: PNG/JPEG/WebP de entrada até 8 MB e 40 megapixels, símbolo até 256 px e backdrop até 1600 px. Validar novamente o arquivo preparado até 2 MB; SVG e arquivos que não decodificam serão recusados. Bucket valida tamanho e MIME; RPC confere metadados e extensão. Isso não equivale a um antivírus ou inspeção binária no SQL.
4. Usar caminhos `<campanha_id>/simbolo/<uuid>.png` e `<campanha_id>/backdrop/<uuid>.jpg` (WebP também permitido). Enviar pelo cliente autenticado existente, sem upsert.
5. Salvar a referência com a versão carregada. Conflito entre abas mostra aviso para atualizar, sem substituir silenciosamente. Falha de envio/publicação preserva a imagem anterior e tenta limpar apenas os novos uploads órfãos. Nenhum falso “Salvo”.
6. Remoção de símbolo não remove o fundo, e vice-versa. Após confirmação no banco, excluir o arquivo antigo pelo Storage API, nunca apagando linhas de `storage.objects` diretamente.
7. Carregar aparência e URLs assinadas na página e na lista de campanhas; URLs com duração de cinco minutos e renovação enquanto abertas. Uma URL já emitida pode continuar válida até expirar; revogação impede novas assinaturas.
8. Atualizar participantes em consulta periódica, reutilizando o padrão do aplicativo sem reconstruir cards ou perder seleção. Cache apenas em memória, separado por conta; limpar ao sair ou trocar de conta. Falha de rede não deve desfazer a aparência já carregada nem alegar sincronização.
9. Atualizar `nuvem.js` com opção de bucket compatível com os usos atuais de documentos, `campanha-visual.js`, `campanha.js`, `campanhas-ui.js`, a lista em `conta.js` e os testes. Preservar o tratamento de fade/enquadramento no CSS. Nenhum envio de senha/token pela conversa.

## Validação prevista

Rascunho preparado: `tests/imagens-campanhas-permissoes.test.sql` (não executado).

| Identidade | Ler imagens publicadas | Enviar/substituir/remover |
| --- | --- | --- |
| Responsável da campanha A | Sim | Somente A |
| Jogador participante de A | Sim | Não |
| Mestre de B sem participação em A | Não em A | Somente B |
| Administrador global não responsável/não participante | Não em A | Não em A |
| Visitante | Não | Não |

Primeiro executar em PostgreSQL/Supabase descartável: fixture + 01/02/03 + nova migração duas vezes + testes. A fixture atual de CI precisa receber uma coluna `metadata jsonb` em `storage.objects` para reproduzir o schema real, além de testar conflitos e concorrência entre publicação/limpeza em duas conexões. Não executar o script de identidades sintéticas no projeto real.

Depois da aprovação, verificar com sessões reais de teste de mestre/jogador pelo Storage API e RPC: upload válido, formato/tamanho recusados, caminhos cruzados, manipulação direta via chamadas, exclusão, revogação de participação, conflito, falha de rede, símbolo/fundo independentes e persistência em dois dispositivos. Identidades serão usadas por login normal ou ambiente de teste autorizado, sem pedir senhas ou criar usuários/campanhas reais silenciosamente.

Executar também suíte JavaScript, checagem de segurança do Supabase e revisão visual/PWA em 320/375/390/430 px e desktop. As contas reais e permissões da nova implementação **ainda não foram testadas**, pois ela não foi ativada.

## Aprovação solicitada e sequência

Aprovar este desenho permite avançar à implementação local completa e à validação em ambiente de teste. A aplicação no projeto remoto será feita somente após os testes e dentro da autorização concedida; respeitar que o AGENTS.md atual prevê William executar o SQL. Não haverá push/deploy sem autorização específica.

Não foi alterado o código de produção nesta etapa. Migração e testes são propostas revisáveis; ainda precisam de execução e validação antes de uso. Se houver problema após ativação, desativar os controles no cliente e preservar tabela/bucket/arquivos para correção; não usar rollback destrutivo automático.

Referência: [Buckets privados e acesso](https://supabase.com/docs/guides/storage/buckets/fundamentals), [políticas de Storage](https://supabase.com/docs/guides/storage/security/access-control).
