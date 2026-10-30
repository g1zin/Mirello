import { createHash, randomUUID } from 'node:crypto';
import { imageSize } from 'image-size';
import { visualLimits, assetSchema, type VisualAsset } from '../shared/visual';
export const imageExtension = (mime: VisualAsset['mime']) =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })[mime];
export const assetName = (a: VisualAsset) => a.id + '.' + imageExtension(a.mime);
export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export function inspectImage(
  bytes: Uint8Array,
  id: string = randomUUID(),
  maxBytes: number = visualLimits.imageBytes
): VisualAsset {
  if (!bytes.length || bytes.length > maxBytes)
    throw Error('A imagem excede o limite de tamanho permitido.');
  const b = Buffer.from(bytes);
  const mime = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'image/png'
    : b[0] === 255 && b[1] === 216 && b[2] === 255
      ? 'image/jpeg'
      : b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
        ? 'image/webp'
        : null;
  if (!mime) throw Error('Use uma imagem PNG, JPEG ou WebP válida.');
  const size = imageSize(bytes);
  if (
    !size.width ||
    !size.height ||
    size.width > visualLimits.dimension ||
    size.height > visualLimits.dimension ||
    size.width * size.height > visualLimits.pixels
  )
    throw Error('A imagem deve ter até 8192 pixels por lado e 24 milhões de pixels.');
  return assetSchema.parse({
    id,
    mime,
    bytes: bytes.length,
    width: size.width,
    height: size.height,
    sha256: sha256(bytes),
  });
}
export function verifyImage(bytes: Uint8Array, meta: VisualAsset) {
  const actual = inspectImage(bytes, meta.id, visualLimits.storedImageBytes);
  if (JSON.stringify(actual) !== JSON.stringify(assetSchema.parse(meta)))
    throw Error('Imagem corrompida ou diferente do manifesto.');
}
