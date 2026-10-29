import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const git = (args, options = {}) =>
  execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024, ...options });
const findings = [];
const patterns = [
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ['OpenAI key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/g],
  ['AWS key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['Google API key', /\bAIza[A-Za-z0-9_-]{30,}\b/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['npm token', /\bnpm_[A-Za-z0-9]{30,}\b/g],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['Credential in URL', /https?:\/\/[^\s/:@]+:[^\s/@]+@/g],
  [
    'Private user path',
    /[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\\/\s"'<>]+|\/(?:Users|home)\/[^/\s"'<>]+/g,
  ],
  [
    'Literal credential',
    /(?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*['"][A-Za-z0-9/+_.=-]{24,}['"]/gi,
  ],
];
function check(buffer, label, filename) {
  const base = path.basename(filename);
  if (
    (/^\.env(?:$|\.)/i.test(base) && !/^\.env\.(?:example|sample)$/i.test(base)) ||
    /\.(?:sqlite(?:3)?|db(?:3)?|pem|key|p12|pfx)(?:-(?:wal|shm))?$/i.test(filename)
  )
    findings.push({ item: label, kind: 'Sensitive file type' });
  if (buffer.subarray(0, 16).equals(Buffer.from('SQLite format 3\0')))
    findings.push({ item: label, kind: 'SQLite database' });
  const content = buffer.toString('utf8');
  for (const [kind, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push({ item: label, kind });
  }
}
const tracked = git(['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
for (const file of tracked)
  if (fs.existsSync(file) && fs.statSync(file).isFile())
    check(fs.readFileSync(file), 'working tree: ' + file, file);
const objects = git(['rev-list', '--objects', '--all'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const i = line.indexOf(' ');
    return { id: i < 0 ? line : line.slice(0, i), name: i < 0 ? '' : line.slice(i + 1) };
  });
const refs = new Map(objects.map((o) => [o.id, o.name]));
const types = git(['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
  input: objects.map((o) => o.id).join('\n') + '\n',
  encoding: 'utf8',
})
  .trim()
  .split('\n');
let blobs = 0;
for (const line of types) {
  const [id, type] = line.split(' ');
  if (type !== 'blob') continue;
  const name = refs.get(id) || '';
  check(git(['cat-file', 'blob', id]), 'history: ' + id.slice(0, 8) + ' ' + name, name);
  blobs++;
}
const identities = git(['log', '--all', '--format=%ae%n%ce'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);
if (identities.some((email) => !/@users\.noreply\.github\.com$/i.test(email)))
  findings.push({
    item: 'Git commit identities',
    kind: 'Non-noreply author/committer email needs review',
  });
if (findings.length) {
  console.error(JSON.stringify({ passed: false, findings }, null, 2));
  process.exitCode = 1;
} else
  console.log(
    JSON.stringify(
      {
        passed: true,
        trackedFiles: tracked.length,
        historyBlobs: blobs,
        checks:
          'Credential patterns, private paths, database/file types and commit email identities. Manual review still required.',
      },
      null,
      2
    )
  );
