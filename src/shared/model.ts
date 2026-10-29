import { z } from 'zod';
import { appearanceDefaults } from './appearance';
export const idSchema = z.uuid();
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const title = z.string().trim().min(1, 'Informe um título.').max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z');
    return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
  }, 'Data inválida.');
export const boardSchema = z
  .object({
    id: idSchema,
    title,
    accent: colorSchema,
    background: colorSchema,
    archived: z.boolean(),
  })
  .strict();
export const columnSchema = z.object({ id: idSchema, boardId: idSchema, title }).strict();
export const labelSchema = z
  .object({ id: idSchema, boardId: idSchema, title, color: colorSchema })
  .strict();
export const checkSchema = z.object({ id: idSchema, title, done: z.boolean() }).strict();
export const cardSchema = z
  .object({
    id: idSchema,
    boardId: idSchema,
    columnId: idSchema,
    title,
    description: z.string().max(50000),
    labelIds: z.array(idSchema).max(100),
    due: date.nullable(),
    completed: z.boolean(),
    checklist: z.array(checkSchema).max(500),
    archived: z.boolean(),
  })
  .strict();
export const settingsSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']),
    accent: colorSchema,
    visualStyle: z.enum(['original', 'sky-cherry']).default(appearanceDefaults.visualStyle),
    decorationIntensity: z
      .number()
      .int()
      .min(0)
      .max(100)
      .default(appearanceDefaults.decorationIntensity),
    decorativeAnimations: z.boolean().default(appearanceDefaults.decorativeAnimations),
  })
  .strict();
export const stateSchema = z
  .object({
    boards: z.array(boardSchema).max(1000),
    columns: z.array(columnSchema).max(10000),
    cards: z.array(cardSchema).max(50000),
    labels: z.array(labelSchema).max(10000),
    settings: settingsSchema,
  })
  .strict();
export type Board = z.infer<typeof boardSchema>;
export type Column = z.infer<typeof columnSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Label = z.infer<typeof labelSchema>;
export type State = z.infer<typeof stateSchema>;
export const emptyState = (): State => ({
  boards: [],
  columns: [],
  cards: [],
  labels: [],
  settings: { theme: 'system', accent: '#347568', ...appearanceDefaults },
});
export function validateState(input: unknown): State {
  const s = stateSchema.parse(input),
    ids = new Set<string>();
  for (const e of [
    ...s.boards,
    ...s.columns,
    ...s.cards,
    ...s.labels,
    ...s.cards.flatMap((c) => c.checklist),
  ]) {
    if (ids.has(e.id)) throw new Error('Há identificadores repetidos no arquivo.');
    ids.add(e.id);
  }
  const boards = new Map(s.boards.map((b) => [b.id, b])),
    cols = new Map(s.columns.map((c) => [c.id, c])),
    labels = new Map(s.labels.map((l) => [l.id, l]));
  for (const x of [...s.columns, ...s.labels])
    if (!boards.has(x.boardId)) throw new Error('Um item aponta para um quadro inexistente.');
  for (const c of s.cards) {
    if (!boards.has(c.boardId) || cols.get(c.columnId)?.boardId !== c.boardId)
      throw new Error('Um cartão aponta para uma coluna inválida.');
    if (
      new Set(c.labelIds).size !== c.labelIds.length ||
      c.labelIds.some((id) => labels.get(id)?.boardId !== c.boardId)
    )
      throw new Error('Um cartão contém etiquetas inválidas.');
  }
  return s;
}

export const exportSchema = z
  .object({
    format: z.literal('grello'),
    version: z.literal(2),
    exportedAt: z.iso.datetime(),
    data: stateSchema,
  })
  .strict();
const legacyExportSchema = z
  .object({
    format: z.literal('grello'),
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    data: stateSchema.extend({ settings: settingsSchema.pick({ theme: true, accent: true }) }),
  })
  .strict();
export function parseExport(input: unknown): State {
  return validateState(
    z.discriminatedUnion('version', [legacyExportSchema, exportSchema]).parse(input).data
  );
}
export function exportData(state: State) {
  return {
    format: 'grello',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: validateState(state),
  };
}
// No defaults on patches: changing mode must never reset style or decoration preferences.
const settingsPatchSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']),
    accent: colorSchema,
    visualStyle: z.enum(['original', 'sky-cherry']),
    decorationIntensity: z.number().int().min(0).max(100),
    decorativeAnimations: z.boolean(),
  })
  .partial()
  .strict();

const patchCard = cardSchema
  .pick({
    title: true,
    description: true,
    labelIds: true,
    due: true,
    completed: true,
    checklist: true,
  })
  .partial()
  .strict();
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('board.create'), title }),
  z.object({
    type: z.literal('board.update'),
    id: idSchema,
    patch: boardSchema
      .pick({ title: true, accent: true, background: true, archived: true })
      .partial()
      .strict(),
  }),
  z.object({
    type: z.literal('board.move'),
    id: idSchema,
    offset: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.object({ type: z.literal('column.create'), boardId: idSchema, title }),
  z.object({ type: z.literal('column.update'), id: idSchema, title }),
  z.object({
    type: z.literal('column.move'),
    id: idSchema,
    offset: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.object({ type: z.literal('column.delete'), id: idSchema, destinationId: idSchema.nullable() }),
  z.object({ type: z.literal('card.create'), columnId: idSchema, title }),
  z.object({ type: z.literal('card.update'), id: idSchema, patch: patchCard }),
  z.object({
    type: z.literal('card.move'),
    id: idSchema,
    columnId: idSchema,
    beforeId: idSchema.nullable(),
  }),
  z.object({ type: z.literal('card.duplicate'), id: idSchema }),
  z.object({ type: z.literal('card.archive'), id: idSchema, archived: z.boolean() }),
  z.object({ type: z.literal('card.delete'), id: idSchema }),
  z.object({ type: z.literal('label.create'), boardId: idSchema, title, color: colorSchema }),
  z.object({ type: z.literal('label.update'), id: idSchema, title, color: colorSchema }),
  z.object({ type: z.literal('label.delete'), id: idSchema }),
  z.object({ type: z.literal('settings.update'), patch: settingsPatchSchema }),
]);
export type Action = z.infer<typeof actionSchema>;
export type Snapshot = { state: State; revision: number };
export type ImportPreview = { token: string; boards: number; cards: number; columns: number };
export type Reply<T> = { ok: true; value: T } | { ok: false; error: string };
export interface Bridge {
  onVisibilityChanged(callback: (visible: boolean) => void): () => void;
  onCloseRequested(callback: () => Promise<boolean>): () => void;
  load(): Promise<Reply<Snapshot>>;
  dispatch(action: Action): Promise<Reply<Snapshot>>;
  exportFile(): Promise<Reply<boolean>>;
  previewImport(): Promise<Reply<ImportPreview | null>>;
  importFile(token: string, mode: 'merge' | 'replace'): Promise<Reply<Snapshot>>;
  openFolder(which: 'data' | 'backups'): Promise<Reply<boolean>>;
  backup(): Promise<Reply<boolean>>;
  demo(): Promise<Reply<Snapshot>>;
}
