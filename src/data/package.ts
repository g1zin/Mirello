import { zipSync, Unzip, UnzipInflate, strToU8, strFromU8 } from 'fflate';
import { z } from 'zod';
import { assetName, sha256, verifyImage } from './images';
import {
  parseVisualDocument,
  validateBundle,
  visualDocument,
  visualLimits,
  type VisualBundle,
} from '../shared/visual';
const entrySchema = z
  .object({
    path: z.string(),
    bytes: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const manifestSchema = z
  .object({
    format: z.literal('grello-package'),
    version: z.literal(1),
    files: z.array(entrySchema).max(501),
  })
  .strict();
const allowed = (name: string) =>
  name === 'manifest.json' ||
  name === 'data.json' ||
  /^assets\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(name);
const maxFile = (name: string) =>
  name === 'manifest.json'
    ? 256 * 1024
    : name === 'data.json'
      ? 25 * 1024 * 1024
      : visualLimits.storedImageBytes;
export type PackageData = { bundle: VisualBundle; files: Map<string, Uint8Array> };
export function encodePackage(
  input: VisualBundle,
  readAsset: (id: string) => Uint8Array
): Uint8Array {
  const bundle = validateBundle(input),
    entries: Record<string, Uint8Array> = {
      'data.json': strToU8(JSON.stringify(visualDocument(bundle))),
    };
  // Check declared totals before reading resources into memory.
  if (
    entries['data.json'].length > maxFile('data.json') ||
    entries['data.json'].length + bundle.assets.reduce((n, a) => n + a.bytes, 0) >
      visualLimits.unpackedBytes
  )
    throw Error('Os dados excedem os limites do pacote.');
  for (const a of bundle.assets) {
    const bytes = readAsset(a.id);
    verifyImage(bytes, a);
    entries['assets/' + assetName(a)] = bytes;
  }
  const files = Object.entries(entries).map(([path, bytes]) => ({
    path,
    bytes: bytes.length,
    sha256: sha256(bytes),
  }));
  if (
    files.some((f) => f.bytes > maxFile(f.path)) ||
    files.reduce((s, f) => s + f.bytes, 0) > visualLimits.unpackedBytes
  )
    throw Error('Os dados excedem os limites do pacote.');
  entries['manifest.json'] = strToU8(
    JSON.stringify({ format: 'grello-package', version: 1, files })
  );
  const packed = zipSync(entries, { level: 6 });
  if (packed.length > visualLimits.packageBytes) throw Error('O pacote excede 100 MB.');
  return packed;
}
// Inspect the central directory before decompressing. Reject ZIP64, encryption, descriptors,
// duplicate names, unknown files, directory entries, absolute paths and inconsistent local headers.
function preflight(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--)
    if (b.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (
    end < 0 ||
    end + 22 + b.readUInt16LE(end + 20) !== b.length ||
    b.readUInt16LE(end + 4) !== 0 ||
    b.readUInt16LE(end + 6) !== 0
  )
    throw Error('Pacote ZIP inválido.');
  const count = b.readUInt16LE(end + 10),
    start = b.readUInt32LE(end + 16),
    size = b.readUInt32LE(end + 12);
  if (count < 2 || count > 502 || b.readUInt16LE(end + 8) !== count || start + size !== end)
    throw Error('Estrutura de pacote inválida.');
  const names = new Map<string, number>();
  let offset = start,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || b.readUInt32LE(offset) !== 0x02014b50)
      throw Error('Diretório do pacote inválido.');
    const flags = b.readUInt16LE(offset + 8),
      method = b.readUInt16LE(offset + 10),
      compressed = b.readUInt32LE(offset + 20),
      unpacked = b.readUInt32LE(offset + 24),
      len = b.readUInt16LE(offset + 28),
      extra = b.readUInt16LE(offset + 30),
      comment = b.readUInt16LE(offset + 32),
      local = b.readUInt32LE(offset + 42);
    const name = b.toString('utf8', offset + 46, offset + 46 + len);
    if (
      (flags & ~2048) !== 0 ||
      ![0, 8].includes(method) ||
      !allowed(name) ||
      names.has(name) ||
      unpacked > maxFile(name) ||
      local + 30 > start
    )
      throw Error('Arquivo inesperado ou excessivo no pacote.');
    if (
      b.readUInt32LE(local) !== 0x04034b50 ||
      b.readUInt16LE(local + 6) !== flags ||
      b.readUInt16LE(local + 8) !== method ||
      b.readUInt32LE(local + 18) !== compressed ||
      b.readUInt32LE(local + 22) !== unpacked
    )
      throw Error('Cabeçalhos de pacote inconsistentes.');
    const ll = b.readUInt16LE(local + 26),
      le = b.readUInt16LE(local + 28);
    if (
      b.toString('utf8', local + 30, local + 30 + ll) !== name ||
      local + 30 + ll + le + compressed > start
    )
      throw Error('Caminho inválido no pacote.');
    total += unpacked;
    if (total > visualLimits.unpackedBytes) throw Error('O pacote descompactado excede 250 MB.');
    names.set(name, unpacked);
    offset += 46 + len + extra + comment;
  }
  if (offset !== end || !names.has('manifest.json') || !names.has('data.json'))
    throw Error('Pacote incompleto.');
  return names;
}
export function decodePackage(bytes: Uint8Array): PackageData {
  if (bytes.length > visualLimits.packageBytes) throw Error('O pacote excede 100 MB.');
  const names = preflight(bytes),
    files = new Map<string, Uint8Array>(),
    seen = new Set<string>();
  let failure: Error | undefined,
    total = 0;
  const unzip = new Unzip((file) => {
    if (!names.has(file.name) || seen.has(file.name)) {
      failure = Error('Entrada inesperada no pacote.');
      return;
    }
    seen.add(file.name);
    const chunks: Uint8Array[] = [];
    let length = 0;
    file.ondata = (err, chunk, final) => {
      if (err) {
        failure = err;
        return;
      }
      if (failure) return;
      length += chunk.length;
      total += chunk.length;
      if (
        length !== Math.min(length, names.get(file.name)!) ||
        total > visualLimits.unpackedBytes
      ) {
        failure = Error('Descompactação excedeu o limite.');
        file.terminate();
        return;
      }
      chunks.push(chunk);
      if (final) {
        if (length !== names.get(file.name)) {
          failure = Error('Tamanho de entrada inconsistente.');
          return;
        }
        const joined = new Uint8Array(length);
        let at = 0;
        for (const c of chunks) {
          joined.set(c, at);
          at += c.length;
        }
        files.set(file.name, joined);
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let i = 0; i < bytes.length && !failure; i += 1024)
    unzip.push(bytes.subarray(i, i + 1024), i + 1024 >= bytes.length);
  if (failure) throw failure;
  if (files.size !== names.size) throw Error('Pacote truncado.');
  const manifest = manifestSchema.parse(JSON.parse(strFromU8(files.get('manifest.json')!)));
  if (
    new Set(manifest.files.map((f) => f.path)).size !== manifest.files.length ||
    manifest.files.length !== files.size - 1
  )
    throw Error('Manifesto inconsistente.');
  for (const f of manifest.files) {
    const data = files.get(f.path);
    if (f.path === 'manifest.json' || !data || f.bytes !== data.length || f.sha256 !== sha256(data))
      throw Error('Arquivo corrompido no pacote.');
  }
  const bundle = parseVisualDocument(JSON.parse(strFromU8(files.get('data.json')!)));
  const expected = new Set([
    'data.json',
    'manifest.json',
    ...bundle.assets.map((a) => 'assets/' + assetName(a)),
  ]);
  if (files.size !== expected.size || [...files.keys()].some((p) => !expected.has(p)))
    throw Error('Recursos inesperados no pacote.');
  for (const a of bundle.assets) {
    const data = files.get('assets/' + assetName(a));
    if (!data) throw Error('Imagem ausente.');
    verifyImage(data, a);
  }
  return {
    bundle,
    files: new Map(bundle.assets.map((a) => [a.id, files.get('assets/' + assetName(a))!])),
  };
}
