import { contrastInk } from '../styles/colors';
import { convertToExcalidrawElements, newElementWith } from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import type { State } from '../../shared/model';
export const cardSummary = (state: State, id: string) => {
  const card = state.cards.find((c) => c.id === id);
  if (!card) return 'Cartão indisponível\nO cartão original foi excluído.';
  const column = state.columns.find((c) => c.id === card.columnId);
  const title = card.title.length > 75 ? card.title.slice(0, 72) + '…' : card.title;
  return (
    title +
    '\n' +
    (column?.title || 'Sem coluna') +
    ' · ' +
    (card.completed ? 'Concluído' : 'Em aberto') +
    (card.archived ? '\nArquivado' : '')
  );
};
export function referenceElements(state: State, cardId: string, x: number, y: number) {
  const id = crypto.randomUUID();
  return convertToExcalidrawElements(
    [
      {
        id,
        type: 'rectangle',
        x,
        y,
        width: 330,
        height: 150,
        backgroundColor: '#dbeafe',
        strokeColor: '#375b82',
        fillStyle: 'solid',
        roughness: 0,
        roundness: { type: 3 },
        customData: { grelloKind: 'card', grelloCardId: cardId },
        link: 'grello-card:' + cardId,
        label: {
          text: cardSummary(state, cardId),
          fontSize: 17,
          fontFamily: 2,
          textAlign: 'left',
          verticalAlign: 'middle',
        },
      },
    ],
    { regenerateIds: false }
  );
}
export function noteElements(text: string, color: string, x: number, y: number) {
  return convertToExcalidrawElements(
    [
      {
        type: 'rectangle',
        id: crypto.randomUUID(),
        x,
        y,
        width: 250,
        height: 190,
        backgroundColor: color,
        strokeColor: color,
        fillStyle: 'solid',
        roughness: 0,
        customData: { grelloKind: 'note' },
        label: {
          text,
          strokeColor: contrastInk(color),
          fontSize: 20,
          fontFamily: 2,
          textAlign: 'left',
          verticalAlign: 'top',
        },
      },
    ],
    { regenerateIds: false }
  );
}
export function refreshReferences(
  elements: readonly ExcalidrawElement[],
  state: State
): OrderedExcalidrawElement[] | null {
  let changed = false;
  const next = elements.map((e) => {
    if (e.type !== 'text' || !e.containerId) return e;
    const container = elements.find((c) => c.id === e.containerId),
      id = container?.customData?.grelloCardId;
    if (!id) return e;
    const text = cardSummary(state, id);
    if (e.originalText === text) return e;
    changed = true;
    return newElementWith(e, { text, originalText: text });
  });
  return changed ? (next as OrderedExcalidrawElement[]) : null;
}
