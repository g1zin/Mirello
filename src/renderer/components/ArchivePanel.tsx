import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { State } from '../../shared/model';
import { Modal, Empty } from './Modal';
import type { Dispatch, Confirm } from './BoardView';
export function ArchivePanel({
  state,
  dispatch,
  confirm,
  onClose,
}: {
  state: State;
  dispatch: Dispatch;
  confirm: Confirm;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const boards = state.boards.filter(
      (b) => b.archived && b.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    ),
    cards = state.cards.filter(
      (c) => c.archived && c.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    );
  return (
    <Modal title="Itens arquivados" onClose={onClose}>
      <p className="muted">Uma pausa, não um ponto final. Restaure quando precisar.</p>
      <input
        className="full-width"
        aria-label="Pesquisar arquivados"
        placeholder="Pesquisar itens arquivados…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {boards.length + cards.length === 0 && (
        <Empty title={search ? 'Nenhum resultado' : 'Nada arquivado por aqui'}>
          {search ? 'Tente buscar outro nome.' : 'Os quadros e cartões arquivados aparecerão aqui.'}
        </Empty>
      )}
      {boards.length > 0 && <h3 className="archive-heading">Quadros</h3>}
      {boards.map((b) => (
        <div className="archive-row" key={b.id}>
          <div>
            <strong>{b.title}</strong>
            <small>
              {state.cards.filter((c) => c.boardId === b.id).length} cartões preservados
            </small>
          </div>
          <button
            className="soft-button small"
            onClick={() =>
              void dispatch({ type: 'board.update', id: b.id, patch: { archived: false } })
            }
          >
            <RotateCcw size={14} />
            Restaurar quadro
          </button>
        </div>
      ))}
      {cards.length > 0 && <h3 className="archive-heading">Cartões</h3>}
      {cards.map((c) => {
        const b = state.boards.find((b) => b.id === c.boardId)!;
        return (
          <div className="archive-row" key={c.id}>
            <div>
              <strong>{c.title}</strong>
              <small>
                {b.title} · {state.columns.find((x) => x.id === c.columnId)?.title}
                {b.archived ? ' (restaure o quadro para ver o cartão)' : ''}
              </small>
            </div>
            <div className="row">
              <button
                className="soft-button small"
                onClick={() => void dispatch({ type: 'card.archive', id: c.id, archived: false })}
              >
                <RotateCcw size={14} />
                Restaurar
              </button>
              <button
                className="icon-button danger-text"
                aria-label={'Excluir permanentemente ' + c.title}
                onClick={async () => {
                  if (
                    await confirm(
                      'Excluir cartão permanentemente?',
                      'O cartão “' +
                        c.title +
                        '” e seu checklist serão excluídos. Esta ação não pode ser desfeita.'
                    )
                  )
                    await dispatch({ type: 'card.delete', id: c.id });
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        );
      })}
    </Modal>
  );
}
