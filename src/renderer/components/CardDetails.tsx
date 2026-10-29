import { useState } from 'react';
import {
  AlignLeft,
  Check,
  Copy,
  Archive,
  Trash2,
  CalendarDays,
  Tags,
  ListChecks,
  Plus,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import type { Card, State } from '../../shared/model';
import { Modal } from './Modal';
import { useAutosave } from '../hooks/useAutosave';
import type { Confirm, Dispatch } from './BoardView';
export function CardDetails({
  card,
  state,
  dispatch,
  confirm,
  onClose,
}: {
  card: Card;
  state: State;
  dispatch: Dispatch;
  confirm: Confirm;
  onClose: () => void;
}) {
  const initial = {
    title: card.title,
    description: card.description,
    labelIds: card.labelIds,
    due: card.due,
    completed: card.completed,
    checklist: card.checklist,
  };
  const {
    value: d,
    setValue,
    status,
    flush,
  } = useAutosave(initial, (patch) => dispatch({ type: 'card.update', id: card.id, patch }));
  const [item, setItem] = useState(''),
    [busy, setBusy] = useState(false),
    [destination, setDestination] = useState(card.columnId);
  const labels = state.labels.filter((l) => l.boardId === card.boardId),
    columns = state.columns.filter((c) => c.boardId === card.boardId),
    column = columns.find((c) => c.id === card.columnId);
  const done = d.checklist.filter((i) => i.done).length;
  async function close() {
    if (await flush()) onClose();
  }
  async function action(type: 'duplicate' | 'archive' | 'delete') {
    if (busy || !(await flush())) return;
    if (
      type === 'delete' &&
      !(await confirm(
        'Excluir este cartão?',
        'O cartão e seu checklist serão excluídos permanentemente. Para guardar e restaurar depois, escolha Arquivar.'
      ))
    )
      return;
    setBusy(true);
    const ok =
      type === 'duplicate'
        ? await dispatch({ type: 'card.duplicate', id: card.id })
        : type === 'archive'
          ? await dispatch({ type: 'card.archive', id: card.id, archived: true })
          : await dispatch({ type: 'card.delete', id: card.id });
    setBusy(false);
    if (ok) onClose();
  }
  return (
    <Modal title="Detalhes do cartão" onClose={() => void close()} wide>
      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-location">
            EM <strong>{column?.title}</strong>
          </div>
          <input
            className="title-input"
            aria-label="Título do cartão"
            value={d.title}
            maxLength={200}
            onChange={(e) => setValue({ ...d, title: e.target.value })}
          />
          {!d.title.trim() && <p className="inline-error">O título não pode ficar vazio.</p>}
          <label className={'complete-toggle ' + (d.completed ? 'checked' : '')}>
            <input
              type="checkbox"
              checked={d.completed}
              onChange={(e) => setValue({ ...d, completed: e.target.checked })}
            />
            <CheckCircle2 size={18} />
            {d.completed ? 'Cartão concluído' : 'Marcar como concluído'}
          </label>
          <label className="field section-field">
            <span>
              <AlignLeft size={18} />
              Descrição
            </span>
            <textarea
              aria-label="Descrição"
              rows={6}
              placeholder="Ideias, contexto e tudo o que você precisa lembrar…"
              value={d.description}
              maxLength={50000}
              onChange={(e) => setValue({ ...d, description: e.target.value })}
            />
          </label>
          <div className="section-field">
            <h3>
              <ListChecks size={18} />
              Checklist{' '}
              <span className="subtle">
                {done}/{d.checklist.length}
              </span>
            </h3>
            {d.checklist.length > 0 && (
              <div
                className="progress"
                aria-label={done + ' de ' + d.checklist.length + ' tarefas concluídas'}
              >
                <div style={{ width: (done / d.checklist.length) * 100 + '%' }} />
              </div>
            )}
            <div className="checklist">
              {d.checklist.map((i) => (
                <div className={'check-row ' + (i.done ? 'done' : '')} key={i.id}>
                  <input
                    aria-label={'Concluir ' + i.title}
                    type="checkbox"
                    checked={i.done}
                    onChange={(e) =>
                      setValue({
                        ...d,
                        checklist: d.checklist.map((x) =>
                          x.id === i.id ? { ...x, done: e.target.checked } : x
                        ),
                      })
                    }
                  />
                  <input
                    aria-label="Texto da tarefa"
                    value={i.title}
                    maxLength={200}
                    onChange={(e) =>
                      setValue({
                        ...d,
                        checklist: d.checklist.map((x) =>
                          x.id === i.id ? { ...x, title: e.target.value } : x
                        ),
                      })
                    }
                  />
                  <button
                    className="icon-button"
                    aria-label={'Excluir tarefa ' + i.title}
                    onClick={async () => {
                      if (
                        await confirm(
                          'Excluir esta tarefa?',
                          i.title + ' será removida permanentemente do checklist.'
                        )
                      )
                        setValue((v) => ({
                          ...v,
                          checklist: v.checklist.filter((x) => x.id !== i.id),
                        }));
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <form
              className="add-task"
              onSubmit={(e) => {
                e.preventDefault();
                if (item.trim()) {
                  setValue({
                    ...d,
                    checklist: [
                      ...d.checklist,
                      { id: crypto.randomUUID(), title: item.trim(), done: false },
                    ],
                  });
                  setItem('');
                }
              }}
            >
              <input
                aria-label="Nova tarefa do checklist"
                placeholder="Adicionar uma tarefa…"
                value={item}
                maxLength={200}
                onChange={(e) => setItem(e.target.value)}
              />
              <button
                className="icon-button bordered"
                aria-label="Adicionar tarefa"
                disabled={!item.trim() || d.checklist.length >= 500}
              >
                <Plus size={17} />
              </button>
            </form>
          </div>
        </div>
        <aside className="detail-aside">
          <div className="section-field">
            <h3>
              <CalendarDays size={17} />
              Prazo
            </h3>
            <input
              type="date"
              aria-label="Prazo"
              value={d.due ?? ''}
              onChange={(e) => setValue({ ...d, due: e.target.value || null })}
            />
            {d.due && (
              <button className="text-button" onClick={() => setValue({ ...d, due: null })}>
                Remover prazo
              </button>
            )}
          </div>
          <div className="section-field">
            <h3>
              <Tags size={17} />
              Etiquetas
            </h3>
            {labels.length === 0 ? (
              <p className="muted">Crie etiquetas no quadro para organizar seus cartões.</p>
            ) : (
              <div className="label-options">
                {labels.map((l) => (
                  <label className="label-option" key={l.id}>
                    <input
                      type="checkbox"
                      checked={d.labelIds.includes(l.id)}
                      onChange={(e) =>
                        setValue({
                          ...d,
                          labelIds: e.target.checked
                            ? [...d.labelIds, l.id]
                            : d.labelIds.filter((id) => id !== l.id),
                        })
                      }
                    />
                    <span
                      className="label-chip"
                      style={{ '--label-color': l.color } as React.CSSProperties}
                    >
                      <i />
                      {l.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="section-field">
            <h3>
              <ArrowRight size={17} />
              Mover cartão
            </h3>
            <select
              aria-label="Coluna de destino"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <div className="move-buttons">
              <button
                className="soft-button small"
                onClick={async () => {
                  if (await flush())
                    await dispatch({
                      type: 'card.move',
                      id: card.id,
                      columnId: destination,
                      beforeId:
                        state.cards.find(
                          (c) => c.columnId === destination && !c.archived && c.id !== card.id
                        )?.id ?? null,
                    });
                }}
              >
                Para o início
              </button>
              <button
                className="soft-button small"
                onClick={async () => {
                  if (await flush())
                    await dispatch({
                      type: 'card.move',
                      id: card.id,
                      columnId: destination,
                      beforeId: null,
                    });
                }}
              >
                Para o fim
              </button>
            </div>
          </div>
          <div className="detail-actions">
            <button
              className="soft-button"
              disabled={busy}
              onClick={() => void action('duplicate')}
            >
              <Copy size={16} />
              Duplicar cartão
            </button>
            <button className="soft-button" disabled={busy} onClick={() => void action('archive')}>
              <Archive size={16} />
              Arquivar cartão
            </button>
            <button
              className="text-button danger-text"
              disabled={busy}
              onClick={() => void action('delete')}
            >
              <Trash2 size={15} />
              Excluir permanentemente
            </button>
          </div>
        </aside>
      </div>
      <footer className="detail-footer">
        <span role="status" className={status === 'error' ? 'danger-text' : 'muted'}>
          {status === 'saved' ? (
            <>
              <Check size={14} />
              Alterações salvas
            </>
          ) : status === 'error' ? (
            'Não foi salvo. Corrija os campos e tente novamente.'
          ) : status === 'saving' ? (
            'Salvando…'
          ) : (
            'Alterações pendentes…'
          )}
        </span>
        {status === 'error' && (
          <button className="soft-button" onClick={() => void flush()}>
            Tentar salvar
          </button>
        )}
        <button className="primary" disabled={busy} onClick={() => void close()}>
          Concluir edição
        </button>
      </footer>
    </Modal>
  );
}
