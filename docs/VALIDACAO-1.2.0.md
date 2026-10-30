# Validação local — Grello 1.2.0

Versão em avaliação local, sem publicação de tag ou Release. A versão funcional anterior foi preservada no commit `ba157ce`, antes das alterações. A tag pública v1.1.1 permanece intacta. Não foram acessados quadros, banco ou backups reais do usuário.

## Implementação

Cada quadro tem Tarefas e Quadro visual. O editor oferece imagens locais, notas, textos, formas, desenho, conectores, seleção, camadas, duplicação, exclusão, desfazer/refazer e controles de zoom visíveis inclusive em janelas menores. Referências apontam para cartões do mesmo quadro e abrem o painel de detalhes existente, sem criar outra tarefa.

O banco foi atualizado pelo acréscimo da migração 4, mantendo as migrações publicadas. Cenas ficam em tabela separada; a movimentação do ponteiro não regrava o conjunto de tarefas. Imagens são normalizadas localmente para PNG em armazenamento gerenciado, sem depender do arquivo original. A saída da aba e o fechamento aguardam as inserções e capturam o estado final, inclusive operações imediatamente anteriores.

O pacote completo `.grello` reúne documento 3, manifesto 1 e recursos. JSONs antigos 1/2 continuam aceitos, com cenas vazias. Backups novos são pastas `.grello-backup`, com banco consistente, imagens e manifesto. Há backup anterior a migrações/substituições; recursos de imagens não são removidos automaticamente.

## Biblioteca e licenças

Foi adotado Excalidraw 0.18.1, MIT, com React 19 aceito nos peerDependencies do pacote. Foram consultadas a [documentação oficial](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation), a API de persistência/imagens/customData e a [licença oficial](https://github.com/excalidraw/excalidraw/blob/v0.18.1/LICENSE). O tldraw também foi avaliado; sua [licença de produção depende de chave](https://tldraw.dev/community/license). A solução entregue não exige chave nem serviço externo.

As fontes são locais, com metadados e avisos SIL OFL 1.1/MIT preservados em LICENSES. O fallback de CDN foi redirecionado no build para os arquivos locais. fflate 0.8.3 e image-size 2.0.4 são MIT. A licença MIT existente do Grello foi mantida. A auditoria npm do lockfile final retornou zero vulnerabilidades; isso não substitui revisão de segurança do código.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `npm.cmd test` | 23 testes passaram: persistência/ordem, edição, legado, migrações, backup recuperável, referências, recursos, pacotes e falhas. |
| `npm.cmd run build` | Build de produção com TypeScript estrito concluído. |
| `npm.cmd run format:check` | Formatação verificada. |
| `npm.cmd run test:visual`, com `GRELLO_PACKAGED=1` | Oito grupos de verificações passaram no aplicativo empacotado, offline e com dados fictícios. |
| `npm.cmd run test:e2e` | 11 cenários do Kanban passaram no executável empacotado. |
| `npm.cmd run test:appearance`, com `GRELLO_PACKAGED=1` | Sete grupos passaram: estilos, modos, contraste/foco, tamanhos, movimento e conteúdo após reinício. |
| `npm.cmd run test:petals`, com `GRELLO_PACKAGED=1` | 90 segundos por modo, ultrapassando três ciclos das cinco pétalas; opção, redução de movimentos, minimização e ocultação verificadas. |
| `npm.cmd run package` | Instalador NSIS e portátil Windows x64 gerados localmente. |
| `node tests/portable-smoke.mjs` | Portátil abriu offline, criou quadro e nota visual e preservou ambos ao reiniciar. |
| `npm.cmd run audit:publication` | Verificação local de padrões de credenciais, caminhos privados, bancos e histórico passou; não houve publicação. |

No fluxo visual foram conferidos:

- Nota, referência pesquisável a cartão e persistência ao alternar abas.
- Conector ligado a elementos, acompanhando sua movimentação.
- Zoom ampliado e viewport preservado ao abrir/editar/fechar os detalhes do cartão.
- Seleção de PNG, arraste de JPEG e colagem de WebP; conversão local, proporção padrão e desfazer/refazer da exclusão de imagem.
- Exclusão do arquivo original e reabertura do quadro com a cópia gerenciada.
- Desenho seguido de fechamento imediato e reabertura sem perda do traço.
- Atualização, arquivamento e exclusão do cartão original, com referência atualizada ou indisponível.
- Exportação/importação real do pacote, remapeamento de imagens/elementos/conexões/cartões e preservação das preferências do destino em Mesclar.
- Importação do JSON 1.1.1/formato 2 com quadro visual vazio e sem perda das tarefas existentes.
- Recusa de pacote inválido sem alteração dos dados.
- Original e Céu e Cerejeiras em claro/escuro, janela menor e ausência de solicitações remotas/erros de página no teste visual.

Os testes de dados também recuperaram um backup completo em outro banco temporário, conferiram os bytes das imagens, recusaram caminhos/arquivos inesperados e detectaram imagem corrompida. O limite de exportação foi exercitado sem carregar os recursos excessivos na memória. Falha de backup foi simulada para verificar a interrupção da substituição.

A animação usa transform/opacity no CSS, cinco pétalas orgânicas locais e durações de 17–25 segundos com atrasos negativos. Apenas eventos de preferência/visibilidade ajustam a pausa; não há temporizadores JavaScript contínuos nem estado de partículas no banco. O relógio de animação fica fixo quando a janela está oculta/minimizada.

## Capturas inspecionadas

As capturas abaixo contêm somente dados fictícios. Foram inspecionadas para ajustar contraste, composição e sobreposição de dicas. Não representam quadros pessoais do usuário.

- [Quadro visual, Céu e Cerejeiras claro](screenshots/quadro-visual-claro.png)
- [Quadro visual, Céu e Cerejeiras escuro](screenshots/quadro-visual-escuro.png)
- [Quadro visual, Original claro](screenshots/quadro-visual-original-claro.png)
- [Quadro visual, Original escuro](screenshots/quadro-visual-original-escuro.png)
- [Janela menor](screenshots/quadro-visual-menor.png)

## Exemplos e transporte

- `docs/importacao/grello-exemplo.json`: fixture 1.1.1/v2 original, preservada integralmente.
- `docs/importacao/grello-exemplo-visual.json`: exemplo v3 sem imagens externas, com referência a cartão.
- `docs/importacao/grello-exemplo-visual.grello`: pacote completo com imagens fictícias.
- `docs/importacao/FORMATO-IMPORTACAO.md`: formatos, limites, IDs, referências, merge, imagens e backups.

Os dois novos exemplos vieram do exportador do aplicativo em perfil isolado; o JSON foi extraído de um pacote sem imagens. Os testes usam os mesmos validadores/operações do importador.

## Limites da validação e avaliação manual pendente

A automação simula os caminhos escolhidos nos diálogos nativos, o conteúdo da área de transferência somente no processo de teste e o DataTransfer do arraste de arquivo. Os arquivos PNG/JPEG/WebP, a normalização, o editor, o banco e os pacotes são reais. A área de transferência pessoal não foi lida ou modificada.

O assistente de instalação e os atalhos no computador de destino ainda exigem conferência manual. Não foi feita instalação sobre a instalação pessoal do usuário. Os executáveis não têm assinatura digital comercial. A nova versão ainda aguarda avaliação manual de Guilherme Alves.

Não foram exercitados encerramento forçado/queda de energia, todos os leitores de tela/escalas de DPI, nem trabalho prolongado nos volumes máximos. O histórico de desfazer/refazer é da sessão do editor; trocar de aba/quadro ou reiniciar remonta o editor e inicia outro histórico, preservando os dados salvos. Não há coleta automática de imagens não utilizadas.

O novo banco não deve ser aberto na versão 1.1.1. Para voltar à versão anterior, restaure o backup anterior à migração, seguindo o README. Cópias de segurança e dados reais permaneceram preservados durante o desenvolvimento.