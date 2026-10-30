import { lazy, Suspense } from 'react';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Plus,
  Settings,
  Leaf,
  Archive,
  ChevronUp,
  ChevronDown,
  Check,
  LoaderCircle,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';
import type { ImportPreview } from '../shared/model';
import { useAppearance } from './hooks/useAppearance';
import { Decorations } from './components/Decorations';
import { prepareClose } from './hooks/closeGuard';
import { useWorkspace } from './hooks/useWorkspace';
import { BoardView, type Confirm } from './components/BoardView';
import { Modal, Empty } from './components/Modal';
import { CardDetails } from './components/CardDetails';
import {
  SettingsPanel,
  BoardSettings,
  LabelsPanel,
  ArchivePanel,
  DeleteColumn,
} from './components/Panels';

const VisualEditor = lazy(() =>
  import('./visual/VisualEditor').then((m) => ({ default: m.VisualEditor }))
);
export function App() {
  const w = useWorkspace(),
    s = w.state;
  const [active, setActive] = useState<string>(() => localStorage.getItem('grello:board') || ''),
    [tab, setTab] = useState<'tasks' | 'visual'>('tasks'),
    [panel, setPanel] = useState(''),
    [cardId, setCardId] = useState(''),
    [columnId, setColumnId] = useState(''),
    [title, setTitle] = useState(''),
    [preview, setPreview] = useState<ImportPreview | null>(null);
  useEffect(
    () =>
      window.grello.onCloseRequested(async () => {
        const ok = await prepareClose();
        await w.waitForIdle();
        if (!ok)
          w.setError('Há alterações não salvas. Corrija os campos antes de fechar o Grello.');
        return ok;
      }),
    [w.waitForIdle]
  );
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    destructive: boolean;
    resolve: (v: boolean) => void;
  } | null>(null);
  const confirm: Confirm = (title, message, destructive = true) =>
    new Promise((resolve) => setConfirmation({ title, message, destructive, resolve }));
  const boards = s?.boards.filter((b) => !b.archived) ?? [];
  const board = boards.find((b) => b.id === active) ?? boards[0];
  const card = s?.cards.find((c) => c.id === cardId);
  useEffect(() => {
    if (board) {
      localStorage.setItem('grello:board', board.id);
      setActive(board.id);
    }
  }, [board?.id]);
  useAppearance(s?.settings);
  async function newBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !(await prepareClose())) return;
    if (await w.dispatch({ type: 'board.create', title })) {
      setPanel('');
      setTitle('');
      const r = await window.grello.load();
      if (r.ok) {
        w.accept(r.value);
        setActive(r.value.state.boards.at(-1)!.id);
      }
    }
  }
  if (!s)
    return (
      <div className="boot">
        <Leaf size={48} />
        <h1>Grello</h1>
        <p>{w.error || 'Preparando seu espaço…'}</p>
        {w.error && <button onClick={() => location.reload()}>Tentar novamente</button>}
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Decorations region="sidebar" />
        <div className="brand">
          <Decorations region="brand" />
          <div className="brand-mark">
            <Leaf size={24} />
          </div>
          <span>
            grello<span className="brand-period">.</span>
          </span>
        </div>
        <div className="personal-space">
          <span className="avatar">G</span>
          <div>
            <strong>Meu espaço</strong>
            <small>Pessoal · offline</small>
          </div>
          <span className="online-dot" title="Disponível offline" />
        </div>
        <div className="sidebar-label">ORGANIZAÇÃO</div>
        <div className="nav-caption">
          <LayoutDashboard size={17} />
          <span>Meus quadros</span>
          <span className="subtle">{boards.length}</span>
          <button
            className="icon-button"
            aria-label="Criar quadro"
            onClick={() => {
              setPanel('new');
              setTitle('');
            }}
          >
            <Plus size={17} />
          </button>
        </div>
        <nav className="board-nav" aria-label="Meus quadros">
          {boards.map((b) => (
            <button
              key={b.id}
              className={'board-link ' + (board?.id === b.id ? 'active' : '')}
              onClick={async () => {
                if (await prepareClose()) {
                  await w.waitForIdle();
                  setActive(b.id);
                }
              }}
            >
              <i style={{ background: b.accent }} />
              <span>{b.title}</span>
              {board?.id === b.id && <ArrowRight size={14} />}
            </button>
          ))}
          {boards.length === 0 && <p className="sidebar-hint">Seus quadros vão aparecer aqui.</p>}
          <button
            className="new-board"
            onClick={() => {
              setPanel('new');
              setTitle('');
            }}
          >
            <Plus size={16} />
            Novo quadro
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>Um passo de cada vez.</span>
            <p>
              Organize o que importa.
              <br />
              Abra espaço para o resto.
            </p>
            <Leaf size={28} />
          </div>
          <button className="sidebar-action" onClick={() => setPanel('archive')}>
            <Archive size={17} />
            Itens arquivados
          </button>
          <button
            className="sidebar-action"
            onClick={async () => {
              if (await prepareClose()) {
                await w.waitForIdle();
                setPanel('settings');
              }
            }}
          >
            <Settings size={17} />
            Configurações
          </button>
          <div className="save-status" role="status" aria-live="polite">
            {w.pending ? (
              <>
                <LoaderCircle size={13} className="spin" />
                Salvando…
              </>
            ) : w.error ? (
              <>
                <AlertCircle size={13} />
                Verifique a mensagem de erro
              </>
            ) : (
              <>
                <Check size={13} />
                {tab === 'visual'
                  ? 'Salvamento indicado no quadro visual'
                  : w.saved
                    ? 'Alterações salvas'
                    : 'Tudo salvo neste computador'}
              </>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        {w.error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{w.error}</span>
            <button
              className="icon-button"
              aria-label="Dispensar erro"
              onClick={() => w.setError('')}
            >
              <X size={17} />
            </button>
          </div>
        )}
        {board ? (
          <BoardView
            tabs={
              <div className="board-tabs" role="tablist" aria-label="Visão do quadro">
                <button
                  role="tab"
                  aria-selected={tab === 'tasks'}
                  onClick={async () => {
                    if (tab !== 'tasks' && (await prepareClose())) setTab('tasks');
                  }}
                >
                  Tarefas
                </button>
                <button
                  role="tab"
                  aria-selected={tab === 'visual'}
                  onClick={async () => {
                    if (tab !== 'visual' && (await prepareClose())) setTab('visual');
                  }}
                >
                  Quadro visual
                </button>
              </div>
            }
            visual={
              tab === 'visual' ? (
                <Suspense
                  fallback={<div className="visual-loading">Preparando seu quadro visual…</div>}
                >
                  <VisualEditor key={board.id} boardId={board.id} state={s} openCard={setCardId} />
                </Suspense>
              ) : undefined
            }
            key={board.id}
            state={s}
            board={board}
            dispatch={w.dispatch}
            openCard={setCardId}
            editBoard={async () => {
              if (await prepareClose()) setPanel('board');
            }}
            openLabels={() => setPanel('labels')}
            openArchive={() => setPanel('archive')}
            deleteColumn={(id) => {
              setColumnId(id);
              setPanel('delete-column');
            }}
          />
        ) : (
          <main className="welcome">
            <div className="welcome-badge">
              <Leaf size={38} />
            </div>
            <span className="eyebrow">BEM-VINDO AO SEU ESPAÇO</span>
            <h1>
              Menos coisas na cabeça.
              <br />
              Mais espaço para suas ideias.
            </h1>
            <p>
              Reúna planos, tarefas e pequenos projetos em quadros.
              <br />
              Tudo no seu computador, no seu ritmo.
            </p>
            <button
              className="primary"
              onClick={() => {
                setPanel('new');
                setTitle('');
              }}
            >
              <Plus size={18} />
              Criar meu primeiro quadro
            </button>
            <button
              className="text-button"
              onClick={() => void w.run(() => window.grello.demo(), w.accept)}
            >
              Explorar um quadro de demonstração
            </button>
            <div className="welcome-features">
              <span>✓ Sem contas</span>
              <span>✓ Funciona offline</span>
              <span>✓ Seus dados com você</span>
            </div>
          </main>
        )}
      </div>
      {panel === 'new' && (
        <Modal title="Um novo espaço para organizar" onClose={() => setPanel('')}>
          <p className="muted">
            Dê um nome ao seu quadro. Pode ser um projeto, uma área da vida ou sua semana.
          </p>
          <form onSubmit={newBoard}>
            <label className="field">
              Nome do quadro
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Minha semana"
                maxLength={200}
                required
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="soft-button" onClick={() => setPanel('')}>
                Cancelar
              </button>
              <button className="primary" disabled={!title.trim() || w.pending > 0}>
                <Plus size={16} />
                Criar quadro
              </button>
            </div>
          </form>
        </Modal>
      )}
      {card && (
        <CardDetails
          key={card.id}
          card={card}
          state={s}
          dispatch={w.dispatch}
          confirm={confirm}
          onClose={() => setCardId('')}
        />
      )}
      {panel === 'settings' && (
        <SettingsPanel
          error={w.error}
          state={s}
          dispatch={w.dispatch}
          run={w.run}
          accept={w.accept}
          onClose={() => setPanel('')}
          onImport={setPreview}
        />
      )}
      {panel === 'board' && board && (
        <BoardSettings
          board={board}
          dispatch={w.dispatch}
          confirm={confirm}
          onClose={() => setPanel('')}
        />
      )}
      {panel === 'labels' && board && (
        <LabelsPanel
          state={s}
          boardId={board.id}
          dispatch={w.dispatch}
          confirm={confirm}
          onClose={() => setPanel('')}
        />
      )}
      {panel === 'archive' && (
        <ArchivePanel
          state={s}
          dispatch={w.dispatch}
          confirm={confirm}
          onClose={() => setPanel('')}
        />
      )}
      {panel === 'delete-column' && (
        <DeleteColumn state={s} id={columnId} dispatch={w.dispatch} onClose={() => setPanel('')} />
      )}
      {preview && (
        <Modal title="Importar seus dados" onClose={() => setPreview(null)}>
          <p>
            Arquivo validado:{' '}
            <strong>
              {preview.boards} quadros, {preview.columns} colunas e {preview.cards} cartões.
            </strong>
          </p>
          <p className="muted">
            {preview.legacy
              ? 'Este JSON contém tarefas. Os quadros importados terão um quadro visual vazio.'
              : `${preview.visualBoards} quadros visuais e ${preview.assets} imagens locais no arquivo.`}
          </p>
          <div className="import-choice">
            <h3>Mesclar</h3>
            <p>
              Adiciona cópias dos quadros importados com novos identificadores. Preserva seus
              quadros atuais e seu tema. Importar o mesmo arquivo novamente cria novas cópias.
            </p>
            <button
              className="primary"
              disabled={w.pending > 0}
              onClick={async () => {
                if (
                  (await prepareClose()) &&
                  (await w.run(() => window.grello.importFile(preview.token, 'merge'), w.accept))
                )
                  setPreview(null);
              }}
            >
              Mesclar dados
            </button>
          </div>
          <div className="import-choice">
            <h3>Substituir</h3>
            <p>
              Troca todos os dados e preferências pelos do arquivo. Um backup completo dos dados
              atuais será criado antes da troca.
            </p>
            <button
              className="danger"
              disabled={w.pending > 0}
              onClick={async () => {
                if (
                  await confirm(
                    'Substituir todos os dados?',
                    'Os quadros atuais serão substituídos pelos do arquivo. Seus dados atuais ficarão em um backup automático.'
                  )
                ) {
                  if (
                    (await prepareClose()) &&
                    (await w.run(
                      () => window.grello.importFile(preview.token, 'replace'),
                      w.accept
                    ))
                  ) {
                    setPreview(null);
                    setActive('');
                    setTab('tasks');
                  }
                }
              }}
            >
              Substituir com backup
            </button>
          </div>
        </Modal>
      )}
      {confirmation && (
        <Modal
          title={confirmation.title}
          onClose={() => {
            confirmation.resolve(false);
            setConfirmation(null);
          }}
        >
          <p className="confirm-message">{confirmation.message}</p>
          <div className="modal-actions">
            <button
              autoFocus
              className="soft-button"
              onClick={() => {
                confirmation.resolve(false);
                setConfirmation(null);
              }}
            >
              Cancelar
            </button>
            <button
              className={confirmation.destructive ? 'danger' : 'primary'}
              onClick={() => {
                confirmation.resolve(true);
                setConfirmation(null);
              }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
