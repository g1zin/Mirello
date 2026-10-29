# Validação — Grello 1.1.0 / Céu e Cerejeiras

Executada em 29/10/2026, no Windows x64 build 26200. Todos os testes usaram dados temporários isolados. A pasta de dados real do usuário não foi usada nem modificada.

## Resultado

- Build de produção e TypeScript: aprovados.
- **13 testes de dados**: aprovados.
- **11 cenários do fluxo básico**: aprovados no executável Windows empacotado.
- **7 grupos de verificações de aparência**: aprovados no executável empacotado, sem erros JavaScript.
- Instalador NSIS e executável portátil 1.1.0: gerados com sucesso.
- Portátil iniciado diretamente: criou quadro, gravou SQLite, fechou e reabriu preservando os dados.
- Os sete arquivos de runtime compilados, incluindo os dois PNGs, foram comparados com os arquivos dentro do ASAR final: conteúdo idêntico.

## Aparência verificada

1. Estilo Original mantido como padrão; modo e cores existentes preservados.
2. Original e Céu e Cerejeiras em Claro e Escuro: capturas, controles visíveis, foco e contraste dos cartões. O teste calculou contraste mínimo de 4,5:1 para o texto dos cartões.
3. Janela maximizada e janela de 1060 × 740 pixels: busca, filtros e configurações acessíveis. A rolagem horizontal das colunas foi preservada.
4. Apenas três pétalas na região da marca têm animação. A preferência de reduzir movimentos foi emulada no Chromium e desativou os movimentos. Minimizar e ocultar foram exercitados na janela Electron real e pausaram as animações; restaurar/exibir retomou quando permitido.
5. Intensidade zero removeu todas as camadas ilustradas sem reduzir a opacidade dos cartões/controles. Animações desativadas permaneceram pausadas ao restaurar a intensidade.
6. Arrastar cartão entre colunas, editar descrição, pesquisar na descrição e filtrar por etiqueta funcionaram com o novo estilo ativo.
7. Reiniciar preservou modo, estilo, intensidade, opção de animações, cartões e ordem. Voltar ao Original manteve o modo e recuperou as cores personalizadas armazenadas.

Foram inspecionadas capturas dos dois modos, janelas menores e maximizada, detalhes do cartão, configurações e decoração em intensidade zero. A arte fica mais presente na capa; cartões e colunas usam superfícies próprias.

## Compatibilidade de dados

Quatro testes novos cobrem:

- Migração de um banco real com esquema 2 para 3: entidades, IDs, modo e cores preservados; backup anterior com versão 2 e conteúdo conferidos. Reabrir não criou outra migração/backup.
- Importação de uma exportação de formato 1: mantém conteúdo, IDs, modo e cores; acrescenta Original e defaults de decoração.
- Persistência e ida/volta por exportação de formato 2; alterações parciais não resetam preferências ausentes no patch.
- Valores inválidos de aparência recusados sem alterar o banco.

Os nove testes anteriores também passaram: persistência/ordem, edição, checklists, etiquetas, arquivamento/restauração, mesclagem, substituição, restauração de backup, falha de backup, rollback de migração e banco de versão futura.

As migrações 1 e 2 publicadas não foram alteradas. A migração 3 só acrescenta preferências. Backups ocorrem antes da migração. O caminho %APPDATA%\Grello e o appId permaneceram iguais.

## Fluxo básico no pacote

Os onze cenários anteriores foram repetidos na versão 1.1.0: criação offline, arrastar/ordenar, detalhes/checklist/etiquetas/prazos, pesquisa/filtros, conclusão, movimento por painel, duplicação, arquivar/restaurar/excluir com confirmação, colunas, quadros, temas, isolamento de segurança, exportação/importação e fechamento imediato após digitar.

A escolha de caminhos nos diálogos nativos de importação/exportação foi simulada. Leitura/gravação dos arquivos, validação e transações foram reais.

## Artes e arquivos locais

As duas paisagens foram geradas com a ferramenta integrada imagegen e estão em `src/renderer/assets/sky-cherry`. Ambas têm 2172 × 724 pixels. Os prompts estão em `ARTWORK.md` nessa pasta. Os demais detalhes são vetores locais originais em `Decorations.tsx`.

Nenhum arquivo é carregado de serviços remotos. O teste gráfico operou com o contexto de rede offline. Os PNGs foram carregados e decodificados no protocolo local do aplicativo.

## Registros e capturas

- `test-results/appearance/results.json`: aparência, pacote, sete grupos aprovados.
- `test-results/appearance/*.png`: quatro combinações de estilo/modo, tamanhos e estados.
- `test-results/e2e.json`: onze cenários básicos no pacote.
- `test-results/portable.json`: portátil aberto e reiniciado com persistência.
- `release/Ceu-e-Cerejeiras-Claro-1.1.0.png` e `release/Ceu-e-Cerejeiras-Escuro-1.1.0.png`: capturas de entrega.

O portátil foi controlado por uma conexão local de depuração apenas no teste. A abertura normal não habilita essa conexão.

## Limites da verificação

Não foi executado o assistente de instalação no perfil real. Atalhos e a seleção manual pelos diálogos nativos de arquivos ainda pedem conferência após instalar. Não foram testados leitores de tela, outras escalas de DPI, outros sistemas operacionais ou encerramento forçado do sistema. Não se afirma validação completa de acessibilidade.

Os executáveis não possuem certificado comercial de assinatura. Não há funcionalidade solicitada deixada para implementar nesta atualização.

## Entrega

- `Grello-Instalador-1.1.0.exe`
- `Grello-Portatil-1.1.0.exe`
- `Grello-Codigo-1.1.0.zip`
- `SHA256SUMS-1.1.0.txt`

O histórico da entrega anterior permanece em `VALIDACAO.md`.
