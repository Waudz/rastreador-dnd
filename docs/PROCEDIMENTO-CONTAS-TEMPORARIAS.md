# Validação real de imagens com contas temporárias

Estado: cenário de três contas e duas campanhas autorizado; **criação ainda não iniciada**. Nenhum usuário ou campanha temporária foi criado. Projeto-alvo: rastreador-dnd / pdjzahpxjrlbqqtzkfdr. A migração de imagens já foi aplicada; push/deploy permanecem bloqueados.

## Autorização antes da criação

O cenário foi aprovado por William. Antes da criação, apresentar os aliases escolhidos e orientar William a criá-los pelo painel; não criar contas silenciosamente. Os endereços precisam ser novos e controlados por William, podendo ser aliases exclusivos de uma caixa de teste; não reutilizar contas existentes nem enviar mensagens a endereços aleatórios. Não registrar senhas, tokens, links de confirmação ou chaves administrativas no manifesto, repositório ou conversa.

Criar um identificador único da execução, por exemplo `qa-imagens-AAAAMMDD-<sufixo-aleatorio>`. O prefixo é apenas rótulo humano: **a limpeza usa UUIDs exatos**.

| Conta nova | Papel | Participação |
| --- | --- | --- |
| QA Imagens — Mestre | Responsável pela campanha A | Mestre de A |
| QA Imagens — Jogador | Jogador | Jogador de A |
| QA Imagens — Externo | Usuário não responsável | Não participa de A; mestre apenas da campanha B |

Campanha A: `<execução> — Imagens A`, exclusiva para todos os testes de imagem. Campanha B: `<execução> — Controle B`, vazia, serve somente para demonstrar que o externo é mestre de outra campanha. A segunda campanha também precisa constar na autorização e no manifesto. Não criar personagens/documentos desnecessários. Não conceder administrador global a nenhuma conta temporária; esse cenário continua coberto pelo teste SQL isolado, sem ampliar acesso em produção.


## Aliases Gmail e criação pelo painel

William informou Gmail. Usar etiquetas com sinal de mais, sem criar três caixas: `seunome+qaimg-mestre-1111@gmail.com`, `seunome+qaimg-jogador-1111@gmail.com`, `seunome+qaimg-externo-1111@gmail.com`. São modelos: substituir seunome pela parte real do Gmail e preferir um sufixo único da execução. Não cadastrar os endereços literais destes exemplos. As mensagens chegam à caixa original; as contas de Auth devem ter três UUIDs distintos, verificados depois da criação.

1. Opcionalmente, William envia para si uma mensagem destinada a um dos aliases e confirma o recebimento na mesma caixa.
2. Abrir https://supabase.com/dashboard/project/pdjzahpxjrlbqqtzkfdr/auth/users e confirmar o projeto rastreador-dnd.
3. Clicar Add user → Create new user (rótulos podem variar conforme idioma).
4. Preencher o alias Mestre e uma senha temporária forte, digitada somente por William. Não enviar senha/token na conversa.
5. Se houver Auto Confirm User, marcar somente para essa conta temporária sob seu controle; isso não exige desativar confirmação global. A criação administrativa não deve ser tratada como envio automático de e-mail de confirmação.
6. Repetir para Jogador e Externo. Se um endereço já existir, parar e escolher um sufixo novo, sem alterar a conta encontrada.
7. Conferir três linhas e três UUIDs diferentes; deixar todas como usuários comuns. O papel mestre/jogador será dado pelo fluxo das campanhas, não por privilégios do projeto.
8. Avisar “contas criadas”; depois preparar o servidor local e os três perfis isolados para login. Não usar a interface pública antiga como prova de funcionamento do novo upload.

Fonte Gmail: https://support.google.com/mail/answer/22370?hl=pt-BR. Fonte Supabase: https://supabase.com/docs/guides/auth/users e https://supabase.com/docs/reference/javascript/auth-admin-createuser.

## Pré-checagem e registro

1. Confirmar novamente projeto/ref, bucket privado e versão da migração aplicada.
2. Capturar UUIDs e hashes das campanhas, membros, personagens e documentos existentes em registro privado, somente para comparar ao final. Registrar também os IDs de usuários existentes, sem exportar credenciais.
3. Manter um manifesto privado em `C:\Users\LocaGOra\Downloads\William-privado` com execução, data, UUIDs criados, UUIDs das duas campanhas, responsáveis e caminhos de TODOS os uploads, inclusive tentativas/orfãos. Nada desse manifesto vai para o GitHub.
4. Se um e-mail já existir, interromper; não redefinir senha nem adaptar uma conta real para os testes.

## Criação e login seguros

O conector Supabase disponível nesta sessão não possui operações de criação/exclusão de usuários do Auth. Usar **Authentication → Users** no painel do projeto, operado por William, ou um canal administrativo seguro previamente aprovado. Não inserir/excluir diretamente em `auth.users` por SQL e não solicitar service_role/secret na conversa. A alternativa é cadastro normal pelo aplicativo com confirmação nos aliases controlados; não desabilitar confirmação, CAPTCHA ou outras proteções globais para facilitar o teste.

William digita senhas temporárias e confirmações diretamente na interface. Confirmar o e-mail somente das contas temporárias, sem alterar regras globais de autenticação. Após cada criação, registrar o UUID retornado e verificar que é novo e não está na lista anterior. Não fornecer acesso administrativo global a essas contas.

Abrir três perfis isolados de navegador (ou navegadores diferentes), rotulados Mestre/Jogador/Externo. Abas comuns do mesmo perfil compartilham sessão e não são isolamento suficiente. Não usar o perfil da conta principal.

A interface nova continua local. Na etapa de execução, servir a pasta William em servidor HTTP vinculado somente a 127.0.0.1 e informar o endereço exato a William. Não expor o servidor à rede pública, não publicar no GitHub e não alegar que o site público já tem a integração. Antes de abrir outra máquina, combinar acesso local seguro ou usar um segundo perfil no mesmo computador; testes em perfis distintos não devem ser relatados como dois dispositivos físicos.

## Montagem do cenário

1. Na sessão Mestre, criar A pelo fluxo existente (`criar_campanha`); registrar UUID e conferir `mestre_id` e membro mestre.
2. Na sessão Jogador, entrar em A pelo convite verdadeiro (`entrar_na_campanha`). Não gravar o convite no relatório público.
3. Na sessão Externo, criar B pelo mesmo fluxo. Não entrar em A. Conferir que as contas e campanhas reais não aparecem como alvos de escrita no roteiro.
4. Registrar confirmação de que A/B são novos UUIDs da execução. Não testar em campanha encontrada apenas por nome.

## Matriz de testes e evidência

Usar imagens sintéticas pequenas sem dados pessoais. Registrar operação, identidade/UUID, campanha/UUID, status HTTP, versão da aparência e caminho retornado, sem cabeçalhos Authorization ou conteúdo de sessão.

| Verificação | Resultado esperado |
| --- | --- |
| Mestre envia apenas símbolo | Persistência, recorte circular, sem backdrop |
| Mestre envia apenas backdrop | Persistência e fade, sem exigir símbolo |
| Ambos presentes, recarregar e novo login | Ambos reaparecem; enquadramentos preservados |
| Jogador abre em sessão separada | Lê os mesmos caminhos/versão e imagens |
| Mestre substitui um arquivo | Novo UUID; outro arquivo independente permanece |
| Jogador tenta enviar/salvar/excluir por API normal | Bloqueado pelo servidor, sem usar chave administrativa |
| Externo tenta consultar/alterar A por API | Sem leitura de imagens privadas e alteração bloqueada, mesmo sendo mestre de B |
| Falha de upload | Referência e imagem antiga preservadas |
| Falha de RPC/resultado incerto | Nenhum arquivo anterior apagado; recarregar para conferir a versão |
| Versão antiga em duas abas do mestre | Conflito; nenhuma sobrescrita silenciosa |
| Arquivo acima de 2 MB, MIME recusado e caminho de outra campanha | Rejeição pelo serviço/RPC; nenhum efeito em campanhas reais |
| Remover símbolo, depois backdrop | Remoção independente, retorno ao padrão, sem espaço vazio |
| Aguardar atualização na sessão Jogador | Mudança refletida sem perder seleção ou edição local |

Não fabricar um JWT, editar a role no SQL ou usar uma chave administrativa para simular sucesso de um usuário. Esses testes são de HTTP autenticado real. Os testes SQL de roles já executados são uma evidência separada. Não alterar o arquivo protegido da campanha B para testar A; usar apenas requisições destinadas à campanha temporária A e aos seus próprios objetos.

Em qualquer erro de segurança/integridade, interromper os testes, guardar evidência mínima sem segredos e avisar William antes de novas alterações. Não tentar corrigir permissões em produção automaticamente. Não continuar criando recursos enquanto a limpeza de uma etapa falhou.

## Limpeza segura, após os testes

**Aguardar confirmação final de William antes de iniciar qualquer limpeza**, inclusive remoção de referências e arquivos. Apresentar os resultados e a lista exata de UUIDs/caminhos temporários, conferindo que todos pertencem à execução. A autorização para criar/testar não substitui essa confirmação de exclusão. Nunca usar LIKE por nome, domínio de e-mail, prefixo global do bucket ou exclusão em massa de usuários. Se houver qualquer relação com uma campanha/conta fora do manifesto, parar e pedir revisão.

1. Com o mestre temporário ainda autenticado, gravar A com `simbolo_path=null` e `backdrop_path=null` pela RPC, usando a versão atual. Conferir confirmação.
2. Pelo **Storage API**, listar apenas o diretório do UUID de A (e de B caso haja uploads registrados). Comparar com o manifesto, incluindo uploads de falhas. Remover somente os objetos autorizados/registrados. Se aparecer caminho desconhecido, conferir antes de excluir.
3. Conferir lista vazia nos diretórios temporários e ausência das referências. Se houver falha, **não apagar contas nem campanhas ainda**: o responsável precisa continuar disponível para concluir a limpeza.
4. Excluir A e B somente pelos UUIDs registrados, autenticado como o responsável correspondente, depois de verificar dono e participação exclusiva das três contas temporárias. A FK remove aparência/membros; verificar o resultado. Nunca apagar o bucket, a tabela visual, a migração ou funções globais.
5. Sair das sessões temporárias, revogar suas sessões/refresh tokens pelo fluxo suportado e fechar os perfis. A exclusão de um usuário não invalida imediatamente JWTs já emitidos; nunca dar às contas acesso a dados reais e considerar sua validade até expirar.
6. William exclui **somente os três UUIDs de Auth** no painel/canal administrativo seguro. Confirmar previamente que nenhum deles possui objetos de Storage restantes ou relações fora do manifesto. Não usar DELETE em auth.users como atalho. Verificar remoção dos perfis derivados e registros temporários vinculados, sem executar correções globais.
7. Repetir as consultas de contagem/hash sobre o conjunto de UUIDs preexistentes. Comparar integralmente com a pré-checagem, sem confundir novos usuários reais criados por terceiros durante os testes com resíduos do teste.
8. Registrar zero usuários temporários, zero campanhas A/B, zero membros/aparências temporários e zero objetos dos diretórios temporários. Se algum recurso não puder ser removido, registrar como pendência; não declarar limpeza completa.
9. Guardar somente relatório de resultados e UUIDs necessários à auditoria em local privado. Limpar material de sessão pelo fluxo de logout e os perfis temporários pelo usuário. Encerrar o servidor HTTP local. Push e deploy continuam bloqueados.

## Referências oficiais

- [Criação administrativa de usuário](https://supabase.com/docs/reference/javascript/auth-admin-createuser): exige ambiente administrativo confiável, nunca chave privilegiada no navegador do aplicativo.
- [Exclusão administrativa](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) e [gerenciamento de usuários](https://supabase.com/docs/guides/auth/managing-user-data): remover arquivos de Storage e considerar a validade dos JWTs antes de encerrar a limpeza.
