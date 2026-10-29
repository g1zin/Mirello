import { useState } from 'react';
import type { State } from '../../shared/model';
import { Modal } from './Modal';
import type { Dispatch } from './BoardView';
export function DeleteColumn({
  state,
  id,
  dispatch,
  onClose,
}: {
  state: State;
  id: string;
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const column = state.columns.find((c) => c.id === id)!,
    cards = state.cards.filter((c) => c.columnId === id),
    options = state.columns.filter((c) => c.boardId === column.boardId && c.id !== id);
  const [destination, setDestination] = useState(options[0]?.id ?? ''),
    [busy, setBusy] = useState(false);
  return (
    <Modal title={'Excluir coluna “' + column.title + '”?'} onClose={onClose}>
      {cards.length > 0 ? (
        <>
          <p>
            Esta coluna tem <strong>{cards.length} cartões, incluindo arquivados</strong>. Eles
            serão movidos para o fim da coluna escolhida, mantendo conteúdo e situação de
            arquivamento. Nenhum cartão será excluído.
          </p>
          {options.length ? (
            <label className="field">
              Mover todos os cartões para
              <select
                aria-label="Destino dos cartões da coluna"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="inline-error">
              Crie outra coluna neste quadro antes de excluir esta. Seus cartões precisam de um
              destino.
            </p>
          )}
        </>
      ) : (
        <p>Esta coluna está vazia e será excluída permanentemente.</p>
      )}
      <div className="modal-actions">
        <button className="soft-button" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="danger"
          disabled={busy || (cards.length > 0 && !destination)}
          onClick={async () => {
            setBusy(true);
            if (
              await dispatch({
                type: 'column.delete',
                id,
                destinationId: cards.length ? destination : null,
              })
            )
              onClose();
            setBusy(false);
          }}
        >
          Confirmar exclusão da coluna
        </button>
      </div>
    </Modal>
  );
}
