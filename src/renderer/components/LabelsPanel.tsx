import { useRef, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { State, Label } from '../../shared/model';
import { Modal } from './Modal';
import type { Dispatch, Confirm } from './BoardView';
import { useAutosave } from '../hooks/useAutosave';
import { accents } from '../styles/palette';
function LabelEditor({
  label,
  dispatch,
  confirm,
  register,
}: {
  label: Label;
  dispatch: Dispatch;
  confirm: Confirm;
  register: (id: string, fn: () => Promise<boolean>) => void;
}) {
  const {
    value: v,
    setValue,
    status,
    flush,
  } = useAutosave({ title: label.title, color: label.color }, (v) =>
    dispatch({ type: 'label.update', id: label.id, ...v })
  );
  register(label.id, flush);
  return (
    <div className="label-editor">
      <input
        type="color"
        aria-label={'Cor da etiqueta ' + label.title}
        value={v.color}
        onChange={(e) => setValue({ ...v, color: e.target.value })}
      />
      <input
        aria-label={'Nome da etiqueta ' + label.title}
        maxLength={200}
        value={v.title}
        onChange={(e) => setValue({ ...v, title: e.target.value })}
      />
      <span className="subtle" role="status">
        {status === 'error' ? 'Revise o nome' : status === 'saved' ? 'Salvo' : '…'}
      </span>
      <button
        className="icon-button"
        aria-label={'Excluir etiqueta ' + label.title}
        onClick={async () => {
          if (
            await confirm(
              'Excluir esta etiqueta?',
              'Ela será removida permanentemente deste quadro e de todos os cartões que a usam.'
            )
          ) {
            if (await flush()) await dispatch({ type: 'label.delete', id: label.id });
          }
        }}
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}
export function LabelsPanel({
  state,
  boardId,
  dispatch,
  confirm,
  onClose,
}: {
  state: State;
  boardId: string;
  dispatch: Dispatch;
  confirm: Confirm;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(''),
    [color, setColor] = useState(accents[0]),
    [busy, setBusy] = useState(false);
  const handlers = useRef(new Map<string, () => Promise<boolean>>()),
    labels = state.labels.filter((l) => l.boardId === boardId);
  async function close() {
    for (const l of labels) {
      if (!(await handlers.current.get(l.id)?.())) return;
    }
    onClose();
  }
  return (
    <Modal title="Etiquetas do quadro" onClose={() => void close()}>
      <p className="muted">
        Cores com significado. Use etiquetas para agrupar os cartões do seu jeito.
      </p>
      {labels.map((l) => (
        <LabelEditor
          key={l.id}
          label={l}
          dispatch={dispatch}
          confirm={confirm}
          register={(id, fn) => handlers.current.set(id, fn)}
        />
      ))}
      {labels.length === 0 && <p className="muted">Ainda não há etiquetas neste quadro.</p>}
      <form
        className="new-label"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || busy) return;
          setBusy(true);
          if (await dispatch({ type: 'label.create', boardId, title, color })) setTitle('');
          setBusy(false);
        }}
      >
        <h3>Nova etiqueta</h3>
        <div className="row">
          <input
            type="color"
            aria-label="Cor da nova etiqueta"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            placeholder="Ex.: Pessoal"
            aria-label="Nome da nova etiqueta"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className="primary" disabled={!title.trim() || busy}>
            <Plus size={16} />
            Criar
          </button>
        </div>
      </form>
      <footer className="modal-actions">
        <button className="primary" onClick={() => void close()}>
          Concluir
        </button>
      </footer>
    </Modal>
  );
}
