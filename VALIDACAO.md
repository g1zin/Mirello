# Validação da versão 1.0.0

Validação executada em 28/10/2026, no Windows x64 build 26200, usando dados isolados em pastas temporárias. Nenhum teste utilizou a pasta real %APPDATA%\Grello.

## Resultado

- Build de produção e verificação TypeScript: aprovados.
- Nove testes automatizados de dados: aprovados.
- Fluxo inicial na janela Electron: aprovado, com criação de quadro, duas colunas, cartão, movimentação e reinício.
- Onze cenários gráficos no executável final `release/win-unpacked/Grello.exe`: aprovados, sem erros JavaScript na página.
- Executável portátil final: abertura direta, criação de quadro, gravação SQLite e reabertura com persistência aprovadas.
- Formatação Prettier: aprovada.
- Auditoria npm durante a instalação: zero vulnerabilidades reportadas.
- Cinco arquivos compilados (main, preload, HTML, CSS e JavaScript da interface): comparação binária idêntica entre `dist` e o ASAR do pacote final.
- Instalador NSIS e portátil Windows x64: geração concluída com sucesso.

## Cenários de dados

1. Persistência de conteúdo e ordem de cartões, colunas e quadros após fechar e abrir o banco.
2. Edição, checklist, etiquetas, duplicação com IDs distintos, arquivamento/restauração e transferência de cartões ao excluir coluna.
3. Exportação e substituição sem perda de dados; restauração real da cópia SQLite de backup.
4. Mesclagem com novos IDs e referências válidas, preservando dados atuais.
5. Recusa de JSON incompatível, referências quebradas, IDs repetidos, títulos vazios e datas inválidas, sem alterar o banco.
6. Migração de banco v1 para v2, com backup anterior verificável.
7. Recusa de banco de versão futura sem perder conteúdo.
8. Falha de backup bloqueando a substituição.
9. Falha de migração com rollback e backup preservado.

## Cenários na janela real

1. Criação de quadros, colunas e cartões com o contexto de rede offline.
2. Arrastar cartões dentro de uma coluna e entre colunas, conferindo a ordem no banco.
3. Título, descrição, etiqueta, prazo e checklist; pesquisa pela descrição com normalização de acentos. Conteúdo com marcação HTML permanece texto e não executa código.
4. Conclusão de cartão, filtro de concluídos e movimento pelo painel.
5. Duplicação, arquivamento, restauração e confirmação/cancelamento de exclusão permanente.
6. Renomear, ordenar e excluir coluna, mantendo seus cartões.
7. Renomear, ordenar, arquivar e restaurar quadro.
8. Temas claro/escuro e mudança de destaque/fundo do quadro.
9. Verificação de sandbox, isolamento, Node desativado no renderer e bloqueio de novas janelas.
10. Exportação real para JSON; recusa de arquivo inválido; mesclagem; substituição e criação de backup.
11. Digitação seguida de fechamento imediato da janela; reabertura e novo reinício preservando conteúdo, ordem e preferências.

O portátil foi iniciado como executável independente e controlado por uma conexão local de depuração apenas durante o teste. A conexão não é iniciada no uso normal. A tentativa inicial de automatizar o lançador portátil pelo controlador Electron não se conectou; a abertura direta confirmou o funcionamento e a persistência.

Os registros locais estão em `test-results/e2e.json`, `test-results/vertical.json` e `test-results/portable.json`. Capturas de tela em `test-results` permitem conferir os temas e a abertura do portátil. Essa pasta não integra o ZIP do código.

## Conferências manuais restantes

- Não foi feita instalação no perfil real do usuário. O assistente do instalador, a criação dos atalhos e a abertura pelo atalho precisam de uma conferência após a instalação.
- Nos testes de importação/exportação, a escolha do caminho pelo diálogo nativo foi simulada; a validação, leitura, gravação e transação foram reais.
- A abertura do Explorador pelas configurações não foi automatizada.
- Não foram feitos testes em outros sistemas operacionais, leitores de tela, desligamento forçado do Windows ou volumes extremos de dados.

Conferência sugerida no seu computador:

1. Execute o instalador, conclua a instalação e abra o Grello pelo atalho da área de trabalho.
2. Crie um quadro e um cartão, feche a janela e reabra pelo atalho.
3. Em Configurações, exporte usando o diálogo do Windows e abra a pasta de backups. Para conferir a importação sem substituir dados reais, use Mesclar.

Os executáveis não possuem certificado comercial de assinatura; o Windows pode exibir editor desconhecido. Não há recursos funcionais do escopo básico deixados para implementar.

## Artefatos

- `Grello-Instalador-1.0.0.exe`
- `Grello-Portatil-1.0.0.exe`
- `Grello-Codigo-1.0.0.zip`
- `SHA256SUMS.txt`

Os hashes são gerados ao final da entrega e ficam em `release/SHA256SUMS.txt`.
