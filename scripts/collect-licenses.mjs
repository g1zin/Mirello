import fs from 'node:fs';
import path from 'node:path';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const packages = new Map();
function packageRoot(name, from = path.resolve('.')) {
  let dir = from;
  while (true) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) throw Error('Missing dependency ' + name);
    dir = parent;
  }
}
function collect(name, runtime = false, from = path.resolve('.')) {
  const root = packageRoot(name, from),
    p = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const key = name + '@' + p.version;
  const previous = packages.get(key);
  if (previous) {
    previous.runtime ||= runtime;
    return;
  }
  const files = fs
    .readdirSync(root)
    .filter((n) => /^(licen[sc]e(?:[-.][a-z0-9]+)*|notice(?:\.txt)?|copying)$/i.test(n));
  if (!files.length) {
    const fallback =
      name === '@excalidraw/excalidraw'
        ? 'excalidraw-LICENSE.txt'
        : name.startsWith('@radix-ui/')
          ? 'radix-ui-LICENSE.txt'
          : name.replace(/^@/, '').replaceAll('/', '-') + '-LICENSE.txt';
    if (fs.existsSync(path.join('LICENSES', fallback)))
      files.push(path.resolve('LICENSES', fallback));
    else throw Error('License/NOTICE not found: ' + name + ' ' + p.version);
  }
  packages.set(key, {
    name,
    version: p.version,
    license:
      typeof p.license === 'string'
        ? p.license
        : p.licenses?.map((x) => x.type).join(' OR ') ||
          JSON.stringify(p.license) ||
          (fs
            .readFileSync(path.isAbsolute(files[0]) ? files[0] : path.join(root, files[0]), 'utf8')
            .includes('MIT License')
            ? 'MIT'
            : 'Ver texto integral'),
    runtime,
    root,
    files,
  });
  if (runtime)
    for (const dependency of Object.keys(p.dependencies || {})) collect(dependency, true, root);
}
Object.keys(pkg.dependencies).forEach((n) => collect(n, true));
Object.keys(pkg.devDependencies).forEach((n) => collect(n, false));
fs.mkdirSync('LICENSES', { recursive: true });
const rows = [];
for (const p of [...packages.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  for (const file of p.files) {
    const target =
      p.name.replace(/^@/, '').replaceAll('/', '-') +
      '-' +
      p.version +
      '-' +
      file.replace(/\.(md|txt)$/i, '') +
      '.txt';
    if (path.isAbsolute(file)) continue;
    fs.copyFileSync(path.join(p.root, file), path.join('LICENSES', target));
  }
  rows.push(
    '| ' +
      p.name +
      ' | ' +
      p.version +
      ' | ' +
      p.license +
      ' | ' +
      (p.name === 'electron'
        ? 'Runtime Electron'
        : p.runtime
          ? 'Aplicativo'
          : 'Desenvolvimento / empacotamento') +
      ' |'
  );
}
const content =
  '# Avisos de terceiros\n\nInventário da versão ' +
  pkg.version +
  ', coletado dos pacotes exatos instalados por npm ci. Textos completos em LICENSES. A licença do Grello está no arquivo LICENSE.\n\n| Pacote | Versão | Licença declarada | Uso |\n| --- | --- | --- | --- |\n' +
  rows.join('\n') +
  '\n\nFontes locais do editor: Assistant, Cascadia Code, Excalifont, Liberation Sans, Lilita One, Nunito, Virgil e Xiaolai (SIL OFL 1.1); Comic Shanns (MIT). Arquivos inalterados de @excalidraw/excalidraw 0.18.1; avisos e metadados em LICENSES/font-*.txt. A interface principal continua usando fontes do Windows sem redistribuir Segoe UI.\n' +
  '\n\nLucide inclui os avisos ISC e MIT/Feather no mesmo arquivo. Os avisos adicionais de Chromium e Node.js permanecem no LICENSES.chromium.html do runtime Electron; o LICENSE do Electron também é preservado.\n\nOs pacotes de desenvolvimento não são módulos chamados pelo usuário do aplicativo; seus avisos são conservados para transparência da cadeia de build.\n';
fs.writeFileSync('THIRD_PARTY_NOTICES.md', content);
console.log('Licenses collected for ' + packages.size + ' packages.');
