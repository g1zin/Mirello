# Importação do Grello 1.2.0: tarefas, quadros visuais e imagens

O formato JSON **versão 2** recebido para o planejamento do Catower Defense continua aceito. `grello-exemplo.json` permanece exatamente como foi exportado pelo Grello 1.1.1 e é usado como regressão automatizada. Ao importar esse arquivo, as tarefas, checklists, datas, ordem e preferências são preservados; os quadros importados recebem quadros visuais vazios. Em Mesclar, as preferências do destino continuam prevalecendo.

Para pedir apenas o planejamento das tarefas ao ChatGPT, continue usando a versão 2 e o exemplo antigo. Não é necessário acrescentar campos do editor visual a esse planejamento.

## Novos exemplos fictícios

- **grello-exemplo-visual.json:** documento versão 3, sem imagens externas, com um quadro visual, nota, conector e referência a um cartão. Pode ser importado sozinho.
- **grello-exemplo-visual.grello:** pacote completo exportado pelo aplicativo com quadro visual, cartão vinculado e imagens locais. Pode ser importado por Mesclar ou Substituir. É um exemplo fictício, não um planejamento aprovado do Catower Defense.

Os exemplos foram preparados em perfis isolados pela integração real do editor e pelo exportador do aplicativo. Os caminhos nos diálogos nativos foram simulados apenas para automatizar a escolha dos arquivos. O novo JSON foi extraído de `data.json` de um pacote sem imagens exportado pelo Grello.

## Escolher o formato

| Arquivo | Conteúdo | Importação |
| --- | --- | --- |
| JSON versão 1 ou 2 | Tarefas e preferências, sem cenas/imagens. | Aceito; cria cenas vazias. |
| JSON versão 3, com `assets: []` | Tarefas, preferências e cenas sem imagens externas. | Aceito sozinho. |
| JSON versão 3 com recursos | Declara as imagens, mas não transporta seus bytes. | Importar o pacote completo; JSON isolado é recusado. |
| `.grello` | Manifesto 1 + `data.json` versão 3 + imagens. | Formato de exportação completo recomendado. |
| Pasta `.grello-backup` | Cópia SQLite + imagens + manifesto de integridade. | Restauração manual com o aplicativo fechado; não é um ZIP de importação. |

A versão do aplicativo é **1.2.0**, o esquema SQLite é **4**, o documento completo é **JSON 3** e o manifesto do pacote é **1**. São versões independentes.

## Documento JSON versão 3

O objeto raiz tem exatamente estas propriedades, todas obrigatórias:

| Campo | Tipo e regra |
| --- | --- |
| `format` | Literal `"grello"`. |
| `version` | Número inteiro `3`. |
| `exportedAt` | Data/hora ISO UTC com segundos e `Z`; fração opcional. O exportador gera `YYYY-MM-DDTHH:mm:ss.sssZ`. |
| `data` | O mesmo estado de tarefas do formato 2: `boards`, `columns`, `cards`, `labels`, `settings`. Campos e limites estão na referência legada abaixo. |
| `visuals` | Array de cenas, até 1.000 e no máximo uma por quadro. Pode ser `[]`. Quadros sem registro usam cena vazia. |
| `assets` | Array de metadados de recursos, até 500, sem bytes/base64. Sem imagens é `[]`. |

Não acrescente HTML, URLs de imagens remotas, campos de plugins, scripts ou conteúdo ativo. Objetos são estritos: propriedades desconhecidas são rejeitadas. A validação exata está em `src/shared/visual.ts`; o exemplo contém elementos reais da versão de Excalidraw fixada pelo aplicativo.

### Cenas — `visuals[]`

| Campo | Tipo e regra |
| --- | --- |
| `boardId` | UUID de um quadro em `data.boards`. Não pode se repetir entre cenas. |
| `version` | Número literal `1`, a versão do documento da cena. |
| `elements` | Array em ordem de camadas, de trás para frente, com até 10.000 elementos. |
| `view` | Objeto estrito `{ "scrollX": 0, "scrollY": 0, "zoom": 1 }`. Coordenadas finitas entre -10.000.000 e 10.000.000; zoom entre 0,1 e 30, inclusive. |

Uma cena vazia pode ser representada por `elements: []`, `view: {scrollX: 0, scrollY: 0, zoom: 1}`. O importador também usa essa configuração para quadros de JSONs antigos. A cena inteira tem limite de 12 MiB de JSON UTF-8 e 250.000 pontos de desenho.

### Elementos

Os elementos seguem o formato persistente do Excalidraw **0.18.1**, com uma lista permitida no Grello: `rectangle`, `ellipse`, `diamond`, `text`, `line`, `arrow`, `freedraw` e `image`. Não são aceitos `iframe`, `embeddable`, frames ou elementos de geração de HTML.

Campos comuns obrigatórios:

- `id`: string de 1–128 caracteres, somente letras ASCII, números, `_` e `-`; UUID também é válido. Único **dentro da cena**. Não precisa ser UUID como os registros de tarefas.
- `type`: um dos tipos permitidos acima.
- `x`, `y`: coordenadas finitas entre -10.000.000 e 10.000.000.
- `width`, `height`: números finitos de 0 a 1.000.000; `angle`: número finito em radianos.
- `strokeColor`, `backgroundColor`: `"transparent"` ou hexadecimal com `#` e 3–8 dígitos; use cores padrão de seis dígitos nos arquivos gerados.
- `fillStyle`: `"hachure"`, `"cross-hatch"`, `"solid"` ou `"zigzag"`.
- `strokeWidth`: número de 0 a 100; `strokeStyle`: `"solid"`, `"dashed"` ou `"dotted"`; `roughness`: número de 0 a 5; `opacity`: número de 0 a 100.
- `seed`, `versionNonce`: inteiros; `version`: inteiro maior ou igual a 1; `updated`: número finito, normalmente milissegundos desde Unix epoch.
- `isDeleted`, `locked`: booleanos. Elementos excluídos podem permanecer com `isDeleted: true`; seus recursos são preservados.
- `groupIds`: array de até 100 IDs de grupo; grupos não são tarefas. `frameId` deve ser `null`.
- `roundness`: `null` ou objeto `{type: inteiro, value?: número finito}`.
- `boundElements`: `null` ou array de até 10.000 objetos `{id, type}`, com `type: "text"` ou `"arrow"`, referenciando elementos da mesma cena.
- `link`: `null` ou `"grello-card:" + UUID`, acompanhado do mesmo ID em `customData.grelloCardId`. Links externos não são aceitos.

Campos comuns opcionais:

- `index`: string de até 128 caracteres ou `null`; é o índice fracionário interno do editor. Ao gerar manualmente, use `null` e mantenha o array na ordem desejada; o editor normaliza os índices.
- `customData`: objeto estrito com `grelloKind?: "note" | "card"` e `grelloCardId?: UUID`. Não coloque dados arbitrários aqui.

Campos específicos, presentes conforme o tipo:

| Tipo | Campos |
| --- | --- |
| `text` | `text` e `fontSize` obrigatórios; `containerId` obrigatório, ID do contêiner da mesma cena ou `null`. `text`/`originalText` até 50.000 unidades UTF-16; `fontSize` 1–1.000; `fontFamily` inteiro 1–9; `textAlign` left/center/right; `verticalAlign` top/middle/bottom; `autoResize` booleano; `lineHeight` 0,1–10. Os campos restantes são opcionais no schema, mas devem acompanhar o exemplo do editor. |
| `line`, `arrow` | `points` obrigatório, até 50.000 pares `[x,y]` finitos com os limites de coordenada. `lastCommittedPoint`: par ou `null`; `startBinding`/`endBinding`: objeto de vínculo ou `null`; `startArrowhead`/`endArrowhead`: tipo de ponta ou `null`. Os campos além de `points` são opcionais. |
| `freedraw` | `points` obrigatório; `pressures` opcional, até 50.000 números de 0 a 1; `simulatePressure` opcional booleano; `lastCommittedPoint` par ou `null`, opcional. |
| `image` | `fileId` obrigatório e não nulo, UUID de um recurso em `assets`. `status`: pending/saved/error, opcional; use saved para imagem disponível. `scale`: par de números finitos, normalmente `[1,1]`, opcional. `crop`: objeto com x/y/width/height/naturalWidth/naturalHeight finitos, ou `null`, opcional. |

`originalText`, `fontFamily`, alinhamentos e os demais campos de texto seguem os tipos indicados, mesmo quando opcionais. Prefira copiar os elementos reais do exemplo e alterar apenas o necessário, preservando campos e referências consistentes.

Vínculos de conexões têm formato `{elementId, focus, gap, fixedPoint?}`: `elementId` aponta para um elemento da mesma cena, `focus` e `gap` são números finitos; `fixedPoint`, quando presente, é um par finito ou `null`. Tipos de ponta aceitos: arrow, bar, dot, circle, circle_outline, triangle, triangle_outline, diamond, diamond_outline, crowfoot_one, crowfoot_many e crowfoot_one_or_many.

Setas também podem conter `elbowed` booleano, `fixedSegments` (array de até 10.000 objetos `{index: inteiro, start: par, end: par}` ou `null`), `startIsSpecial` e `endIsSpecial` (booleano ou `null`). São campos opcionais do editor; não são necessários para uma conexão simples.

### Referências a cartões

Uma referência é um contêiner retangular, normalmente com texto vinculado, que inclui:

```json
{
  "customData": {
    "grelloKind": "card",
    "grelloCardId": "UUID-DO-CARTAO-ORIGINAL"
  },
  "link": "grello-card:UUID-DO-CARTAO-ORIGINAL"
}
```

Esse trecho é apenas a parte de integração; o elemento também precisa dos campos comuns. O ID do cartão deve apontar para uma tarefa do mesmo quadro. O texto associado usa `containerId` para o retângulo; `boundElements` do retângulo referencia seu texto. Conexões podem se ligar ao contêiner.

Não crie uma segunda tarefa para representar o vínculo. O aplicativo atualiza título, coluna, conclusão e arquivamento a partir do cartão original. Um UUID ausente é permitido para representar um cartão excluído: o editor mostra **Cartão indisponível**, em vez de quebrar a cena. Um cartão existente de outro quadro é recusado.

### Recursos — `assets[]`

Cada objeto contém exatamente:

| Campo | Regra |
| --- | --- |
| `id` | UUID único entre recursos, sem reutilizar ID de tarefa/quadro/coluna/etiqueta/checklist. |
| `mime` | image/png, image/jpeg ou image/webp no schema de metadados. O exportador atual normaliza e grava **PNG**; para preparar um pacote externamente, use PNG. |
| `bytes` | Inteiro positivo, até 20 MiB, igual ao tamanho real do arquivo. |
| `width`, `height` | Inteiros positivos até 8.192, com produto até 24.000.000. |
| `sha256` | String com exatamente 64 dígitos hexadecimais minúsculos, correspondente aos bytes. |

O registro não contém `path`, `dataURL`, base64 ou caminho original. O arquivo é encontrado pelo ID e tipo: `assets/UUID.png` para PNG; a implementação reconhece extensões jpg/webp para os demais metadados, mas valida a decodificação antes de aceitar o pacote. A forma canônica desta versão é PNG.

Imagens de origem são copiadas/conver­tidas antes de serem usadas. Mover ou apagar o arquivo original não quebra o quadro. Os data URLs usados pelo editor existem apenas na memória durante a renderização, não no estado principal ou nos documentos persistidos.

## Como transportar imagens no pacote completo

Um `.grello` é um arquivo ZIP comum, com **somente**:

```text
manifest.json
 data.json
assets/UUID.png
assets/OUTRO-UUID.png
```

Não coloque pastas explícitas, caminhos absolutos, `..`, arquivos ocultos, previews, fontes, SVGs, scripts ou bancos dentro desse pacote. `data.json` é o documento versão 3; as fontes e os temas pertencem ao aplicativo e não precisam viajar no pacote.

O manifesto é um objeto estrito:

```json
{
  "format": "grello-package",
  "version": 1,
  "files": [
    {"path": "data.json", "bytes": 1234, "sha256": "64-digitos-hexadecimais-minusculos"},
    {"path": "assets/UUID.png", "bytes": 5678, "sha256": "64-digitos-hexadecimais-minusculos"}
  ]
}
```

Os valores acima são ilustrativos: use tamanhos/hashes reais. `files` lista `data.json` e **todos** os recursos declarados, uma vez cada; não lista o próprio manifesto. O manifesto tem limite de 256 KiB, e `files` até 501 entradas. Recursos retidos para desfazer/refazer podem existir mesmo quando a imagem está excluída da cena.

O importador aceita ZIP com métodos stored/deflate, sem criptografia, ZIP64 ou data descriptors, e com nomes UTF-8/ASCII correspondentes nos cabeçalhos locais e no diretório central. Valida antes e durante a descompactação, sem extrair nomes arbitrários para o disco. Rejeita nomes repetidos, entradas inesperadas, tamanhos inconsistentes, hashes diferentes, referências quebradas e conteúdo excessivo.

Limites: **100 MiB comprimidos**, **250 MiB descompactados**, no máximo **502 arquivos** contando manifesto e dados, `data.json` até **25 MiB**, imagem até **20 MiB**. Os limites de tarefas do formato 2 continuam valendo também no estado resultante da mesclagem.

Para o ChatGPT produzir o planejamento, JSON 2 continua sendo a opção simples. Para transportar imagens reais, use a exportação do próprio Grello; renomear um JSON como `.grello` não cria um pacote válido.

## Mesclar, Substituir e backups

**Mesclar** conserva os registros e as preferências do destino. Acrescenta cópias, com novos UUIDs para tarefas, checklists e recursos, e novos IDs para elementos e grupos visuais. Remapeia `boardId`, `columnId`, `labelIds`, `containerId`, `boundElements`, vínculos das setas, `fileId`, `grelloCardId` e `link`. As referências apontam para os cartões importados correspondentes. A referência a um cartão já excluído continua indisponível, sem se associar por engano a uma tarefa do destino. A ordem relativa e o viewport são preservados. Reimportar cria cópias adicionais; não sincroniza registros existentes.

**Substituir** valida todos os dados e imagens, cria backup completo e só então grava a substituição em transação. Uma falha de backup interrompe a operação. Imagens existentes não são sobrescritas nem apagadas; arquivos órfãos de uma falha de gravação também não substituem dados ativos. O aplicativo não remove automaticamente recursos potencialmente necessários a histórico ou backups.

Backups atuais são pastas `.grello-backup` com `grello.sqlite`, `assets` e `manifest.json`, que identifica `format: "grello-backup"`, `version: 1`, banco e arquivos com tamanhos/hashes. São publicados como completos somente após terminar a cópia; `.incomplete` indica uma tentativa não finalizada. A restauração manual e os cuidados com WAL/SHM estão no README. Um `.sqlite` isolado antigo não transporta imagens.

## Fontes de validação e regressões

Consulte `src/shared/model.ts`, `src/shared/visual.ts`, `src/domain/visualMerge.ts`, `src/data/package.ts`, `src/data/database.ts` e `src/main/visualIpc.ts`. Os testes usam os mesmos validadores e operações do importador: JSON legado com cenas vazias, persistência, referência indisponível, mesclagem de imagens/conexões, recuperação de backup e recusa de pacotes inválidos. Resultados realmente executados constam de `docs/VALIDACAO-1.2.0.md`.

A referência a seguir descreve os campos de tarefas e o comportamento legado do Grello 1.1.1. As observações históricas sobre exportação JSON/backup SQLite aplicam-se àquela versão; no Grello 1.2.0, o exportador e o backup completo são os descritos acima. Os campos de `data` continuam válidos no documento 3.

---
# Formato de importação do Grello 1.1.1

Referência para gerar o planejamento do Catower Defense como JSON e importá-lo pela opção **Mesclar**. Anexe este documento e `grello-exemplo.json` ao ChatGPT. O exemplo contém apenas dados fictícios; seus prazos não são compromissos reais nem constituem o planejamento final.

## Como pedir o arquivo ao ChatGPT

Peça um arquivo `.json` completo, no formato **versão 2** descrito aqui, usando o exemplo como modelo estrutural. Cada entidade e item de checklist deve ter um UUID novo e suas referências devem ser consistentes. Defina as colunas, etiquetas, tarefas e prazos a partir do seu planejamento; para prazos ainda indefinidos use `null`.

O arquivo é uma exportação completa, não uma lista de comandos nem um patch. Use JSON válido em UTF-8, sem BOM, comentários, vírgulas finais ou cercas Markdown dentro do arquivo. Não acrescente propriedades como `priority`, `position`, `createdAt`, `status` ou subtarefas aninhadas. As estruturas têm campos estritos: propriedades desconhecidas são rejeitadas.

No Grello, abra Configurações → Importar dados, selecione o arquivo, confira a prévia e escolha **Mesclar**. Essa opção acrescenta cópias de quadros, sem atualizar cartões existentes. Importar novamente o mesmo arquivo cria outras cópias.

## Estrutura principal

Todos os campos abaixo são obrigatórios. A ordem das propriedades dos objetos não importa.

| Campo | Tipo e valores |
| --- | --- |
| `format` | String literal `"grello"`, em minúsculas. |
| `version` | Número inteiro `2`. Não usar `"2"`, `1.1.1` ou a versão do banco. |
| `exportedAt` | Data/hora ISO 8601 em UTC com `T` e `Z`: `YYYY-MM-DDTHH:mm:ssZ` ou com fração de segundo, como `2026-10-29T15:30:00.000Z`. Segundos obrigatórios; fração opcional com um ou mais dígitos. Datas e horas devem ser válidas. Não aceita horário sem fuso nem offsets como `-03:00`. O exportador usa `new Date().toISOString()`, com três dígitos de milissegundos. Este campo registra a exportação; não determina prazos nem ordenação. |
| `data` | Objeto com exatamente `boards`, `columns`, `cards`, `labels` e `settings`, descritos a seguir. |

Dentro de `data`, `boards`, `columns`, `cards` e `labels` são arrays de objetos, todos obrigatórios, podendo ser vazios. `settings` é um objeto obrigatório, inclusive quando se pretende Mesclar. Quadros não contêm colunas aninhadas; colunas não contêm cartões aninhados. Os vínculos são feitos pelos IDs.

## Tipos comuns e limites de texto

- **Título:** string com 1 a 200 unidades UTF-16 depois de remover espaços em branco das extremidades (`trim`). Não pode ficar vazio. Vale para títulos de quadro, coluna, etiqueta, cartão e item de checklist. Emojis podem ocupar mais de uma unidade.
- **Cor:** string hexadecimal no formato `#RRGGBB`, aceitando letras maiúsculas ou minúsculas. Exemplo: `"#b35b6d"`. Não aceita nomes CSS, três dígitos nem canal alfa.
- **Booleano:** `true` ou `false`, sem aspas. Não use `0`, `1` ou `"false"`.
- **UUID:** string com hífens, normalmente gerada como UUID v4 minúsculo, por exemplo `"6af5b82e-051c-483d-b4f3-cccd85cf0299"`. Não use números sequenciais ou nomes como `"quadro-1"`.

A validação atual de IDs é `z.uuid()` do Zod instalado: aceita UUIDs de versões 1 a 8 com variante RFC, além de nil/max. Sua expressão atual é:

```regex
^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$
```

Para gerar novos arquivos, prefira exclusivamente UUIDs v4 minúsculos e diferentes, inclusive para cada item de checklist; não use os valores especiais.

## Objetos de dados

Exceto pelas três preferências explicitamente opcionais na seção de configurações, **todos os campos listados são obrigatórios**. Ausência não equivale a `null`. Só `due` aceita `null`.

### `data.boards[]` — quadros

| Campo | Tipo e significado |
| --- | --- |
| `id` | UUID único. |
| `title` | Título. |
| `accent` | Cor de destaque personalizada do quadro. |
| `background` | Cor de fundo personalizada do quadro. |
| `archived` | Booleano. Use `false` para um quadro visível; `true` para arquivado. |

### `data.columns[]` — colunas

| Campo | Tipo e significado |
| --- | --- |
| `id` | UUID único. |
| `boardId` | UUID de um quadro existente em `data.boards`. |
| `title` | Título. |

Colunas não têm campos `archived`, `completed` ou lista de cartões.

### `data.labels[]` — etiquetas

| Campo | Tipo e significado |
| --- | --- |
| `id` | UUID único. |
| `boardId` | UUID de um quadro existente em `data.boards`. |
| `title` | Título da etiqueta. |
| `color` | Cor hexadecimal. |

### `data.cards[]` — cartões

| Campo | Tipo e significado |
| --- | --- |
| `id` | UUID único. |
| `boardId` | UUID do quadro ao qual o cartão pertence. |
| `columnId` | UUID de uma coluna desse mesmo quadro. |
| `title` | Título. |
| `description` | String de até 50.000 unidades UTF-16; use `""` se vazia. Espaços não são removidos. Quebras de linha são representadas por `\n` no JSON. Conteúdo é exibido como texto, sem executar HTML ou código; não conte com formatação Markdown. |
| `labelIds` | Array com até 100 UUIDs de etiquetas, sem repetição, todas do mesmo quadro do cartão. Use `[]` se não houver etiquetas. |
| `due` | String de data `YYYY-MM-DD` válida ou `null`; veja a seção de prazos. |
| `completed` | Booleano; `true` marca o cartão como concluído. |
| `checklist` | Array com até 500 itens no formato abaixo; use `[]` se não houver checklist. |
| `archived` | Booleano; use `false` para cartão ativo e `true` para arquivado. |

### `data.cards[].checklist[]` — itens de checklist

| Campo | Tipo e significado |
| --- | --- |
| `id` | UUID único em todo o arquivo, inclusive em relação às demais entidades. |
| `title` | Título do item. |
| `done` | Booleano; `true` marca esse item como feito. |

O checklist é uma lista simples, sem níveis, descrições ou prazos próprios. A conclusão do cartão (`completed`) é independente dos itens (`done`): concluir todos os itens não conclui automaticamente o cartão. Colocar um cartão em uma coluna chamada “Concluído” também não altera esse estado. Arquivamento e conclusão são independentes. Um cartão concluído pode manter o prazo; não há data de conclusão no formato.

## IDs, unicidade e referências

A unicidade é **global dentro do arquivo**: nenhum `id` pode se repetir entre quadros, colunas, etiquetas, cartões e itens de todos os checklists. As referências (`boardId`, `columnId` e entradas de `labelIds`) reutilizam o ID do registro ao qual apontam; isso é esperado e não viola a unicidade.

As comparações de IDs são por string exata, diferenciando maiúsculas de minúsculas, sem normalização. Use a mesma grafia em todas as referências. Não gere IDs que difiram somente por capitalização.

Toda referência deve ser resolvida dentro do próprio `data`. Não é possível referenciar um quadro, coluna ou etiqueta que exista apenas no banco de destino. Um cartão deve apontar para coluna e etiquetas do seu próprio quadro. Referências quebradas, IDs duplicados e etiquetas repetidas no mesmo cartão causam rejeição do arquivo inteiro. Títulos iguais são permitidos; não identificam registros.

## Prazos, calendário e fuso horário

`due` representa um **dia de calendário**, sem hora e sem fuso, por exemplo `"2026-11-12"`. Deve ter ano com quatro dígitos, mês e dia com dois, e corresponder a uma data real. Datas passadas e futuras são aceitas. `"2026-02-30"`, `"12/11/2026"`, `"2026-11-12T00:00:00Z"` e `""` são inválidos. Sem prazo é exatamente `"due": null`, sem omitir a propriedade.

O schema confere a data construindo `YYYY-MM-DDT12:00:00Z` e comparando o dia resultante. Esse meio-dia UTC é apenas um mecanismo de validação, não o horário de vencimento salvo. A interface formata o mesmo dia usando meio-dia local e compara o prazo com a data local do computador, sem converter o prazo entre fusos.

Um cartão aberto fica atrasado quando seu dia é anterior ao dia local atual; “Em breve” abrange hoje até sete dias adiante, inclusive. Se `completed` for `true`, a situação é concluído, com ou sem prazo. Para um planejamento, escolha o dia pretendido pelo usuário; não converta um timestamp UTC para preencher `due`.

## Ordem de exibição

Não existem campos `order`, `position` ou índices persistidos no JSON:

- Quadros seguem a ordem de `data.boards`; os arquivados ficam fora da lista ativa.
- Colunas de um quadro seguem sua ordem relativa em `data.columns`, filtrando por `boardId`.
- Cartões de uma coluna seguem sua ordem relativa em `data.cards`, filtrando pelo quadro, coluna e arquivamento. Agrupá-los por coluna no array facilita a leitura, mas não é obrigatório.
- Etiquetas seguem a ordem do array `data.labels`; `labelIds` registra a seleção do cartão. Itens de checklist seguem a ordem do array `checklist`.

A ordem relativa sobrevive à gravação no banco, reinício e mesclagem. Datas, títulos, IDs e `exportedAt` não ordenam automaticamente os cartões. Arquivar um quadro preserva os registros filhos; arquivar um cartão preserva sua coluna e conteúdo.

## Preferências visuais — `data.settings`

| Campo | Obrigatório? | Tipo, valores e padrão quando ausente |
| --- | --- | --- |
| `theme` | Sim | `"light"` (Claro), `"dark"` (Escuro) ou `"system"` (Sistema). |
| `accent` | Sim | Cor hexadecimal de destaque global. |
| `visualStyle` | Não na versão 2 | `"original"` ou `"sky-cherry"` (Céu e Cerejeiras). Ausente: `"original"`. |
| `decorationIntensity` | Não na versão 2 | Número inteiro de 0 a 100, inclusive. Ausente: `65`. Zero desativa a decoração. |
| `decorativeAnimations` | Não na versão 2 | Booleano. Ausente: `true`. |

O exportador escreve os cinco campos; mantenha-os no JSON gerado. Os três campos opcionais só recebem padrão quando ausentes, não quando `null`. Objetos e campos obrigatórios não recebem padrões implícitos.

**Mesclar preserva integralmente as preferências atuais do destino:** modo, destaque global, estilo visual, intensidade e animações. As preferências do arquivo precisam ser válidas, mas não são aplicadas. Por isso, um planejamento importado não muda a aparência escolhida pelo usuário.

As cores `accent` e `background` de cada quadro importado são preservadas como parte dele. Céu e Cerejeiras usa sua paleta coordenada para a interface e mantém as cores personalizadas armazenadas; elas voltam a compor a aparência ao selecionar Original. Os marcadores laterais continuam identificando os quadros por cor. A mesclagem não força troca de estilo.

## Versões e limites de importação

Esta referência descreve o **formato de exportação 2** do aplicativo **1.1.1**. A versão do esquema SQLite é 3 e não aparece no arquivo de exportação.

O importador também aceita o formato legado `version: 1`: o restante da estrutura é igual, mas `data.settings` deve conter **somente** `theme` e `accent`. Nesse caso, o validador completa as três preferências mais novas com os padrões acima. Não inclua essas novas propriedades nas configurações da versão 1. Outras versões são rejeitadas. Para novos arquivos, use sempre versão 2.

| Limite | Máximo |
| --- | --- |
| Tamanho do arquivo selecionado | 25 MiB = 26.214.400 bytes; a mensagem do aplicativo chama de “25 MB”. |
| Quadros | 1.000 |
| Colunas | 10.000 no total |
| Cartões | 50.000 no total |
| Etiquetas | 10.000 no total |
| Etiquetas selecionadas por cartão | 100, sem repetição |
| Itens de checklist por cartão | 500 |

Os limites de registros também se aplicam ao **resultado** de Mesclar, somando dados atuais e importados. Um arquivo válido isoladamente pode ultrapassar o limite do destino. Não há limite adicional de colunas por quadro ou cartões por coluna no schema, além dos totais e do tamanho de arquivo. Nenhum array tem quantidade mínima exigida.

O arquivo é validado antes da gravação e a escrita no banco é transacional. Na interface, a prévia vale por 15 minutos; se expirar, selecione o arquivo novamente. Os formatos e tamanhos descritos são os da implementação atual, não uma garantia para versões futuras.

## O que Mesclar faz

1. Valida o arquivo completo e todas as referências.
2. Gera novos UUIDs para todos os registros importados, incluindo cada item de checklist, e reescreve suas referências.
3. Acrescenta `" (importado)"` ao título de cada quadro importado, cortando o resultado em 200 unidades UTF-16. Títulos já no limite podem não exibir o sufixo inteiro.
4. Acrescenta os registros aos arrays atuais, preservando a ordem relativa e os conteúdos importados, inclusive descrições, prazos, cores, conclusão, checklist e arquivamento.
5. Mantém os registros anteriores e as preferências atuais, sem tentar combinar nomes, IDs ou etiquetas equivalentes.

Mesclar **não sincroniza, deduplica nem atualiza** registros existentes. Reimportar este exemplo cria outro quadro com cópias independentes. Se quiser importar tarefas para um quadro existente, este formato não faz isso automaticamente; o arquivo cria seu próprio quadro.

Não há backup automático específico antes de Mesclar. Já **Substituir** troca todos os dados e preferências pelos do arquivo e cria um backup completo antes da importação. Para este planejamento, escolha **Mesclar**. Um backup manual prévio pode ser feito nas configurações.

## Origem do exemplo e validação executada

`grello-exemplo.json` foi produzido pela operação real de exportação do executável Grello 1.1.1, não por montagem manual do envelope JSON. Os dados fictícios foram criados pelas operações do aplicativo em um perfil novo e isolado: um quadro, duas colunas, duas etiquetas e três cartões, com quatro itens de checklist. Há um cartão com checklist parcial, outro sem prazo nem checklist e um concluído com checklist completo.

Foram executadas estas verificações em 29/10/2026:

- Leitura e validação do arquivo entregue por `parseExport`, a mesma função usada pelo importador, e comparação integral com o estado exportado.
- Duas importações por **Mesclar** através do importador real do executável, em outro perfil temporário contendo um quadro/cartão sentinela fictício e preferências visuais diferentes das do arquivo.
- Comparação integral dos estados: conteúdo anterior intacto, novos IDs inclusive em checklists, referências corretas, ordem e demais campos preservados, título com sufixo e preferências do destino mantidas. A segunda importação confirmou a criação de novas cópias.
- Persistência do resultado ao reabrir o banco pelo `Store` e ao reiniciar o aplicativo com o perfil temporário.
- Compatibilidade com configurações legadas do formato 1 e aplicação dos padrões para os três campos opcionais ausentes no formato 2.
- Rejeição pelo validador de data impossível, timestamp em `due`, referência quebrada, ID duplicado, propriedade desconhecida, etiqueta repetida e versão desconhecida.
- Rejeição de arquivo com versão inválida pelo importador real, sem alteração do estado existente.

A automação simulou apenas os caminhos escolhidos nos diálogos nativos de abrir/salvar; a criação, exportação, validação, mesclagem e gravação foram operações reais do aplicativo. Nenhum quadro ou banco real do usuário foi acessado. Perfis temporários foram removidos após fechar o aplicativo. Não houve alteração do código do aplicativo, execução manual dos diálogos nem teste de importação no perfil pessoal.

Fontes consultadas: `src/shared/model.ts` (schemas, `parseExport`, `validateState` e exportação), `src/shared/appearance.ts` (padrões), `src/domain/actions.ts` (`mergeStates`), `src/data/database.ts` (transações e importação), `src/main/main.ts` (limite de arquivo, diálogos e IPC), `src/renderer/components/BoardView.tsx` (ordem e prazos) e o validador UUID/data-hora do Zod instalado pelo lockfile. O README não foi usado para deduzir o formato.