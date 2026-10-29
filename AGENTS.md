# Instruções para futuras alterações no Grello

## Objetivo e ambiente

Aplicativo desktop pessoal, offline, em português do Brasil. Windows x64. Electron + React + TypeScript; SQLite integrado ao Node do Electron. Não transforme o aplicativo em serviço web nem adicione conta, nuvem ou IA sem solicitação.

Use `npm.cmd` neste Windows: o PowerShell pode bloquear `npm.ps1`. Não altere a política de execução. Dependências devem permanecer locais ao projeto. Não altere configurações de outros projetos.

## Onde mudar

- `src/shared/model.ts`: modelos Zod, formato JSON versionado, tipos e lista de ações autorizadas.
- `src/domain/actions.ts`: regras de negócio puras. IDs UUID estáveis; ordem dos arrays é a ordem exibida.
- `src/data/database.ts`: SQLite, transações e backups consistentes com VACUUM INTO.
- `src/data/migrations.ts`: migrações sequenciais e PRAGMA user_version.
- `src/main`: integrações com Windows/Electron, arquivos, diálogos e IPC.
- `src/renderer/components`: componentes e painéis.
- `src/renderer/hooks`: fila serial de operações, debounce e barreira de salvamento ao fechar.
- `src/renderer/styles/tokens.css`: fonte, paleta, espaçamentos, bordas, tamanhos e temas.
- `src/renderer/styles/colors.ts`: contraste das cores personalizadas.
- `tests`: testes de dados e janela real. `test-results` contém saídas locais ignoradas pelo Git.

Prefira componentes pequenos e funções simples. Não crie sistema de plugins ou camadas genéricas sem necessidade. Use Prettier e TypeScript estrito. Renderize conteúdo dos cartões como texto; jamais use dangerouslySetInnerHTML.

## Comandos

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run build
npm.cmd test
npm.cmd run test:vertical
npm.cmd run package:dir
npm.cmd run test:e2e
npm.cmd run package
npm.cmd run format
npm.cmd run format:check
```

O E2E usa o executável empacotado: gere `package:dir` antes. Ele automatiza uma janela real e simula apenas a seleção nos diálogos nativos de arquivos. Não usa serviços externos.

Para testar o desenvolvimento com isolamento, `tests/vertical.mjs` configura `GRELLO_E2E=1` e `GRELLO_TEST_DATA` para uma pasta temporária. O código só considera a pasta alternativa quando essa variável de teste está ativa. Nunca rode testes destrutivos em %APPDATA%\Grello.

## Preservação de dados

- Caminho permanente: `%APPDATA%\Grello\grello.sqlite`; backups em `backups`. Preserve esse caminho, `appId` e o nome da aplicação nas atualizações.
- Nunca apague ou recrie o banco existente para corrigir um bug.
- Não edite uma migração já publicada. Acrescente uma nova ao final, incremente a versão e teste atualização a partir da versão anterior.
- O backup de um banco existente deve ocorrer **antes** da migração e fora da transação que altera o esquema. Se o backup falhar, aborte a migração.
- Bancos com versão futura devem ser recusados sem tentar rebaixar ou “reparar” os dados.
- Todas as mutações e importações precisam ser atômicas. Preserve IDs, referências entre quadro/coluna/cartão/etiqueta e ordem.
- Mesclar importa cópias, renova IDs inclusive dos itens do checklist e preserva as preferências atuais. Substituir exige confirmação e backup completo anterior.
- A validação de importação deve acontecer antes de gravar. Mantenha o limite de tamanho e rejeite referências quebradas, versões desconhecidas e IDs duplicados.
- Não misture arquivos WAL de bancos diferentes. Restauração manual exige aplicativo fechado e cópia prévia da pasta inteira.
- Mudar campos persistidos também exige uma estratégia para ler dados antigos e arquivos JSON antigos; não basta atualizar apenas o schema de validação.
- Ao mudar a edição automática, teste digitação seguida de fechamento imediato da janela. Não use apenas cleanup de React para gravar dados assíncronos.

## Segurança e experiência

Mantenha contextIsolation=true, nodeIntegration=false, sandbox=true, CSP restrita, bloqueio de navegação/janelas, validação do sender IPC e operações explícitas no preload. Não exponha filesystem, shell, ipcRenderer ou avaliação de código genéricos ao renderer.

Confirme exclusões permanentes. Colunas com cartões devem exigir uma coluna de destino válida no mesmo quadro, incluindo os cartões arquivados. Arquivar não exclui conteúdo.

Toda interface cotidiana deve ficar em pt-BR, com foco visível, mensagens de erro e salvamento, temas claro/escuro e respeito a prefers-reduced-motion. Mantenha contraste mesmo com cor de destaque personalizada. Não exponha detalhes técnicos desnecessários na interface.

## Verificação mínima por tipo de alteração

- Regras/dados: `npm.cmd test` e testes novos de comportamento quando houver mudança material.
- Interface/IPC: build e E2E, incluindo edição, filtros e fechamento seguro.
- Migração/importação: teste atualização de banco anterior, backup recuperável, arquivo inválido e preservação de dados/ordem.
- Empacotamento/dependências: gere e execute o binário em `win-unpacked`, depois gere NSIS e portátil.
- Antes da entrega, atualize README/VALIDACAO se os comandos, caminhos ou limites mudarem. Relate apenas verificações executadas, distinguindo diálogos simulados de interações manuais.



## Estilos visuais (desde 1.1.0)

- `src/shared/appearance.ts`: defaults de novas preferências. Usuários antigos recebem Original, sem alterar modo nem cores.
- `src/renderer/hooks/useAppearance.ts`: aplica estilo/modo, observa redução de movimentos, visibilidade do documento e eventos restritos da janela.
- `AppearanceSettings.tsx`: miniaturas, modo, intensidade e animações. Não remova a opção Sistema silenciosamente.
- `Decorations.tsx`: quatro regiões decorativas independentes, sempre aria-hidden, inert e pointer-events:none.
- `styles/appearance.css`: controles de seleção; `styles/sky-cherry.css`: tokens e composição do estilo.
- `assets/sky-cherry`: panoramas locais e registro dos prompts. Mantenha os PNGs no projeto e no build; não use caminhos da pasta de geração.
- A intensidade só altera camadas decorativas. Nunca aplique opacity no ancestral do conteúdo funcional.
- Apenas a região da marca tem animações. Sempre respeite prefers-reduced-motion, opção salva e pausa ao ocultar/minimizar.
- Céu e Cerejeiras usa paleta coordenada. Não regrave as cores personalizadas dos quadros para aplicar um estilo. Elas voltam no Original; os marcadores laterais mantêm a identificação por cor.
- Banco atual: esquema 3. Exportação atual: versão 2, com importação compatível com versão 1. Patches de preferências não devem aplicar defaults aos campos ausentes.
- Para um próximo estilo, acrescente uma opção validada, sua folha CSS e recursos locais; reutilize as quatro regiões e o hook, sem criar sistema de plugins.
- Após mudanças visuais, execute `npm.cmd run test:appearance`, inspecione as capturas claro/escuro e menores, depois teste com `GRELLO_PACKAGED=1`. Migrações e importação antiga têm testes em `tests/appearance.test.ts`.

## Publicação e privacidade

- O repositório público é g1zin/grello; executáveis são distribuídos por GitHub Releases, fora do histórico.
- Antes de publicar, execute npm.cmd run licenses e npm.cmd run audit:publication. Revise também arquivos/histórico manualmente; o scanner de padrões não substitui revisão.
- Nunca grave tokens em scripts, arquivos, argumentos de commit ou remotes. Use autenticação já disponível ou login interativo oficial.
- .local-archive contém preservações locais não publicadas; .tools contém ferramentas locais. Ambos devem continuar ignorados.
- Preserve LICENSE (MIT existente), CREDITS.md, THIRD_PARTY_NOTICES.md e LICENSES ao atualizar dependências. Os avisos entram nos pacotes por extraResources.
- Capturas públicas em docs/screenshots usam somente dados fictícios. Não publique JSONs brutos de testes que contenham caminhos pessoais.
- Não mova tags já publicadas nem force push. Faça um novo commit e uma nova versão quando necessário.
