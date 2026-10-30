# Mirello 1.2.1 — marca e hover

Registro das verificações locais anteriores à publicação. Em 30/10/2026, Guilherme Alves informou que o teste local passou, aprovou a versão e autorizou publicar código e Release. A versão anterior está preservada no commit a60ec5d. Não foram acessados ou alterados os dados reais do usuário.

## Alterações

- Nome público Mirello na marca, janela, carregamento, configurações, mensagens, diálogos de arquivo, metadados do Windows e nomes dos pacotes.
- Monograma M original, com cantos arredondados, no bloco inclinado existente. Ícone Windows com resoluções 16–256 px; sem fontes ou dependências novas.
- Contorno interno de 1 px no hover escuro, verde claro no Original e azul claro em Céu e Cerejeiras. Controles, campos e cartões conservam suas dimensões. O foco de teclado mantém seu contorno próprio de 3 px.
- Nenhuma migração nova: appId com.grello.desktop, pasta %APPDATA%\\Grello, grello.sqlite, protocolo/IPC/storage e formatos JSON/.grello mantidos. O nome técnico do pacote npm permanece grello para continuidade; o nome público é Mirello.
- Temas, artes de cerejeiras, animações e comportamentos existentes preservados.

## Verificações executadas

- Build de produção com TypeScript estrito.
- 23 testes de dados passaram, incluindo importação legada, migração, backup e pacotes com imagens.
- 11 cenários do Kanban passaram no executável empacotado, com edição, filtros, ordem, importação/exportação e fechamento/reinício.
- Sete grupos de aparência passaram no executável empacotado: Original/Céu e Cerejeiras nos dois modos, contraste, janela menor/maximizada, movimento, preferências e reinício.
- Verificações adicionais de marca/título/nome do processo Electron, máscara do monograma carregada, contorno de hover em cartão/botão/filtro sem alterar dimensões e preservação do foco de teclado.
- Capturas inspecionadas com dados fictícios: [cartão em hover escuro](screenshots/mirello-escuro-hover-cartao.png), [controle no Original escuro](screenshots/mirello-original-hover-controle.png), [janela menor clara](screenshots/mirello-claro-menor.png).

Portátil final: abriu offline, criou quadro e nota visual e preservou ambos após reiniciar. Instalador e portátil Windows x64 gerados; metadados Mirello 1.2.1 e ausência de assinatura conferidos. Ícone incorporado no executável Windows inspecionado. Main compilado, ícones e créditos empacotados comparados com os arquivos atuais; SHA256SUMS-1.2.1.txt gerado. Formatação e auditoria local passaram. Os pacotes foram finalizados com electron-builder --prepackaged a partir do executável já validado, com a revisão final dos créditos.

As verificações do quadro visual e os limites da versão base estão no [relatório 1.2.0](VALIDACAO-1.2.0.md). A bateria completa do editor não foi repetida nesta revisão de marca/hover. Os testes usam perfis isolados; os diálogos nativos de arquivos são simulados. Instalação sobre a instalação pessoal, atalhos e avisos do Windows ainda exigem conferência manual. Executáveis sem assinatura digital comercial. A publicação foi autorizada após a aprovação local; este relatório não atribui ao usuário testes manuais específicos além do que ele informou.
