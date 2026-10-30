import { useState } from 'react';
import type { State } from '../../shared/model';
import { Modal } from '../components/Modal';
export function NoteDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (text: string, color: string) => void;
}) {
  const [text, setText] = useState('Uma nova ideia'),
    [color, setColor] = useState('#fff0b3');
  return (
    <Modal title="Nova nota adesiva" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onCreate(text, color);
        }}
      >
        <label className="field">
          Conteúdo
          <textarea
            aria-label="Conteúdo da nota"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={5000}
            rows={5}
          />
        </label>
        <label className="field">
          Cor da nota
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="soft-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={!text.trim()}>
            Adicionar nota
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function CardReferencePicker({
  state,
  boardId,
  onClose,
  onPick,
}: {
  state: State;
  boardId: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const cards = state.cards.filter(
    (c) =>
      c.boardId === boardId &&
      (c.title + ' ' + c.description)
        .toLocaleLowerCase('pt-BR')
        .includes(search.toLocaleLowerCase('pt-BR'))
  );
  return (
    <Modal title="Vincular cartão existente" onClose={onClose}>
      <p className="muted">
        Uma referência à tarefa original. Mover este elemento não muda sua coluna.
      </p>
      <label className="field">
        Pesquisar cartão
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Título ou descrição"
        />
      </label>
      <div className="visual-card-picker">
        {cards.map((c) => (
          <button className="visual-card-option" key={c.id} onClick={() => onPick(c.id)}>
            <strong>{c.title}</strong>
            <small>
              {state.columns.find((col) => col.id === c.columnId)?.title} ·{' '}
              {c.completed ? 'Concluído' : 'Em aberto'}
              {c.archived ? ' · Arquivado' : ''}
            </small>
          </button>
        ))}
        {cards.length === 0 && (
          <p className="muted">
            Nenhum cartão encontrado neste quadro. Crie cartões na aba Tarefas.
          </p>
        )}
      </div>
    </Modal>
  );
}
