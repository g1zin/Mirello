import { useState } from 'react';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Archive,
  Tags,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  AlignLeft,
  ListChecks,
  X,
  GripVertical,
} from 'lucide-react';
import type { Action, Board, Card, State } from '../../shared/model';
import { contrastInk } from '../styles/colors';
import { Empty } from './Modal';
import { Decorations } from './Decorations';
export type Dispatch = (a: Action) => Promise<boolean>;
export type Confirm = (title: string, message: string, destructive?: boolean) => Promise<boolean>;
const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};
export function dueStatus(card: Card): 'done' | 'overdue' | 'soon' | 'later' | 'none' {
  if (card.completed) return 'done';
  if (!card.due) return 'none';
  const day = today();
  if (card.due < day) return 'overdue';
  const next = new Date(day + 'T12:00:00');
  next.setDate(next.getDate() + 7);
  const end = [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-');
  return card.due <= end ? 'soon' : 'later';
}
export function QuickAdd({
  placeholder,
  onAdd,
  buttonLabel = 'Adicionar',
}: {
  placeholder: string;
  onAdd: (title: string) => Promise<boolean>;
  buttonLabel?: string;
}) {
  const [value, setValue] = useState(''),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className="add-button" onClick={() => setOpen(true)}>
        <Plus size={17} />
        {buttonLabel}
      </button>
    );
  return (
    <form
      className="quick-add"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim() || busy) return;
        setBusy(true);
        if (await onAdd(value.trim())) setValue('');
        setBusy(false);
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={200}
        required
      />
      <div className="row">
        <button className="primary small" disabled={busy || !value.trim()}>
          {buttonLabel}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Cancelar adição"
          onClick={() => {
            setValue('');
            setOpen(false);
          }}
        >
          <X size={17} />
        </button>
      </div>
    </form>
  );
}
export function BoardView({
  state,
  board,
  dispatch,
  openCard,
  editBoard,
  openLabels,
  openArchive,
  deleteColumn,
}: {
  state: State;
  board: Board;
  dispatch: Dispatch;
  openCard: (id: string) => void;
  editBoard: () => void;
  openLabels: () => void;
  openArchive: () => void;
  deleteColumn: (id: string) => void;
}) {
  const [search, setSearch] = useState(''),
    [label, setLabel] = useState(''),
    [due, setDue] = useState(''),
    [drag, setDrag] = useState<string | null>(null),
    [over, setOver] = useState<string | null>(null),
    [menu, setMenu] = useState<string | null>(null),
    [rename, setRename] = useState<{ id: string; title: string } | null>(null);
  const columns = state.columns.filter((c) => c.boardId === board.id),
    labels = state.labels.filter((l) => l.boardId === board.id),
    cards = state.cards.filter((c) => c.boardId === board.id && !c.archived);
  const normalized = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const visible = cards.filter(
    (c) =>
      (!search || normalized(c.title + ' ' + c.description).includes(normalized(search))) &&
      (!label || c.labelIds.includes(label)) &&
      (!due || (due === 'open' ? !c.completed : dueStatus(c) === due))
  );
  const filtered = !!(search || label || due);
  async function drop(columnId: string, beforeId: string | null) {
    if (drag) await dispatch({ type: 'card.move', id: drag, columnId, beforeId });
    setDrag(null);
    setOver(null);
  }
  return (
    <main
      className="workspace"
      style={
        {
          '--board-bg': board.background,
          '--board-accent': board.accent,
          '--accent-ink':
            state.settings.visualStyle === 'original' ? contrastInk(board.accent) : undefined,
        } as React.CSSProperties
      }
    >
      <Decorations region="cover" />
      <Decorations region="canvas" />
      <header className="board-header">
        <div>
          <div className="eyebrow">SEU ESPAÇO, SEU RITMO</div>
          <h1>{board.title}</h1>
          <p>
            {cards.length} {cards.length === 1 ? 'cartão' : 'cartões'} ·{' '}
            {cards.filter((c) => c.completed).length} concluídos
          </p>
        </div>
        <div className="row">
          <button className="soft-button" onClick={openArchive}>
            <Archive size={17} />
            Arquivados
          </button>
          <button
            className="icon-button bordered"
            aria-label="Configurações do quadro"
            onClick={editBoard}
          >
            <SlidersHorizontal size={19} />
          </button>
        </div>
      </header>
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Pesquisar cartões"
            placeholder="Pesquisar neste quadro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="icon-button"
              aria-label="Limpar pesquisa"
              onClick={() => setSearch('')}
            >
              <X size={15} />
            </button>
          )}
        </label>
        <div className="filters">
          <select
            aria-label="Filtrar por etiqueta"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          >
            <option value="">Todas as etiquetas</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por prazo"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          >
            <option value="">Todos os prazos</option>
            <option value="overdue">Atrasados</option>
            <option value="soon">Próximos 7 dias</option>
            <option value="later">Depois de 7 dias</option>
            <option value="none">Sem prazo</option>
            <option value="done">Concluídos</option>
            <option value="open">Não concluídos</option>
          </select>
          <button className="soft-button" onClick={openLabels}>
            <Tags size={16} />
            Etiquetas
          </button>
        </div>
      </div>
      {filtered && (
        <div className="filter-summary">
          {visible.length} {visible.length === 1 ? 'cartão encontrado' : 'cartões encontrados'}
          <button
            className="text-button"
            onClick={() => {
              setSearch('');
              setLabel('');
              setDue('');
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
      {columns.length === 0 && (
        <Empty title="Tudo começa com uma coluna">
          Crie etapas como “Ideias”, “Em andamento” e “Concluído”. Depois, adicione seus cartões.
        </Empty>
      )}
      <div className="kanban" aria-label="Colunas do quadro">
        {columns.map((column, index) => {
          const list = visible.filter((c) => c.columnId === column.id);
          return (
            <section
              key={column.id}
              className={'column ' + (over === column.id ? 'drop-target' : '')}
              aria-label={column.title}
              onDragOver={(e) => {
                if (drag) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setOver(column.id);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                void drop(column.id, null);
              }}
            >
              <div className="column-header">
                {rename?.id === column.id ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (
                        rename.title.trim() &&
                        (await dispatch({
                          type: 'column.update',
                          id: column.id,
                          title: rename.title,
                        }))
                      )
                        setRename(null);
                    }}
                  >
                    <input
                      autoFocus
                      aria-label="Novo nome da coluna"
                      value={rename.title}
                      maxLength={200}
                      onChange={(e) => setRename({ ...rename, title: e.target.value })}
                    />
                    <button className="text-button">Salvar nome</button>
                    <button type="button" className="text-button" onClick={() => setRename(null)}>
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <h2>
                      <span className={'column-dot dot-' + (index % 4)} />
                      {column.title}
                      <span className="count">{list.length}</span>
                    </h2>
                    <button
                      className="icon-button"
                      aria-label={'Opções da coluna ' + column.title}
                      aria-expanded={menu === column.id}
                      onClick={() => setMenu(menu === column.id ? null : column.id)}
                    >
                      <MoreHorizontal size={19} />
                    </button>
                  </>
                )}
              </div>
              {menu === column.id && (
                <div className="column-menu">
                  <button
                    onClick={() => {
                      setRename({ id: column.id, title: column.title });
                      setMenu(null);
                    }}
                  >
                    Renomear
                  </button>
                  <button
                    disabled={index === 0}
                    onClick={() => {
                      void dispatch({ type: 'column.move', id: column.id, offset: -1 });
                      setMenu(null);
                    }}
                  >
                    <ArrowLeft size={14} />
                    Mover à esquerda
                  </button>
                  <button
                    disabled={index === columns.length - 1}
                    onClick={() => {
                      void dispatch({ type: 'column.move', id: column.id, offset: 1 });
                      setMenu(null);
                    }}
                  >
                    <ArrowRight size={14} />
                    Mover à direita
                  </button>
                  <button
                    className="danger-text"
                    onClick={() => {
                      setMenu(null);
                      deleteColumn(column.id);
                    }}
                  >
                    Excluir coluna…
                  </button>
                </div>
              )}
              <div className="card-list">
                {list.map((card) => {
                  const selectedLabels = labels.filter((l) => card.labelIds.includes(l.id)),
                    checked = card.checklist.filter((i) => i.done).length,
                    status = dueStatus(card);
                  return (
                    <article
                      key={card.id}
                      className={
                        'card ' +
                        (drag === card.id ? 'dragging' : '') +
                        (card.completed ? ' is-complete' : '') +
                        (over === card.id ? ' drop-before' : '')
                      }
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', card.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDrag(card.id);
                      }}
                      onDragEnd={() => {
                        setDrag(null);
                        setOver(null);
                      }}
                      onDragOver={(e) => {
                        if (drag && drag !== card.id) {
                          e.preventDefault();
                          e.stopPropagation();
                          setOver(card.id);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void drop(column.id, card.id);
                      }}
                    >
                      <button
                        className="card-open"
                        aria-label={'Abrir cartão ' + card.title}
                        onClick={() => openCard(card.id)}
                      >
                        {selectedLabels.length > 0 && (
                          <div className="labels">
                            {selectedLabels.map((l) => (
                              <span
                                className="label-chip"
                                key={l.id}
                                style={{ '--label-color': l.color } as React.CSSProperties}
                              >
                                <i />
                                {l.title}
                              </span>
                            ))}
                          </div>
                        )}
                        <h3>
                          {card.completed && <Check size={15} />} {card.title}
                        </h3>
                        {card.description && <p className="card-excerpt">{card.description}</p>}
                        {(card.due || card.checklist.length > 0 || card.description) && (
                          <div className="card-meta">
                            {card.due && (
                              <span className={'due ' + status}>
                                <CalendarDays size={13} />
                                {new Date(card.due + 'T12:00:00').toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                                {status === 'overdue' ? ' · atrasado' : ''}
                                {status === 'done' ? ' · concluído' : ''}
                              </span>
                            )}
                            {card.checklist.length > 0 && (
                              <span
                                className={checked === card.checklist.length ? 'check-done' : ''}
                              >
                                <ListChecks size={14} />
                                {checked}/{card.checklist.length}
                              </span>
                            )}
                            {card.description && <AlignLeft size={14} aria-label="Com descrição" />}
                          </div>
                        )}
                      </button>
                      <span className="drag-grip" aria-hidden="true">
                        <GripVertical size={14} />
                      </span>
                    </article>
                  );
                })}
                {list.length === 0 && (
                  <div className="column-empty">
                    {filtered
                      ? 'Nenhum cartão neste filtro.'
                      : drag
                        ? 'Solte o cartão aqui'
                        : 'Espaço para o próximo passo.'}
                  </div>
                )}
              </div>
              <QuickAdd
                placeholder="Título do cartão"
                buttonLabel="Adicionar cartão"
                onAdd={(title) => dispatch({ type: 'card.create', columnId: column.id, title })}
              />
            </section>
          );
        })}
        <div className="new-column">
          <QuickAdd
            placeholder="Nome da coluna"
            buttonLabel="Adicionar coluna"
            onAdd={(title) => dispatch({ type: 'column.create', boardId: board.id, title })}
          />
        </div>
      </div>
      <footer className="board-footer">
        <span className="status-dot" />
        Um espaço tranquilo para fazer acontecer.
        <span>Arraste os cartões ou mova pelo painel de detalhes.</span>
      </footer>
    </main>
  );
}
