import { useState } from 'react';
import { AppearanceSettings } from './AppearanceSettings';
import { Download, Upload, FolderOpen, ShieldCheck, Leaf, Check } from 'lucide-react';
import type { State, Snapshot, ImportPreview, Reply } from '../../shared/model';
import { Modal } from './Modal';
import type { Dispatch } from './BoardView';
import { accents } from '../styles/palette';
type Run = <T>(op: () => Promise<Reply<T>>, success?: (value: T) => void) => Promise<boolean>;
export function SettingsPanel({
  error,
  state,
  dispatch,
  run,
  accept,
  onClose,
  onImport,
}: {
  error: string;
  state: State;
  dispatch: Dispatch;
  run: Run;
  accept: (s: Snapshot) => void;
  onClose: () => void;
  onImport: (p: ImportPreview) => void;
}) {
  const [note, setNote] = useState(''),
    [busy, setBusy] = useState(false);
  async function task(fn: () => Promise<Reply<boolean>>, message: string) {
    setBusy(true);
    setNote('');
    await run(fn, (result) => {
      if (result) setNote(message);
    });
    setBusy(false);
  }
  return (
    <Modal title="Do seu jeito" onClose={onClose}>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <p className="muted">Um espaço confortável para organizar suas ideias.</p>
      <section className="settings-section">
        <h3>Aparência</h3>
        <AppearanceSettings settings={state.settings} dispatch={dispatch} />
        <label className="field">
          Cor de destaque do estilo Original
          <div className="color-picker">
            {accents.map((color) => (
              <button
                key={color}
                style={{ background: color }}
                className="color-swatch"
                aria-label={'Cor ' + color}
                aria-pressed={state.settings.accent === color}
                onClick={() => void dispatch({ type: 'settings.update', patch: { accent: color } })}
              >
                {state.settings.accent === color && <Check size={17} />}
              </button>
            ))}
            <input
              type="color"
              aria-label="Cor de destaque personalizada"
              value={state.settings.accent}
              onChange={(e) =>
                void dispatch({ type: 'settings.update', patch: { accent: e.target.value } })
              }
            />
          </div>
        </label>
      </section>
      <section className="settings-section">
        <h3>
          <ShieldCheck size={18} />
          Seus dados, com você
        </h3>
        <p className="muted">
          Seus quadros, desenhos e imagens são salvos automaticamente neste computador. O pacote
          .grello inclui as imagens. Guarde uma exportação em outro local para ter uma cópia extra.
        </p>
        <div className="settings-buttons">
          <button
            className="soft-button"
            disabled={busy}
            onClick={() =>
              void task(() => window.grello.exportFile(), 'Exportação salva com sucesso.')
            }
          >
            <Download size={17} />
            Exportar pacote completo
          </button>
          <button
            className="soft-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await run(
                () => window.grello.previewImport(),
                (p) => {
                  if (p) onImport(p);
                }
              );
              setBusy(false);
            }}
          >
            <Upload size={17} />
            Importar dados
          </button>
          <button
            className="soft-button"
            disabled={busy}
            onClick={() => void task(() => window.grello.backup(), 'Backup criado com sucesso.')}
          >
            <ShieldCheck size={17} />
            Criar backup agora
          </button>
          <button
            className="soft-button"
            disabled={busy}
            onClick={() =>
              void task(() => window.grello.openFolder('backups'), 'Pasta de backups aberta.')
            }
          >
            <FolderOpen size={17} />
            Abrir pasta de backups
          </button>
          <button
            className="soft-button"
            disabled={busy}
            onClick={() =>
              void task(() => window.grello.openFolder('data'), 'Pasta de dados aberta.')
            }
          >
            <FolderOpen size={17} />
            Abrir pasta de dados
          </button>
        </div>
        <p className="muted small-text">
          Antes de substituir dados ou atualizar o banco, o Grello cria um backup. Os backups
          permanecem neste computador; copie os mais importantes para outro local.
        </p>
        <p className="muted small-text">
          Para restaurar um backup: feche o Grello, guarde uma cópia da pasta de dados e substitua
          grello.sqlite e a pasta assets pelas cópias contidas na pasta .grello-backup. Backups
          antigos .sqlite restauram somente os dados anteriores ao quadro visual. Veja o README.
        </p>
      </section>
      <section className="settings-section">
        <h3>
          <Leaf size={18} />
          Um pouco de inspiração
        </h3>
        <p className="muted">
          Adicione um quadro separado com exemplos. Seus quadros atuais são preservados.
        </p>
        <button
          className="soft-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            if (await run(() => window.grello.demo(), accept))
              setNote('Quadro de demonstração adicionado.');
            setBusy(false);
          }}
        >
          Adicionar demonstração
        </button>
      </section>
      {note && (
        <p className="success-note" role="status">
          {note}
        </p>
      )}
      <div className="about">
        Grello · versão 1.2.0
        <br />
        Feito para organizar o seu cotidiano.
      </div>
    </Modal>
  );
}
