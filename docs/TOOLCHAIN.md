# Ferramentas de empacotamento

Os executáveis são gerados por electron-builder. O instalador e o lançador portátil usam **NSIS**, uma ferramenta de terceiros, não criada pelo Grello.

O projeto NSIS documenta licenças próprias para o núcleo/plugins e módulos de compressão, incluindo zlib/libpng, bzip2 e CPL-1.0 com uma exceção de ligação para o módulo LZMA. Essas licenças não são substituídas pela licença MIT do Grello.

Referências de origem:

- [electron-builder](https://github.com/electron-userland/electron-builder), versão fixada no package-lock.json.
- [NSIS](https://nsis.sourceforge.io/).
- [Avisos/COPYING do projeto NSIS](https://github.com/kichik/nsis/blob/master/COPYING).
- [Código-fonte do NSIS](https://github.com/kichik/nsis).

Não há modificações locais no código dessas ferramentas. Os avisos dos pacotes npm e do runtime Electron estão documentados em CREDITS.md, THIRD_PARTY_NOTICES.md e LICENSES; os avisos de Chromium/Node permanecem na distribuição Electron.
