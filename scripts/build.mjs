import { cp, mkdir } from 'node:fs/promises';
import { build as bundle } from 'esbuild';
import { build } from 'vite';
await bundle({
  entryPoints: ['src/main/main.ts'],
  outfile: 'dist/main.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  external: ['electron', 'node:*'],
});
await bundle({
  entryPoints: ['src/main/preload.ts'],
  outfile: 'dist/preload.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
});
await build({
  base: './',
  plugins: [
    {
      name: 'grello-offline-editor-fonts',
      transform(code, id) {
        if (id.replaceAll('\\', '/').includes('/@excalidraw/excalidraw/dist/prod/'))
          return code.replace(
            /("ASSETS_FALLBACK_URL",)`https:[\s\S]*?\/dist\/prod\/`/g,
            '$1"grello://app/excalidraw/"'
          );
      },
    },
  ],
  build: { outDir: 'dist/renderer', emptyOutDir: true },
});

await mkdir('dist/renderer/excalidraw', { recursive: true });
await cp('node_modules/@excalidraw/excalidraw/dist/prod/fonts', 'dist/renderer/excalidraw/fonts', {
  recursive: true,
});
