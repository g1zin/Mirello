# Artes de Céu e Cerejeiras

Recursos originais gerados para o Grello com a ferramenta integrada **imagegen**. Nenhuma referência a personagens, franquias, marcas ou imagens existentes foi fornecida. O panorama noturno foi derivado do panorama diurno para manter composição, recortes e linguagem visual.

- `day.png`: panorama diurno, 2172 × 724 pixels.
- `night.png`: panorama noturno, 2172 × 724 pixels.
- As pequenas composições da marca, bordas da barra lateral e silhuetas da área de tarefas são vetores locais originais em `components/Decorations.tsx`, com cores definidas nos tokens de `styles/sky-cherry.css`.
- Os PNGs são referenciados pelo CSS e incorporados ao build. Nenhum recurso depende da pasta da ferramenta de geração ou de acesso à internet.

## Prompt diurno

Create an original premium cartoon landscape illustration intended as a panoramic decorative header background for a calm personal Kanban desktop app. Very wide panoramic composition, ideally 3:1. No UI, no writing, no logo, no characters, no buildings, no recognizable franchise references. Bright luminous clear blue sky with a few softly rounded white clouds. Cherry blossom trees with beautifully shaped fluffy rounded pink canopies at the far LEFT and far RIGHT edges only, slender warm brown branches, a few tiny pink petals. Small rolling mint-green hills along the very bottom. Entire central 65 percent of frame must be serene open pale blue sky, plenty of clean negative space for readable application controls overlay. Charming polished hand illustrated cartoon, simple intentional shapes, soft cel shading, subtle paper softness without noisy textures, elegant pink and sky blue palette, tranquil fresh spring daylight. Trees feel like close framing branches rather than dense forest, airy and uncluttered. Full bleed landscape, opaque background. Landscape art only.

## Prompt noturno

Edit this original panoramic cherry blossom landscape into its coordinated NIGHT mode variant. Keep the exact composition, wide 3:1 framing, scale and placement of cherry trees at both edges, rounded clouds and the serene open central sky. Change only time of day and palette: deep clean navy blue sky with gentle moonlight, softly luminous muted dusty pink cherry blossoms, softly blue-lavender clouds, dark teal rolling hills. A few very subtle sparse stars, small faint moon high in the sky away from the center-left area where text will overlay. Peaceful beautiful nighttime cartoon illustration, not eerie, no neon, no extra objects or characters, no text, no logos, no franchise references. Preserve lots of simple open center negative space; premium polished illustration.

## Refinamento pontual — 1.1.1

O acabamento geométrico foi substituído somente nas flores da marca, nos seis conjuntos da borda direita inferior da barra lateral, nas quatro pétalas isoladas da barra e nos dois conjuntos do canto inferior direito da área principal. Os dois conjuntos do canto inferior esquerdo, os galhos/folhas e os panoramas foram preservados.

- `blossoms.png`: conjunto de flores original com transparência, criado pela ferramenta integrada imagegen usando `day.png` como referência de acabamento e a captura anterior como referência de espaço.
- `petal-day.svg` e `petal-night.svg`: pétalas vetoriais locais com curvas orgânicas e luz/sombra. As duas variantes têm exatamente o mesmo caminho.
- A variante noturna dos conjuntos usa a mesma imagem com ajuste de saturação/brilho no CSS, mantendo seus contornos e canal alfa idênticos.
- Coordenadas, tamanhos, rotações e opacidades regionais anteriores foram mantidos. As três animações da marca não foram alteradas.
- Os arquivos `day.png` e `night.png` não foram regravados.

### Prompt do novo conjunto (imagegen integrado)

Create ONE new isolated cherry blossom canopy-cluster asset on a genuinely transparent background, square canvas. Reference image 1 (panorama) is the exact illustration style and palette reference: copy the softly hand-painted cartoon finish of its pink cherry blossom trees, not the landscape. Reference image 2 (app screenshot) is only a footprint reference: the simplified pink circular lobed decorative clusters by the logo and lower right corners will be replaced by this asset in their exact existing rectangular footprints. The new asset must have a compact roughly circular FIVE-LOBED cloudlike silhouette, no trunk, no branch, no leaves, no sky, no ground, no floating elements outside the cluster. Pack the silhouette generously near the canvas edges, tiny transparent margins, no crop. Inside, render many small organic overlapping cherry blossoms with irregular softly notched petals, subtle pink variations, white pale blush highlights from upper left, soft rose shadows and depth like the existing trees. NOT a single giant flower, NOT circles, NOT geometric vector blobs, NOT a symmetrical rosette. No heavy outlines, no hard shadows. Keep a gently irregular five-lobed canopy shape without extending its footprint. Balanced soft light pink, illustrated tree canopy detail readable when shrunk down to 40 pixels as well as 150 pixels. This is an original app decoration asset, not a UI screenshot, not an edit of the landscape. No writing, characters, symbols, borders or blue markings. Fully transparent outside the cluster.
