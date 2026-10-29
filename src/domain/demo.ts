import { applyAction } from './actions';
import { emptyState } from '../shared/model';
export function demoData() {
  let s = applyAction(emptyState(), {
    type: 'board.create',
    title: 'Um pouco de inspiração · demonstração',
  });
  const b = s.boards[0];
  for (const title of ['Ideias', 'Em andamento', 'Concluído'])
    s = applyAction(s, { type: 'column.create', boardId: b.id, title });
  s = applyAction(s, { type: 'label.create', boardId: b.id, title: 'Pessoal', color: '#347568' });
  s = applyAction(s, { type: 'label.create', boardId: b.id, title: 'Bem-estar', color: '#b77832' });
  for (const [index, title] of [
    'Planejar uma semana mais leve',
    'Um cantinho para minhas ideias',
    'Separar um tempo para ler',
    'Organizar o próximo projeto',
    'Pequenos passos, todos os dias',
  ].entries()) {
    s = applyAction(s, { type: 'card.create', columnId: s.columns[index % 3].id, title });
    const c = s.cards.at(-1)!;
    s = applyAction(s, {
      type: 'card.update',
      id: c.id,
      patch: {
        description:
          'Este é um cartão de demonstração. Abra, escreva e organize do seu jeito. Os exemplos ficam neste quadro separado.',
        labelIds: [s.labels[index % 2].id],
        completed: index % 3 === 2,
        checklist:
          index === 0
            ? [
                { id: crypto.randomUUID(), title: 'Escolher três prioridades', done: true },
                { id: crypto.randomUUID(), title: 'Reservar espaço para descansar', done: false },
              ]
            : [],
      },
    });
  }
  return s;
}
