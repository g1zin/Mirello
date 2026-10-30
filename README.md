# Mirello

Organização pessoal em um aplicativo desktop para Windows x64, com tarefas Kanban e um quadro visual para conectar referências e ideias. Funciona localmente e offline: sem conta, assinatura, colaboração, sincronização ou IA integrada.

**Mirello 1.2.1 — aprovado para publicação.** Grello agora se chama Mirello, com monograma M e contornos sutis no hover escuro. Esta versão reúne o Quadro visual, imagens locais, referências aos cartões, pacotes completos e pétalas na lateral. A pasta de dados e os formatos de importação continuam compatíveis.

Baixe o aplicativo na [Release Mirello 1.2.1](https://github.com/g1zin/grello/releases/tag/v1.2.1). O repositório mantém o endereço original `g1zin/grello`; a versão anterior [Grello 1.1.1](https://github.com/g1zin/grello/releases/tag/v1.1.1) permanece disponível.

## Recursos

- Quadros, colunas e cartões com ordem persistente, arraste e opção de mover pelo menu.
- Descrições, etiquetas por quadro, prazos, conclusão e checklists.
- Pesquisa, filtros, arquivamento e restauração; confirmação de exclusões permanentes.
- Abas **Tarefas** e **Quadro visual** no mesmo projeto.
- Imagens por seleção de arquivo, arraste e colagem; notas coloridas, textos, formas, desenho, linhas e setas com vínculos.
- Zoom, navegação, seleção múltipla, camadas, duplicação, exclusão e desfazer/refazer no editor.
- Referências aos cartões originais, com título, coluna, conclusão, arquivamento e ação para abrir seus detalhes.
- Estilos **Original** e **Céu e Cerejeiras**, modos claro/escuro/Sistema, intensidade e animações opcionais. Pétalas usam CSS e respeitam redução de movimentos e visibilidade da janela.
- Salvamento automático, pacotes completos com imagens e backups recuperáveis antes de migrações e substituições.

A interface principal mantém sua tipografia e os temas existentes. O editor usa [Excalidraw 0.18.1](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation), sob licença MIT, sem chave ou serviço obrigatório. Todos os recursos necessários, inclusive fontes, são empacotados localmente. Embeds, recursos remotos e colaboração não estão habilitados.

Capturas desta revisão: [marca e hover escuro](docs/screenshots/mirello-escuro-hover-cartao.png), [Original escuro](docs/screenshots/mirello-original-hover-controle.png) e [janela menor clara](docs/screenshots/mirello-claro-menor.png).

## Instalar e abrir

Na [Release oficial](https://github.com/g1zin/grello/releases/tag/v1.2.1), abra a seção **Assets** e baixe uma das opções abaixo. Para builds locais, os mesmos arquivos ficam na pasta `release`:

- `Mirello-Instalador-1.2.1.exe`: assistente de instalação, com opção de pasta e atalhos. Depois, abra pelo atalho criado.
- `Mirello-Portatil-1.2.1.exe`: abra diretamente, sem instalar. Pode demorar alguns segundos para extrair o runtime temporário.
- `SHA256SUMS-1.2.1.txt`: hashes dos executáveis desta entrega.

Os executáveis não têm assinatura digital comercial. O assistente, os atalhos e eventuais avisos do Windows precisam de conferência manual no computador de destino. Não há atualização automática.

**Portátil descreve a execução do programa, não a localização dos dados.** As duas versões usam a mesma pasta de dados do Windows; mover o executável não leva os seus quadros junto. Para transportar dados e imagens, use um pacote completo.

A versão 1.1.1 continua na sua [Release original](https://github.com/g1zin/grello/releases/tag/v1.1.1). Como o quadro visual usa um esquema de banco mais recente, leia as instruções de restauração antes de voltar a uma versão anterior.

## Usar tarefas e referências

Crie um quadro, adicione colunas e cartões na aba Tarefas. Clique no cartão para editar os detalhes. Arraste para reorganizar ou use Mover cartão. Fechar o painel aguarda o salvamento.

Na aba Quadro visual:

- **Imagem** abre a seleção de arquivos. Também é possível arrastar imagens do computador ou colá-las. PNG, JPEG e WebP são convertidos localmente para PNG gerenciado pelo Mirello.
- **Nota** cria uma nota com texto e cor. Duplo clique edita o texto; a seleção mostra controles de cor, tamanho e traço.
- A barra de ferramentas do editor oferece texto, retângulo, elipse, desenho, linha, seta, seleção e borracha. Conecte nas bordas dos elementos para manter as ligações ao mover. Duplo clique em uma conexão permite texto de rótulo.
- Espaço + arrastar ou a ferramenta Mão navega; os controles na barra do Mirello ajustam o zoom. **Shift+1** ou Enquadrar todo o conteúdo mostra o conjunto.
- **Ctrl+Z** desfaz, **Ctrl+Shift+Z** refaz, **Ctrl+D** duplica; Delete remove elementos selecionados. O menu de contexto permite ordenar camadas. Esses atalhos do editor não atuam sobre campos de digitação.
- **Vincular cartão** pesquisa tarefas do mesmo quadro, inclusive arquivadas. Selecione a referência e use **Abrir cartão**, ou sua ação de vínculo, para abrir o painel existente.

Excluir uma referência visual não exclui a tarefa. Mover a referência não muda a coluna. Arquivar o cartão mantém a indicação de arquivado. Sua exclusão permanente deixa a referência como **Cartão indisponível**. Ao fechar os detalhes, a posição e o zoom continuam iguais.

Os fundos decorativos pertencem à interface e não são elementos do moodboard. O histórico de desfazer/refazer é da sessão do editor; reiniciar ou remontar o editor ao trocar de aba/quadro inicia um novo histórico, preservando o conteúdo salvo.

## Dados e salvamento

Dados permanentes:

```text
%APPDATA%\Grello\
  grello.sqlite
  assets\                  imagens locais imutáveis
  backups\                 cópias completas e backups antigos
```

A pasta fica separada do código-fonte e da instalação. Atualizar não apaga os quadros. **Abrir pasta de dados** e **Abrir pasta de backups**, nas configurações, permitem localizá-las.

Tarefas são salvas em transações. O quadro visual usa uma tabela própria, com uma gravação do documento após cerca de 800 ms de pausa; mover o ponteiro não regrava o Kanban. Trocar de aba/quadro e fechar normalmente aguardam operações pendentes, inclusive imagens e texto em edição. Falhas de gravação mantêm o editor aberto, com mensagem e opção de tentar novamente.

Encerramento forçado, queda de energia ou matar o processo pode perder alterações ainda não enviadas ao banco. Imagens apagadas do quadro visual continuam no armazenamento para não quebrar desfazer/refazer e backups. Não há coleta automática desses arquivos nesta versão.

## Exportar, importar e fazer backup

Em Configurações:

- **Exportar pacote completo** salva `.grello`, um ZIP com manifesto versionado, tarefas, cenas visuais e imagens locais. Use esse arquivo para transportar todos os dados.
- **Importar dados → Mesclar** acrescenta cópias com novos identificadores, remapeando cartões, elementos, conectores, grupos e imagens. Mantém as preferências visuais atuais. Importar novamente cria novas cópias.
- **Importar dados → Substituir** troca tarefas, preferências e quadros visuais, com confirmação e backup completo anterior. Se o backup falhar, a substituição é abortada.
- **Criar backup agora** cria uma pasta `.grello-backup` com uma cópia SQLite consistente, imagens e manifesto de integridade.

O importador aceita os JSONs antigos das versões **1 e 2**, incluindo o exemplo de 1.1.1 usado no planejamento do Catower Defense. Eles trazem tarefas e preferências, com quadros visuais vazios. Ao mesclar, os quadros visuais já existentes no destino permanecem intactos; ao substituir por JSON antigo, as cenas são substituídas por vazias.

Também aceita JSON versão **3 sem imagens externas**. Um JSON que declare recursos precisa do pacote completo; não é apresentado como backup completo. O exportador cotidiano passa a produzir `.grello`.

Limites principais: JSON 25 MiB; pacote 100 MiB comprimido e 250 MiB descompactado; até 500 recursos, 10.000 elementos por cena e 250.000 pontos de desenho por cena. Imagens de entrada: até 10 MiB, 8.192 pixels por lado e 24 milhões de pixels; o PNG normalizado pode ter até 20 MiB. Manifestos, nomes, tamanhos, hashes, formatos e referências são validados antes de gravar. Caminhos arbitrários, arquivos extras e conteúdo ativo são recusados.

Veja os formatos e exemplos em [FORMATO-IMPORTACAO.md](docs/importacao/FORMATO-IMPORTACAO.md). Mantenha uma cópia importante em outro disco; não há backup em nuvem.

### Restaurar

Para um pacote `.grello`, use **Importar dados → Substituir com backup**.

Para uma pasta `.grello-backup`:

1. Feche completamente o Mirello. Use uma versão compatível com o esquema do backup.
2. Copie a pasta de dados atual inteira para outro local seguro.
3. Confira que o backup tem `manifest.json`, `grello.sqlite` e `assets`. Não use uma pasta terminada em `.incomplete`.
4. Guarde o banco atual, WAL/SHM e a pasta assets juntos na cópia de segurança, fora da pasta ativa.
5. Copie `grello.sqlite` e a pasta `assets` do backup para a pasta de dados ativa. Não misture os arquivos WAL/SHM antigos com o banco restaurado.
6. Reabra o Mirello e confira tarefas e imagens. Preserve o backup original.

O manifesto registra SHA-256 e tamanho dos arquivos; por exemplo, `Get-FileHash -Algorithm SHA256 caminho-do-arquivo` permite conferir um arquivo antes da cópia. Os testes de dados recuperam um backup completo em uma pasta temporária e comparam banco, cenas e bytes das imagens.

Backups antigos `.sqlite`, feitos antes do quadro visual, contêm somente o banco. Para esses, feche o aplicativo, preserve a pasta atual e copie o arquivo como `grello.sqlite`, sem WAL/SHM antigos. Ao abrir na versão nova, haverá uma migração com backup anterior e cenas vazias. **Um banco já migrado não deve ser aberto no Grello 1.1.1.** Para voltar à versão anterior, restaure seu backup anterior à migração.

## Código-fonte e build

Ambiente: Windows x64, Node.js 24 e dependências locais fixadas no lockfile. Use `npm.cmd` para evitar o bloqueio de npm.ps1 sem alterar a política do PowerShell.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd test
npm.cmd run build
npm.cmd run package:dir
npm.cmd run test:e2e
$env:GRELLO_PACKAGED='1'
npm.cmd run test:visual
npm.cmd run test:appearance
npm.cmd run test:petals
npm.cmd run package
node tests/portable-smoke.mjs
```

`package:dir` gera `release/win-unpacked`; `package` gera instalador NSIS e portátil. `test:visual` e `test:petals` usam o build de desenvolvimento quando `GRELLO_PACKAGED` não é `1`. O teste das pétalas observa 90 segundos por modo. `format:check` confere a formatação; `licenses` coleta avisos e roda antes do empacotamento. Os testes usam dados fictícios em pastas isoladas. Diálogos nativos e conteúdo de colagem são simulados apenas no processo de teste; não usam os quadros ou a área de transferência pessoal.

A primeira instalação de ferramentas exige internet; o aplicativo pronto não depende dela. O build redireciona o fallback de fontes do Excalidraw para os arquivos locais. Há bloqueio de requisições remotas, navegação e novas janelas; o renderer continua sem Node, com sandbox, contextIsolation e ponte IPC restrita.

## Estrutura e verificações

`src/renderer/visual` integra o editor; `src/shared/visual.ts` valida cenas e recursos; `src/data` cuida de SQLite, imagens, pacotes e migrações; `src/domain/visualMerge.ts` remapeia vínculos; `src/main` contém integrações restritas com o sistema. Temas e tokens permanecem em `src/renderer/styles`.

Leia [AGENTS.md](AGENTS.md) antes de alterar dados. O banco usa esquema **4**, sem modificar as migrações já publicadas. O esquema JSON antigo continua testado com [grello-exemplo.json](docs/importacao/grello-exemplo.json), que permanece intacto.

Os resultados e capturas desta versão ficam em [VALIDACAO-1.2.1.md](docs/VALIDACAO-1.2.1.md). Guilherme Alves informou que o teste local passou e aprovou a publicação em 30/10/2026. Não há validação completa de leitores de tela, outras escalas de DPI, instalações corporativas, encerramento forçado ou uso nos limites máximos de dados. O assistente de instalação e seus atalhos devem ser conferidos manualmente.

## Autoria e licenças

Guilherme Alves conduz o projeto, as escolhas visuais e os testes manuais de aprovação da versão 1.1.1. A implementação e parte da validação automatizada têm assistência de IA/Codex. As paisagens e flores geradas para o projeto estão identificadas com sua procedência. Guilherme aprovou a versão 1.2.1 após seu teste local em 30/10/2026.

A licença MIT já existente foi preservada. Excalidraw é MIT; as fontes locais do editor mantêm seus avisos SIL OFL 1.1 ou MIT. Não redistribuímos Segoe UI. Consulte [LICENSE](LICENSE), [CREDITS.md](CREDITS.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) e [LICENSES](LICENSES).