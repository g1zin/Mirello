# Créditos, origem e licenças

A licença MIT existente do Grello foi mantida em [LICENSE](LICENSE), sem alteração no seu texto.

## Projeto e artes

- **Guilherme Alves**: direção do projeto, escolhas visuais e testes manuais de aprovação.
- **IA/Codex**: assistência na implementação, organização e automação de verificações.
- **imagegen integrado**: geração das paisagens diurna/noturna e dos conjuntos de flores. Foram criados para o projeto, sem referências a personagens, marcas ou cenários de franquias. [Registro dos prompts e recursos](src/renderer/assets/sky-cherry/ARTWORK.md).
- **Vetores de decoração**: composições locais em Decorations.tsx e pétalas SVG no diretório das artes.
- **Ícones de interface**, incluindo a folha usada na composição da marca: **Lucide**, com licença ISC e avisos MIT do Feather nos ícones derivados. O texto integral instalado, incluindo a atribuição a Cole Bemis/Feather, está em LICENSES/lucide-react-LICENSE.txt.
- **Ícone do aplicativo**: composição preparada para o Grello pelo script scripts/create-icon.ps1, com a letra g renderizada em bitmap usando Segoe UI.

As artes geradas com IA estão identificadas como tal; não são apresentadas como ilustrações desenhadas manualmente por Guilherme Alves.

## Fontes

A interface usa Segoe UI Variable/Segoe UI disponíveis no Windows e fallback sans-serif. **Nenhum arquivo de Segoe UI é redistribuído** pelo projeto. Desde 1.2.0, o editor visual inclui as fontes locais documentadas abaixo; a interface principal continua usando a fonte do sistema. A composição bitmap do ícone não contém uma fonte embutida; componentes internos do Electron seguem os avisos da sua distribuição.

A documentação da Microsoft distingue o uso/renderização e a criação de imagens da redistribuição dos arquivos de fonte: [FAQ oficial de fontes do Windows](https://learn.microsoft.com/en-us/typography/fonts/font-faq).

## Dependências e ferramentas

Os nomes/versões/licenças foram conferidos nos arquivos package.json e LICENSE/NOTICE dos pacotes instalados, com versões fixadas no lockfile. Todas as referências resolved do lockfile usam registry.npmjs.org; o lockfile inclui os valores de integridade dos pacotes.

O inventário e os textos integrais copiados estão em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) e [LICENSES](LICENSES). O script scripts/collect-licenses.mjs permite reproduzir essa coleta a partir de npm ci.

- [Electron](https://www.electronjs.org/): MIT; o runtime inclui Chromium, Node.js e respectivos componentes. Os arquivos LICENSE e LICENSES.chromium.html da distribuição Electron são preservados nos pacotes.
- [React](https://react.dev/) e React DOM/Scheduler: MIT.
- [Zod](https://zod.dev/): MIT.
- [Lucide](https://lucide.dev/license): ISC, com avisos MIT do Feather para os ícones derivados.
- [SQLite](https://sqlite.org/copyright.html): código distribuível dedicado ao domínio público pelo projeto. Usado por node:sqlite do runtime Electron/Node; não há um módulo SQLite nativo externo no renderer.
- TypeScript e Playwright: Apache-2.0. Vite, esbuild, electron-builder, Prettier, tsx e os pacotes de tipos listados no inventário: MIT.

Os arquivos de licença/avisos são incluídos como recursos dos pacotes, além dos avisos já presentes no runtime Electron. Licenças de terceiros não são substituídas pela licença do Grello.

Os executáveis Windows desta versão não recebem assinatura digital comercial.

## Quadro visual na versão local 1.2.0

O editor utiliza Excalidraw 0.18.1, licença MIT. Sua integração no Grello usa recursos locais e não habilita colaboração, serviços remotos, embeds nem chave de produção. A referência verificada é a documentação oficial e o LICENSE do tag v0.18.1. O build adapta apenas o endereço de fallback das fontes para os arquivos empacotados; não remove avisos de autoria.

A interface principal continua com Segoe UI do Windows, sem redistribuir seus arquivos. O editor acrescenta fontes locais inalteradas da distribuição Excalidraw: Assistant, Cascadia Code, Excalifont, Liberation Sans, Lilita One, Nunito, Virgil e Xiaolai (SIL OFL 1.1), e Comic Shanns (MIT). Copyrights, autores, nomes reservados e licenças estão em LICENSES/font-*.txt. Os avisos foram conferidos também nos metadados dos arquivos WOFF2 distribuídos. Excalifont deriva de Virgil; os avisos de ambos são preservados.

fflate 0.8.3 (MIT) implementa os pacotes ZIP. image-size 2.0.4 (MIT) confere dimensões de imagens antes da decodificação. A normalização de imagens acontece localmente no Chromium e no Electron, sem serviço externo. As cinco pétalas da lateral reutilizam as artes SVG locais já existentes; sua animação usa CSS.

Os testes desta etapa são automatizados, com dados fictícios. Não se atribui a Guilherme uma aprovação ou novos testes manuais que ainda não ocorreram. A entrega 1.2.0 permanece local até sua avaliação.