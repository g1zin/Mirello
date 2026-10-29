# Preparação pública — Grello 1.1.1

Data: 29/10/2026. Esta etapa organizou e preparou para publicação a versão aprovada, sem acrescentar funcionalidades ou alterar o visual.

## Preservação

- A pasta ainda não era um repositório Git. Foi inicializado um repositório local, sem substituir outro.
- Antes da limpeza, o código, artes, lockfile, testes, configurações e documentação aprovados foram preservados no commit **4ea5137**.
- Os arquivos de src, assets, index.html, tsconfig.json e LICENSE permanecem idênticos a esse commit. A organização acrescentou documentação pública, avisos de terceiros e scripts de publicação/auditoria.
- A versão exibida na janela e pelo runtime empacotado foi conferida como **1.1.1**.
- Dados reais e backups do usuário não foram abertos, usados em testes, movidos ou apagados.

## Limpeza executada

Removidos dentro da pasta do projeto:

- dist e os builds gerados antigos, depois de preservar o material aprovado.
- Instaladores/portáteis antigos descartáveis de 1.0.0/1.1.0, blockmaps e logs de empacotamento.
- test-results anterior, incluindo relatórios brutos com caminhos temporários, capturas intermediárias e capturas de falhas.
- A pasta vazia acidental VALIDACAO-1.1.0.m (o documento .md foi preservado).
- O ZIP temporário de download do GitHub CLI, após validar seu hash oficial e extrair a ferramenta.
- node_modules foi reinstalado por npm ci, a partir do lockfile.

Preservados por cautela em **.local-archive**, ignorado pelo Git: snapshots de código antigos, os binários/hash aprovados de 1.1.1 e referências visuais anteriores. Esses arquivos podem conter histórico útil e não foram descartados. .tools mantém apenas ferramentas locais necessárias, fora da publicação.

As capturas públicas em docs/screenshots usam dados fictícios de testes. As saídas dos testes desta preparação são temporárias e ignoradas.

## Verificações executadas após a limpeza

- npm ci: concluído; auditoria do npm reportou zero vulnerabilidades naquele momento. Há avisos de depreciação em dependências transitivas; as versões aprovadas foram preservadas.
- Formatação Prettier: aprovada.
- 13 testes de dados: aprovados, incluindo persistência/ordem, importação antiga, backup, rollback e migrações.
- Build de produção e checagem TypeScript: aprovados.
- 11 cenários funcionais no executável Windows empacotado: aprovados.
- 7 grupos de verificações de aparência no executável: aprovados.
- Versão da interface e app.getVersion: 1.1.1.
- Oito arquivos compilados/artes comparados com o ASAR: idênticos.
- Presença e conteúdo dos avisos de licença: conferidos; 18 arquivos de licença/NOTICE, além de créditos e da licença do Grello. Os avisos originais do Electron/Chromium foram preservados.
- Instalador e portátil Windows x64 gerados novamente a partir desta árvore de código, com os avisos acrescentados.
- Portátil iniciado diretamente, com criação de quadro, gravação SQLite, fechamento e reabertura com persistência.
- Auditoria de padrões nos arquivos rastreados e blobs do histórico, com revisão dos arquivos destinados à publicação: sem ocorrências de credenciais, bancos ou caminhos privados.

A auditoria de padrões é uma verificação auxiliar, não uma garantia de detecção universal. Os commits usam e-mail público noreply; não há token em arquivos, commits ou URL do remote.

## Licenças e origem

LICENSE (MIT existente) foi preservado byte a byte. CREDITS.md identifica a assistência de IA/Codex, direção/escolhas visuais/testes manuais de Guilherme Alves, artes geradas com imagegen, fontes do sistema e ícones Lucide/Feather.

Os textos de terceiros foram coletados dos pacotes instalados e incluídos nos pacotes. O lockfile aponta somente para registry.npmjs.org e contém integridades. A interface usa fontes do sistema; nenhum arquivo de Segoe UI foi incluído pelo projeto. docs/TOOLCHAIN.md identifica o NSIS e suas fontes/licenças próprias.

## Limitações e conferências manuais

Não foi feita instalação no perfil real. Assistente do instalador, atalhos e seleção manual pelos diálogos nativos precisam de conferência no computador de destino. A seleção de caminhos é simulada nos E2Es, mas leitura/gravação e operações no banco são reais.

Não foram validados outros sistemas operacionais, leitores de tela, todas as escalas de DPI, desligamento forçado ou volumes extremos de cartões. Os executáveis não possuem assinatura digital comercial.

## Entrega pública

A tag v1.1.1 identifica o commit de entrega, preservando o commit aprovado como ancestral, sem reescrever histórico.

A Release contém somente o instalador Windows x64, o portátil Windows x64 e SHA256SUMS.txt. O código-fonte em ZIP/tar.gz é oferecido automaticamente pelo GitHub a partir da tag.
