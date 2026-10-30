import { z } from 'zod';
import { idSchema, validateState, exportData, parseExport, type State } from './model';

export const visualLimits = {
  elements: 10000,
  sceneBytes: 12 * 1024 * 1024,
  imageBytes: 10 * 1024 * 1024,
  storedImageBytes: 20 * 1024 * 1024,
  pixels: 24000000,
  dimension: 8192,
  assets: 500,
  packageBytes: 100 * 1024 * 1024,
  unpackedBytes: 250 * 1024 * 1024,
} as const;
const finite = z.number().finite().min(-10000000).max(10000000);
export const canvasId = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const color = z.string().regex(/^(#[0-9a-fA-F]{3,8}|transparent)$/);
const binding = z
  .object({
    elementId: canvasId,
    focus: z.number().finite(),
    gap: z.number().finite(),
    fixedPoint: z.tuple([z.number().finite(), z.number().finite()]).nullable().optional(),
  })
  .strict()
  .nullable();
const point = z.tuple([finite, finite]);
// The allowlist deliberately excludes embeds, frames, remote links and arbitrary custom data.
export const visualElementSchema = z
  .object({
    id: canvasId,
    type: z.enum(['rectangle', 'ellipse', 'diamond', 'text', 'line', 'arrow', 'freedraw', 'image']),
    x: finite,
    y: finite,
    width: z.number().finite().min(0).max(1000000),
    height: z.number().finite().min(0).max(1000000),
    angle: z.number().finite(),
    strokeColor: color,
    backgroundColor: color,
    fillStyle: z.enum(['hachure', 'cross-hatch', 'solid', 'zigzag']),
    strokeWidth: z.number().finite().min(0).max(100),
    strokeStyle: z.enum(['solid', 'dashed', 'dotted']),
    roughness: z.number().finite().min(0).max(5),
    opacity: z.number().min(0).max(100),
    seed: z.number().int(),
    version: z.number().int().min(1),
    versionNonce: z.number().int(),
    isDeleted: z.boolean(),
    groupIds: z.array(canvasId).max(100),
    frameId: z.null(),
    index: z.string().max(128).nullable().optional(),
    roundness: z
      .object({ type: z.number().int(), value: z.number().finite().optional() })
      .strict()
      .nullable(),
    boundElements: z
      .array(z.object({ id: canvasId, type: z.enum(['text', 'arrow']) }).strict())
      .max(10000)
      .nullable(),
    updated: z.number().finite(),
    link: z
      .string()
      .regex(/^grello-card:[0-9a-f-]{36}$/i)
      .nullable(),
    locked: z.boolean(),
    customData: z
      .object({
        grelloCardId: idSchema.optional(),
        grelloKind: z.enum(['note', 'card']).optional(),
      })
      .strict()
      .optional(),
    text: z.string().max(50000).optional(),
    originalText: z.string().max(50000).optional(),
    fontSize: z.number().finite().min(1).max(1000).optional(),
    fontFamily: z.number().int().min(1).max(9).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
    containerId: canvasId.nullable().optional(),
    autoResize: z.boolean().optional(),
    lineHeight: z.number().finite().min(0.1).max(10).optional(),
    points: z.array(point).max(50000).optional(),
    pressures: z.array(z.number().finite().min(0).max(1)).max(50000).optional(),
    simulatePressure: z.boolean().optional(),
    lastCommittedPoint: point.nullable().optional(),
    startBinding: binding.optional(),
    endBinding: binding.optional(),
    startArrowhead: z
      .enum([
        'arrow',
        'bar',
        'dot',
        'circle',
        'circle_outline',
        'triangle',
        'triangle_outline',
        'diamond',
        'diamond_outline',
        'crowfoot_one',
        'crowfoot_many',
        'crowfoot_one_or_many',
      ])
      .nullable()
      .optional(),
    endArrowhead: z
      .enum([
        'arrow',
        'bar',
        'dot',
        'circle',
        'circle_outline',
        'triangle',
        'triangle_outline',
        'diamond',
        'diamond_outline',
        'crowfoot_one',
        'crowfoot_many',
        'crowfoot_one_or_many',
      ])
      .nullable()
      .optional(),
    elbowed: z.boolean().optional(),
    fixedSegments: z
      .array(z.object({ index: z.number().int(), start: point, end: point }).strict())
      .max(10000)
      .nullable()
      .optional(),
    startIsSpecial: z.boolean().nullable().optional(),
    endIsSpecial: z.boolean().nullable().optional(),
    fileId: idSchema.nullable().optional(),
    status: z.enum(['pending', 'saved', 'error']).optional(),
    scale: z.tuple([z.number().finite(), z.number().finite()]).optional(),
    crop: z
      .object({
        x: finite,
        y: finite,
        width: finite,
        height: finite,
        naturalWidth: finite,
        naturalHeight: finite,
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    if (
      e.type === 'text' &&
      (e.text === undefined || e.fontSize === undefined || e.containerId === undefined)
    )
      ctx.addIssue({ code: 'custom', message: 'Texto incompleto.' });
    if (['freedraw', 'arrow', 'line'].includes(e.type) && !e.points)
      ctx.addIssue({ code: 'custom', message: 'Traço incompleto.' });
    if (e.type === 'image' && !e.fileId)
      ctx.addIssue({ code: 'custom', message: 'Imagem sem recurso local.' });
    if (e.link && !e.customData?.grelloCardId)
      ctx.addIssue({ code: 'custom', message: 'Link sem referência de cartão.' });
    if (e.link && !idSchema.safeParse(e.link.slice(12)).success)
      ctx.addIssue({ code: 'custom', message: 'Referência inválida.' });
    if (e.customData?.grelloCardId && e.link !== 'grello-card:' + e.customData.grelloCardId)
      ctx.addIssue({ code: 'custom', message: 'Vínculo de cartão inconsistente.' });
  });
export type VisualElement = z.infer<typeof visualElementSchema>;
export const sceneSchema = z
  .object({
    boardId: idSchema,
    version: z.literal(1),
    elements: z.array(visualElementSchema).max(visualLimits.elements),
    view: z
      .object({ scrollX: finite, scrollY: finite, zoom: z.number().finite().min(0.1).max(30) })
      .strict(),
  })
  .strict();
export type VisualScene = z.infer<typeof sceneSchema>;
export const emptyScene = (boardId: string): VisualScene => ({
  boardId,
  version: 1,
  elements: [],
  view: { scrollX: 0, scrollY: 0, zoom: 1 },
});
export const assetSchema = z
  .object({
    id: idSchema,
    mime: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    bytes: z.number().int().positive().max(visualLimits.storedImageBytes),
    width: z.number().int().positive().max(visualLimits.dimension),
    height: z.number().int().positive().max(visualLimits.dimension),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .refine((a) => a.width * a.height <= visualLimits.pixels, 'Imagem muito grande.');
export type VisualAsset = z.infer<typeof assetSchema>;
export type VisualBundle = { tasks: State; visuals: VisualScene[]; assets: VisualAsset[] };
export function validateScene(input: unknown, tasks: State, assets: VisualAsset[]): VisualScene {
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > visualLimits.sceneBytes)
    throw Error('O quadro visual excede o limite de 12 MB.');
  const scene = sceneSchema.parse(input);
  if (!tasks.boards.some((b) => b.id === scene.boardId)) throw Error('Quadro visual sem projeto.');
  const ids = new Set(scene.elements.map((e) => e.id));
  if (ids.size !== scene.elements.length) throw Error('Elementos visuais com IDs repetidos.');
  const resources = new Set(assets.map((a) => a.id));
  let points = 0;
  for (const e of scene.elements) {
    points += e.points?.length || 0;
    if (points > 250000) throw Error('O quadro visual excede o limite de pontos de desenho.');
    const refs = [
      ...(e.boundElements?.map((b) => b.id) || []),
      e.containerId,
      e.startBinding?.elementId,
      e.endBinding?.elementId,
    ].filter(Boolean);
    if (refs.some((id) => !ids.has(id!)))
      throw Error('Conexão visual aponta para elemento ausente.');
    if (e.fileId && !resources.has(e.fileId)) throw Error('Imagem local não encontrada.');
    const card = tasks.cards.find((c) => c.id === e.customData?.grelloCardId);
    if (card && card.boardId !== scene.boardId) throw Error('O cartão pertence a outro quadro.');
  }
  return scene;
}
export function validateBundle(bundle: VisualBundle): VisualBundle {
  const tasks = validateState(bundle.tasks),
    assets = z.array(assetSchema).max(visualLimits.assets).parse(bundle.assets);
  const taskIds = new Set(
    [
      ...tasks.boards,
      ...tasks.columns,
      ...tasks.cards,
      ...tasks.labels,
      ...tasks.cards.flatMap((c) => c.checklist),
    ].map((e) => e.id)
  );
  if (assets.some((a) => taskIds.has(a.id)))
    throw Error('Um recurso reutiliza o ID de uma tarefa.');
  if (new Set(assets.map((a) => a.id)).size !== assets.length)
    throw Error('Recursos com IDs repetidos.');
  if (
    bundle.visuals.length > tasks.boards.length ||
    new Set(bundle.visuals.map((v) => v.boardId)).size !== bundle.visuals.length
  )
    throw Error('Quadros visuais duplicados.');
  return { tasks, assets, visuals: bundle.visuals.map((v) => validateScene(v, tasks, assets)) };
}
export function visualDocument(bundle: VisualBundle) {
  const b = validateBundle(bundle);
  return { ...exportData(b.tasks), version: 3 as const, visuals: b.visuals, assets: b.assets };
}
const documentSchema = z
  .object({
    format: z.literal('grello'),
    version: z.literal(3),
    exportedAt: z.iso.datetime(),
    data: z.unknown(),
    visuals: z.array(sceneSchema).max(1000),
    assets: z.array(assetSchema).max(visualLimits.assets),
  })
  .strict();
export function parseVisualDocument(input: unknown): VisualBundle {
  if ((input as { version?: number })?.version !== 3)
    return { tasks: parseExport(input), visuals: [], assets: [] };
  const d = documentSchema.parse(input);
  return validateBundle({ tasks: validateState(d.data), visuals: d.visuals, assets: d.assets });
}
