import { ArrowUp, ArrowDown, Archive, Check } from 'lucide-react';
import type { Board } from '../../shared/model';
import { Modal } from './Modal';
import type { Dispatch, Confirm } from './BoardView';
import { useAutosave } from '../hooks/useAutosave';
import { accents, backgrounds } from '../styles/palette';
export function BoardSettings({
  board,
  dispatch,
  confirm,
  onClose,
}: {
  board: Board;
  dispatch: Dispatch;
  confirm: Confirm;
  onClose: () => void;
}) {
  const {
    value: v,
    setValue,
    status,
    flush,
  } = useAutosave(
    { title: board.title, accent: board.accent, background: board.background },
    (patch) => dispatch({ type: 'board.update', id: board.id, patch })
  );
  const close = async () => {
    if (await flush()) onClose();
  };
  return (
    <Modal title="Personalizar quadro" onClose={() => void close()}>
      <label className="field">
        Nome do quadro
        <input
          aria-label="Nome do quadro"
          value={v.title}
          maxLength={200}
          onChange={(e) => setValue({ ...v, title: e.target.value })}
        />
      </label>
      {document.documentElement.dataset.visualStyle === 'sky-cherry' && (
        <p className="appearance-note">
          As cores abaixo ficam guardadas para o estilo Original. Céu e Cerejeiras usa sua própria
          paleta.
        </p>
      )}
      <label className="field">
        Cor de destaque
        <div className="color-picker">
          {accents.map((color) => (
            <button
              key={color}
              className="color-swatch"
              style={{ background: color }}
              aria-label={'Destaque ' + color}
              aria-pressed={v.accent === color}
              onClick={() => setValue({ ...v, accent: color })}
            >
              {v.accent === color && <Check size={17} />}
            </button>
          ))}
          <input
            type="color"
            aria-label="Destaque personalizado do quadro"
            value={v.accent}
            onChange={(e) => setValue({ ...v, accent: e.target.value })}
          />
        </div>
      </label>
      <label className="field">
        Fundo do quadro
        <div className="color-picker">
          {backgrounds.map((color) => (
            <button
              key={color}
              className="color-swatch background-swatch"
              style={{ background: color }}
              aria-label={'Fundo ' + color}
              aria-pressed={v.background === color}
              onClick={() => setValue({ ...v, background: color })}
            >
              {v.background === color && <Check size={17} />}
            </button>
          ))}
          <input
            type="color"
            aria-label="Fundo personalizado do quadro"
            value={v.background}
            onChange={(e) => setValue({ ...v, background: e.target.value })}
          />
        </div>
      </label>
      <div className="settings-section">
        <h3>Posição na barra lateral</h3>
        <div className="row">
          <button
            className="soft-button"
            onClick={() => void dispatch({ type: 'board.move', id: board.id, offset: -1 })}
          >
            <ArrowUp size={16} />
            Subir
          </button>
          <button
            className="soft-button"
            onClick={() => void dispatch({ type: 'board.move', id: board.id, offset: 1 })}
          >
            <ArrowDown size={16} />
            Descer
          </button>
        </div>
      </div>
      <div className="settings-section">
        <h3>Guardar para depois</h3>
        <p className="muted">
          Arquivar guarda o quadro e todos os cartões. Você pode restaurá-lo em Itens arquivados.
        </p>
        <button
          className="soft-button"
          onClick={async () => {
            if (
              (await flush()) &&
              (await confirm(
                'Arquivar este quadro?',
                'O quadro sairá da barra lateral. Suas colunas e cartões serão preservados para restauração.',
                false
              )) &&
              (await dispatch({ type: 'board.update', id: board.id, patch: { archived: true } }))
            )
              onClose();
          }}
        >
          <Archive size={16} />
          Arquivar quadro
        </button>
      </div>
      <footer className="detail-footer">
        <span className="muted" role="status">
          {status === 'saved'
            ? 'Alterações salvas'
            : status === 'error'
              ? 'Revise o nome e tente salvar novamente.'
              : 'Salvando…'}
        </span>
        <button className="primary" onClick={() => void close()}>
          Concluir
        </button>
      </footer>
    </Modal>
  );
}
