import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
// All main/preload code and renderer dependencies are bundled by build.mjs.
// The staging manifest deliberately has no runtime node_modules to discover or ship.
const project = resolve('.'),
  stage = resolve('.package-app');
if (stage !== join(project, '.package-app') || !stage.startsWith(project + sep))
  throw Error('Unexpected package staging directory.');
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
for (const folder of ['dist', 'assets'])
  await cp(join(project, folder), join(stage, folder), { recursive: true });
const source = JSON.parse(await readFile('package.json', 'utf8'));
const manifest = Object.fromEntries(
  ['name', 'version', 'description', 'author', 'license', 'main', 'homepage'].map((key) => [
    key,
    source[key],
  ])
);
await writeFile(join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared bundled application for local packaging: ' + source.version);
