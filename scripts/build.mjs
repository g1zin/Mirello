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
await build({ base: './', build: { outDir: 'dist/renderer', emptyOutDir: true } });
