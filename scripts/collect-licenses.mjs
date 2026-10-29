import fs from 'node:fs';
import path from 'node:path';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const packages = new Map();
function collect(name, runtime = false) {
  const root = path.join('node_modules', name),
    p = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const previous = packages.get(name);
  if (previous) {
    previous.runtime ||= runtime;
    return;
  }
  const files = fs
    .readdirSync(root)
    .filter((n) => /^(license(?:\.md|\.txt)?|notice(?:\.txt)?|copying)$/i.test(n));
  if (!files.length) throw new Error('License/NOTICE not found: ' + name);
  packages.set(name, {
    name,
    version: p.version,
    license: typeof p.license === 'string' ? p.license : JSON.stringify(p.license),
    runtime,
    root,
    files,
  });
  if (runtime)
    for (const dependency of Object.keys(p.dependencies || {})) collect(dependency, true);
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
      file.replace(/\.(md|txt)$/i, '') +
      '.txt';
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
  '\n\nLucide inclui os avisos ISC e MIT/Feather no mesmo arquivo. Os avisos adicionais de Chromium e Node.js permanecem no LICENSES.chromium.html do runtime Electron; o LICENSE do Electron também é preservado.\n\nOs pacotes de desenvolvimento não são módulos chamados pelo usuário do aplicativo; seus avisos são conservados para transparência da cadeia de build.\n';
fs.writeFileSync('THIRD_PARTY_NOTICES.md', content);
console.log('Licenses collected for ' + packages.size + ' packages.');
