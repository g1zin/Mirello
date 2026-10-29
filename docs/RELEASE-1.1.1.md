# Grello 1.1.1

Primeira publicação pública da versão aprovada do Grello: organização pessoal em quadros Kanban, offline e em português do Brasil.

## Recursos disponíveis

- Quadros, colunas e cartões, com ordem persistente, arrastar e mover pelo painel.
- Descrições, etiquetas, prazos, checklists, duplicação, conclusão e arquivamento/restauração.
- Pesquisa e filtros; salvamento automático em SQLite.
- Exportação/importação JSON e backups locais.

## Personalização

Estilos **Original** e **Céu e Cerejeiras**, com modos claro/escuro, miniaturas, intensidade e opção de animações. As flores da versão 1.1.1 usam acabamento orgânico coordenado com a capa, preservando o visual aprovado e as posições das decorações.

## Download e instalação

Em **Assets**, escolha:

- **Grello-Instalador-1.1.1.exe**: execute o assistente para instalar com atalhos.
- **Grello-Portatil-1.1.1.exe**: abra diretamente, sem instalar.
- **SHA256SUMS.txt**: confira os hashes SHA-256 dos dois arquivos.

Não é necessário Node.js, terminal ou servidor para usar o aplicativo. Instalador e portátil salvam os dados em **%APPDATA%\Grello**, separados da instalação. O portátil não leva os dados automaticamente em um pendrive.

O GitHub oferece o código-fonte da tag em ZIP/tar.gz; ele não precisa ser anexado novamente.

## Limitações conhecidas

- Pacotes para **Windows x64**, sem assinatura digital comercial; pode aparecer o aviso de editor desconhecido.
- Sem conta, nuvem, colaboração ou sincronização. Backups permanecem locais, a menos que você os copie.
- Assistente do instalador, atalhos e seleção manual pelos diálogos nativos ainda pedem conferência no computador de destino. Os testes automatizados simulam a escolha de caminhos nos diálogos de arquivos.
- Não há validação completa com leitores de tela, outras escalas de DPI ou volumes extremos de dados.

Direção, escolhas visuais e testes manuais de aprovação: **Guilherme Alves**. Desenvolvimento com assistência de **IA/Codex**; artes identificadas como geradas com imagegen.

Licença MIT existente preservada. Leia o [README](https://github.com/g1zin/grello/blob/v1.1.1/README.md), os [créditos/licenças](https://github.com/g1zin/grello/blob/v1.1.1/CREDITS.md) e o [relatório da publicação](https://github.com/g1zin/grello/blob/v1.1.1/docs/PUBLICACAO-1.1.1.md).
