import { randomUUID } from 'node:crypto';
import { actionSchema, validateState, type Action, type State } from '../shared/model';
const uuid = () => randomUUID();
function find<T extends { id: string }>(list: T[], id: string): T {
  const x = list.find((i) => i.id === id);
  if (!x) throw new Error('Este item não existe mais. Atualize a janela.');
  return x;
}
function shift<T extends { id: string }>(list: T[], id: string, offset: number) {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) throw new Error('Item inexistente.');
  const j = i + offset;
  if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
}
export function applyAction(input: State, raw: Action): State {
  const a = actionSchema.parse(raw),
    s = structuredClone(input);
  switch (a.type) {
    case 'board.create':
      s.boards.push({
        id: uuid(),
        title: a.title,
        accent: s.settings.accent,
        background: '#eef2ef',
        archived: false,
      });
      break;
    case 'board.update':
      Object.assign(find(s.boards, a.id), a.patch);
      break;
    case 'board.move': {
      const visible = s.boards.filter((b) => !b.archived);
      shift(visible, a.id, a.offset);
      s.boards = [...visible, ...s.boards.filter((b) => b.archived)];
      break;
    }
    case 'column.create':
      find(s.boards, a.boardId);
      s.columns.push({ id: uuid(), boardId: a.boardId, title: a.title });
      break;
    case 'column.update':
      find(s.columns, a.id).title = a.title;
      break;
    case 'column.move': {
      const col = find(s.columns, a.id),
        subset = s.columns.filter((c) => c.boardId === col.boardId);
      shift(subset, a.id, a.offset);
      s.columns = [...s.columns.filter((c) => c.boardId !== col.boardId), ...subset];
      break;
    }
    case 'column.delete': {
      const col = find(s.columns, a.id),
        cards = s.cards.filter((c) => c.columnId === col.id);
      if (a.destinationId === col.id) throw new Error('Escolha outra coluna.');
      if (a.destinationId) {
        const dest = find(s.columns, a.destinationId);
        if (dest.boardId !== col.boardId) throw new Error('Escolha uma coluna deste quadro.');
        for (const c of cards) c.columnId = dest.id;
      } else if (cards.length) throw new Error('Mova os cartões antes de excluir esta coluna.');
      const movedIds = new Set(cards.map((c) => c.id));
      s.cards = [...s.cards.filter((c) => !movedIds.has(c.id)), ...cards];
      s.columns = s.columns.filter((c) => c.id !== col.id);
      break;
    }
    case 'card.create': {
      const col = find(s.columns, a.columnId);
      s.cards.push({
        id: uuid(),
        boardId: col.boardId,
        columnId: col.id,
        title: a.title,
        description: '',
        labelIds: [],
        due: null,
        completed: false,
        checklist: [],
        archived: false,
      });
      break;
    }
    case 'card.update':
      Object.assign(find(s.cards, a.id), a.patch);
      break;
    case 'card.move': {
      const card = find(s.cards, a.id),
        col = find(s.columns, a.columnId);
      if (col.boardId !== card.boardId) throw new Error('Escolha uma coluna deste quadro.');
      if (a.beforeId === a.id) break;
      s.cards = s.cards.filter((c) => c.id !== card.id);
      card.columnId = col.id;
      if (a.beforeId) {
        const before = find(s.cards, a.beforeId);
        if (before.columnId !== col.id || before.archived) throw new Error('Posição inválida.');
        s.cards.splice(s.cards.indexOf(before), 0, card);
      } else s.cards.push(card);
      break;
    }
    case 'card.duplicate': {
      const c = structuredClone(find(s.cards, a.id));
      c.id = uuid();
      c.title = (c.title + ' (cópia)').slice(0, 200);
      c.checklist = c.checklist.map((i) => ({ ...i, id: uuid() }));
      c.archived = false;
      s.cards.push(c);
      break;
    }
    case 'card.archive':
      find(s.cards, a.id).archived = a.archived;
      break;
    case 'card.delete':
      find(s.cards, a.id);
      s.cards = s.cards.filter((c) => c.id !== a.id);
      break;
    case 'label.create':
      find(s.boards, a.boardId);
      s.labels.push({ id: uuid(), boardId: a.boardId, title: a.title, color: a.color });
      break;
    case 'label.update':
      Object.assign(find(s.labels, a.id), { title: a.title, color: a.color });
      break;
    case 'label.delete':
      find(s.labels, a.id);
      s.labels = s.labels.filter((l) => l.id !== a.id);
      for (const c of s.cards) c.labelIds = c.labelIds.filter((id) => id !== a.id);
      break;
    case 'settings.update':
      Object.assign(s.settings, a.patch);
      break;
  }
  return validateState(s);
}
export function mergeStates(current: State, source: State): State {
  const next = structuredClone(source),
    map = new Map<string, string>();
  for (const e of [
    ...next.boards,
    ...next.columns,
    ...next.labels,
    ...next.cards,
    ...next.cards.flatMap((c) => c.checklist),
  ])
    map.set(e.id, uuid());
  for (const b of next.boards) {
    b.id = map.get(b.id)!;
    b.title = (b.title + ' (importado)').slice(0, 200);
  }
  for (const c of next.columns) {
    c.id = map.get(c.id)!;
    c.boardId = map.get(c.boardId)!;
  }
  for (const l of next.labels) {
    l.id = map.get(l.id)!;
    l.boardId = map.get(l.boardId)!;
  }
  for (const c of next.cards) {
    c.id = map.get(c.id)!;
    c.boardId = map.get(c.boardId)!;
    c.columnId = map.get(c.columnId)!;
    c.labelIds = c.labelIds.map((id) => map.get(id)!);
    for (const i of c.checklist) i.id = map.get(i.id)!;
  }
  return validateState({
    boards: [...current.boards, ...next.boards],
    columns: [...current.columns, ...next.columns],
    cards: [...current.cards, ...next.cards],
    labels: [...current.labels, ...next.labels],
    settings: current.settings,
  });
}
