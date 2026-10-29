# Grello

Seu espaço pessoal de organização para Windows x64. Aplicativo desktop em português, offline, sem conta e sem servidor para abrir manualmente.

## Abrir e instalar

Na pasta `release`:

- **Grello-Instalador-1.1.1.exe**: instalação por usuário, com atalhos na área de trabalho e no menu Iniciar. Abra o instalador e siga as telas. Não é necessário instalar Node no computador para usar o aplicativo.
- **Grello-Portatil-1.1.1.exe**: abra diretamente. Mantém os dados na mesma pasta de usuário da versão instalada. “Portátil” se refere ao executável: os dados não ficam ao lado dele.
- **win-unpacked/Grello.exe**: versão em pasta usada na validação. Mantenha todos os arquivos dessa pasta juntos.

O executável não tem certificado comercial de assinatura. O Windows pode mostrar o aviso de editor desconhecido. Não foi feita instalação automática no perfil real do usuário: os testes usam pastas temporárias.

## Usar

1. Crie um quadro na barra lateral.
2. Adicione colunas e cartões.
3. Arraste o cartão para outra posição ou coluna. Também pode abrir os detalhes e usar **Mover cartão**, escolhendo a coluna e o início/fim.
4. Clique no cartão para editar título, descrição, etiquetas, prazo e checklist. **Concluir edição** aguarda o salvamento.
5. Crie/edite etiquetas pelo botão **Etiquetas** do quadro. Texto e cor são salvos automaticamente.
6. Use a busca por título/descrição e os filtros de etiqueta e prazo. “Próximos 7 dias” inclui hoje; concluídos têm sua própria situação.
7. Os três pontos de uma coluna permitem renomear, ordenar e excluir. Se houver cartões, escolha outra coluna do mesmo quadro: todos, inclusive arquivados, são transferidos para o fim dela. A última coluna com cartões não pode ser excluída.
8. As configurações do quadro permitem renomear, mudar cores, ordenar na barra lateral e arquivar.
9. **Itens arquivados** reúne quadros e cartões. Restaurar um quadro preserva quais cartões já estavam arquivados individualmente.

Exclusões permanentes pedem confirmação. Quadros são arquivados, sem exclusão permanente nesta versão.

O salvamento dos campos ocorre após uma pequena pausa de digitação. Fechar o painel ou a janela aguarda as gravações. Se um campo obrigatório estiver inválido, o aplicativo permanece aberto para correção. Fechamentos forçados pelo sistema ou pelo Gerenciador de Tarefas não podem garantir o salvamento do texto ainda não enviado.

Os exemplos são opcionais: **Configurações → Adicionar demonstração** cria um quadro separado e identificado, sem substituir seus quadros nem preencher o aplicativo automaticamente.

## Dados e backups

Dados reais no Windows:

```text
%APPDATA%\Grello\grello.sqlite
%APPDATA%\Grello\backups\
```

Use **Configurações → Abrir pasta de dados** ou **Abrir pasta de backups**. A pasta do banco fica separada do código e da instalação. Reinstalar/atualizar e desinstalar pelo instalador não apaga os quadros.

O banco usa SQLite com transações, WAL, identificadores UUID e migrações numeradas. Os arquivos `grello.sqlite-wal` e `grello.sqlite-shm`, quando presentes, fazem parte do banco em uso. Não apague nem copie apenas o banco principal enquanto o aplicativo estiver aberto. Use a exportação ou **Criar backup agora**.

Backups são cópias SQLite consistentes, criadas manualmente e automaticamente antes de substituir dados e antes de migrar um banco existente. Não são apagados automaticamente. Guarde cópias fora deste computador se quiser proteção contra perda do disco. Esta versão não criptografa dados ou backups.

### Exportar e importar

**Exportar dados** gera JSON legível, com `format: "grello"`, `version: 2`, data da exportação e todos os quadros, colunas, cartões, etiquetas, checklists e preferências.

A importação verifica formato, versão, tamanho máximo de 25 MB, campos, datas, IDs únicos e referências. Arquivos incompatíveis são recusados sem alterar o banco.

- **Mesclar** adiciona cópias com novos IDs e nomes terminados em “(importado)”. Preserva os dados e preferências atuais. Repetir a importação cria outras cópias; não há sincronização nem deduplicação.
- **Substituir** troca todos os dados e preferências pelos do arquivo, mediante confirmação. Cria um backup do banco atual antes da alteração. Se o backup falhar, a substituição não acontece.

Importações são transacionais: uma falha não deve deixar metade dos dados importados.

### Restaurar um backup SQLite

1. Feche o Grello e confirme que não há nenhuma janela aberta.
2. Abra `%APPDATA%\Grello` no Explorador.
3. Copie a pasta inteira para outro local antes de alterar qualquer arquivo.
4. Renomeie o banco atual `grello.sqlite` e os eventuais `grello.sqlite-wal` e `grello.sqlite-shm`, guardando-os juntos em uma pasta separada. Não misture arquivos WAL antigos com o backup.
5. Copie o backup desejado da subpasta `backups` para a pasta de dados e dê à cópia o nome `grello.sqlite`.
6. Abra o Grello. O backup original permanece em `backups`.

Para restaurar JSON, use **Importar dados → Substituir com backup**. Não tente abrir um backup de uma versão mais nova em uma versão antiga do aplicativo.

## Desenvolver e gerar versões

Verificado em Windows x64 (build 26200), Node 24.21.0, npm 11.19.0. As versões exatas estão em `package.json` e `package-lock.json`.

```powershell
npm.cmd ci
npm.cmd run dev
```

O desenvolvimento compila e abre uma janela Electron com arquivos locais. Não há servidor necessário em produção. Após editar o código, feche a janela e execute novamente. O primeiro download do Electron e as ferramentas de empacotamento precisam de internet; o uso do aplicativo não precisa.

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:vertical
npm.cmd run package:dir
npm.cmd run test:e2e
node tests/portable-smoke.mjs
npm.cmd run package
npm.cmd run format:check
```

- `build`: verifica TypeScript e compila main, preload e React.
- `test`: testes de dados em bancos temporários, sem tocar nos dados reais.
- `test:vertical`: cria quadro/coluna/cartão, move e reinicia o Electron.
- `package:dir`: gera `release/win-unpacked`.
- `test:e2e`: abre o executável de `win-unpacked` e testa interações reais; precisa executar `package:dir` antes. Os diálogos nativos de escolha de arquivo são simulados, usando arquivos reais nas operações de importação/exportação.
- `package`: gera instalador NSIS e executável portátil para Windows x64.
- `format` / `format:check`: formata / verifica a formatação do código.

O PowerShell pode bloquear `npm.ps1`; os comandos acima usam `npm.cmd` sem alterar políticas do sistema. Dependências ficam em `node_modules`. O empacotador baixa ferramentas oficiais e usa cache do usuário; não requer ferramentas C++ para SQLite.

A combinação validada usa Electron 45.1.0, React 19.3.1, TypeScript 7.0.2 e o módulo SQLite integrado ao Node do Electron. Isso evita uma dependência SQLite nativa externa e problemas de ABI no empacotamento. Fontes: [Electron releases](https://releases.electronjs.org/), [SQLite no Node](https://nodejs.org/docs/latest-v24.x/api/sqlite.html), [segurança no Electron](https://www.electronjs.org/docs/latest/tutorial/security).

Para lançar uma atualização, altere a versão do pacote, preserve o `appId` e o caminho de dados e crie uma nova migração caso mude a estrutura persistida. Leia `AGENTS.md` antes de modificar o banco.

## Estrutura

```text
src/
  shared/       Modelos, validação de dados e contratos IPC
  domain/       Regras de quadros, colunas, cartões e mesclagem; exemplos
  data/         SQLite, transações, backups e migrações versionadas
  main/         Janela Electron, IPC, arquivos, diálogos e pastas
  renderer/
    components/ Interface e painéis
    hooks/      Fila de gravação, edição automática e fechamento seguro
    styles/     Tokens, temas, cores e estilos
scripts/        Build e geração do ícone original
tests/          Persistência, migrações e testes na janela real
assets/         Ícone do aplicativo
release/        Binários gerados
test-results/   Relatórios e capturas dos testes
```

## Segurança e limites

O renderer não tem Node, usa isolamento de contexto e sandbox. A ponte oferece somente operações nomeadas; o main valida o emissor, as ações e os arquivos. A janela carrega um protocolo local restrito, bloqueia navegações e novas janelas e nega permissões. A descrição é texto simples, sem HTML ou scripts executáveis.

A primeira versão foi pensada para organização pessoal, com um único processo por usuário, sem colaboração ou sincronização. O banco usa documentos tipados por entidade e ordem persistida; uma alteração salva o conjunto em uma transação. Para volumes de dezenas de milhares de cartões, convém evoluir para consultas/gravações incrementais antes de ampliar o uso.

Consulte `VALIDACAO.md` para resultados e limites da verificação desta entrega.



## Aparência: Céu e Cerejeiras (1.1.0)

Abra **Configurações → Aparência**:

- **Estilo visual**: escolha Original ou Céu e Cerejeiras pelas miniaturas.
- **Modo**: Claro e Escuro são independentes do estilo. Sistema continua disponível para preservar a preferência de quem já o usava.
- **Intensidade da decoração**: de 0 a 100%. Zero remove as camadas ilustradas; textos, cartões e controles mantêm sua opacidade.
- **Animações decorativas**: ativa/desativa somente três pequenas pétalas ao redor da marca. A preferência do sistema de reduzir movimentos sempre tem prioridade. As animações pausam com a janela oculta ou minimizada.
- **Voltar à aparência original**: restaura o estilo Original mantendo o modo e as cores personalizadas armazenadas.

Usuários existentes continuam no Original, com o mesmo modo e as mesmas cores. O novo estilo só é aplicado quando selecionado.

Céu e Cerejeiras usa uma paleta própria nas superfícies, no fundo e nos destaques da interface. As cores personalizadas dos quadros e a cor global permanecem salvas para o Original; os pequenos marcadores dos quadros na barra lateral continuam identificando cada quadro pela cor escolhida. Editar essas cores durante o novo estilo não altera sua paisagem. Há uma explicação também nos painéis de personalização.

São quatro camadas decorativas independentes, sem capturar cliques ou foco: composição da marca, bordas da barra lateral, panorama do cabeçalho e paisagem suave atrás das tarefas. As artes diurna e noturna são originais, locais e funcionam offline. Recursos e prompts: [ARTWORK.md](src/renderer/assets/sky-cherry/ARTWORK.md).

A versão 1.1.0 usa banco com esquema **3**: a migração mantém modo, cores, conteúdo, IDs e ordem, criando backup SQLite antes de alterar as preferências. As migrações anteriores não foram modificadas. Não abra um banco atualizado com o aplicativo 1.0.0; para voltar à versão anterior, restaure uma cópia do backup anterior com o aplicativo fechado.

As novas exportações usam **formato JSON 2** e incluem todas as preferências de aparência. Exportações do formato **1** continuam importáveis, recebendo o estilo Original por padrão e mantendo seu modo e cores. Mesclar preserva as preferências atuais; substituir usa as preferências do arquivo e faz backup antes da troca.

### Verificar a aparência

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:appearance
npm.cmd run package:dir
$env:GRELLO_PACKAGED='1'
npm.cmd run test:appearance
npm.cmd run test:e2e
npm.cmd run package
node tests/portable-smoke.mjs
```

Sem `GRELLO_PACKAGED=1`, o teste de aparência abre o build de desenvolvimento. Os testes usam pastas temporárias e geram capturas em `test-results/appearance`. Consulte `VALIDACAO-1.1.0.md` para os resultados desta atualização.


## Refinamento visual 1.1.1

A versão 1.1.1 refina somente as flores e pétalas indicadas de Céu e Cerejeiras, usando as árvores da capa como referência. Mantém posições, dimensões, animações, intensidade e opacidade; a capa, a marca e o layout permanecem iguais. Não há mudança no banco, migração nova ou alteração de preferências.

As artes e seu registro estão em `src/renderer/assets/sky-cherry/ARTWORK.md`. A validação desta revisão está em `VALIDACAO-1.1.1.md`.
