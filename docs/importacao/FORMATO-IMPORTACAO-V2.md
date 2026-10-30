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