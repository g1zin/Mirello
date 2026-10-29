# Grello 1.1.1 — refinamento pontual de flores e pétalas

Revisão visual de 29/10/2026. Escopo: as flores ao redor da marca, pétalas isoladas da barra lateral, conjuntos na borda direita inferior da barra lateral e flores do canto inferior direito da área principal.

## Alterações

- Substituído o preenchimento geométrico de 11 conjuntos por uma arte local original com flores pequenas, pétalas orgânicas sobrepostas, variações de rosa e luz/sombra. Arte criada com imagegen integrado, usando as árvores existentes como referência.
- Mantidos os valores originais de x, y e raio de cada conjunto. A imagem ocupa o mesmo envelope dos círculos anteriores: x de -1,35r a 1,42r e y de -1,30r a 1,25r.
- Redesenhadas as quatro pétalas isoladas da barra com curvas e gradientes, dentro dos mesmos retângulos e com as mesmas rotações. A mesma arte de pétala é usada nas três animações existentes da marca.
- A variante noturna usa o mesmo contorno e canal alfa dos conjuntos, com adaptação de cor por CSS.
- Intensidade e opacidade das regiões, dimensões dos elementos animados, duração/atrasos/keyframes, galhos, folhas, marca, cenário e layout preservados.
- Os conjuntos do canto inferior esquerdo da área principal foram preservados, por estarem fora das regiões solicitadas.
- Nenhuma alteração em banco, migrações, formato de exportação ou preferências.

Recursos: `src/renderer/assets/sky-cherry/blossoms.png`, `petal-day.svg` e `petal-night.svg`. Prompt e procedência registrados em `ARTWORK.md` na mesma pasta.

## Verificações executadas

- Build de produção e checagem TypeScript: aprovados.
- Sete grupos de verificações de aparência: aprovados na janela do executável Windows empacotado.
- Onze cenários do fluxo básico: aprovados no executável empacotado, incluindo arrastar cartões, detalhes, pesquisa, filtros e fechamento seguro.
- Capturas claro/escuro inspecionadas: flores coerentes com a capa, controles legíveis e contraste dos cartões mantido.
- Verificados também janela maximizada/menor, intensidade zero, opção de animações desativada e pausa ao ocultar/minimizar ou reduzir movimentos.
- As capturas anteriores foram guardadas em `test-results/blossom-refinement/before-light.png` e `before-dark.png`.

Os testes utilizaram dados temporários. A pasta de dados real do usuário não foi alterada. Não foram acrescentados testes de implementação para uma troca de arte; foram reutilizados os testes de comportamento pertinentes.

## Integridade da capa

Os hashes SHA-256 antes e depois da revisão são idênticos:

- `day.png`: `3c48b30a965ebabf2372562a877753f4749334bfe84603b3dc0adad68e75f096`
- `night.png`: `cdccc9adf2febd29da5a0311d5014af7cab6429ac5e64225218180f63b068369`

## Registros e limites

Resultados: `test-results/appearance/results.json` e `test-results/e2e.json`, ambos aprovados e marcados como pacote Windows.

A seleção de caminhos nos diálogos nativos do teste de importação/exportação foi simulada; as operações de arquivos e dados foram reais. Assistente de instalação e atalhos não foram automatizados nesta revisão. Não foi feita instalação no perfil real do usuário.

Capturas finais: `release/Ceu-e-Cerejeiras-Claro-1.1.1.png` e `release/Ceu-e-Cerejeiras-Escuro-1.1.1.png`.

## Empacotamento final

Instalador e portátil 1.1.1 gerados com sucesso. O portátil foi iniciado diretamente, criou um quadro, gravou SQLite e manteve os dados ao fechar e reabrir. O teste usou outra pasta temporária; não foi feita instalação no perfil real.
