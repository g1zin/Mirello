import { flushSync } from 'react-dom';
import { ZoomControls } from './ZoomControls';
import { imageSize } from 'image-size';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Excalidraw,
  MainMenu,
  convertToExcalidrawElements,
  CaptureUpdateAction,
  restoreElements,
} from '@excalidraw/excalidraw';
import type {
  AppState,
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement, FileId } from '@excalidraw/excalidraw/element/types';
import {
  ImagePlus,
  StickyNote,
  Link2,
  Maximize,
  Check,
  LoaderCircle,
  ClipboardPaste,
} from 'lucide-react';
import type { State } from '../../shared/model';
import type { VisualAsset, VisualScene } from '../../shared/visual';
import { guardClose } from '../hooks/closeGuard';
import { NoteDialog, CardReferencePicker } from './VisualDialogs';
import { useVisualSave } from './useVisualSave';
import { noteElements, referenceElements, refreshReferences } from './elements';
import '@excalidraw/excalidraw/index.css';
import '../styles/visual.css';

type Loaded = { scene: VisualScene; files: Record<string, BinaryFileData> };
export function VisualEditor({
  boardId,
  state,
  openCard,
}: {
  boardId: string;
  state: State;
  openCard: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );
  const [panel, setPanel] = useState<'note' | 'card' | null>(null),
    [selected, setSelected] = useState(''),
    [count, setCount] = useState(0),
    [zoom, setZoom] = useState(1),
    [busy, setBusy] = useState(false);
  const editorRef = useRef<ExcalidrawImperativeAPI | null>(api);
  editorRef.current = api;
  const stateRef = useRef(state);
  stateRef.current = state;
  const operations = useRef(Promise.resolve()),
    root = useRef<HTMLDivElement>(null),
    signature = useRef('');
  const save = useVisualSave(boardId, api, loaded?.scene || null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await window.grello.loadVisual(boardId);
      if (!r.ok) throw Error(r.error);
      const files: Record<string, BinaryFileData> = {};
      for (const asset of r.value.assets) {
        const file = await readFile(asset);
        files[asset.id] = file;
      }
      if (alive) {
        setLoaded({ scene: r.value.scene, files });
        setCount(r.value.scene.elements.filter((e) => !e.isDeleted).length);
        setError('');
      }
    })().catch((e) => {
      if (alive) setError(e.message);
    });
    return () => {
      alive = false;
    };
  }, [boardId, retry]);
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  useEffect(
    () =>
      guardClose(async () => {
        await operations.current;
        // Let React commit the final inserted image before taking the closing snapshot.
        await new Promise((resolve) => setTimeout(resolve, 30));
        return save.flush(true);
      }),
    [save.flush]
  );
  useEffect(() => {
    if (!api) return;
    const elements = refreshReferences(api.getSceneElementsIncludingDeleted(), state);
    if (elements) api.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER });
  }, [api, state]);
  async function readFile(asset: VisualAsset): Promise<BinaryFileData> {
    const r = await window.grello.readImage(asset.id);
    if (!r.ok) throw Error(r.error);
    return {
      id: asset.id as FileId,
      dataURL: r.value.dataURL as BinaryFileData['dataURL'],
      mimeType: asset.mime,
      created: Date.now(),
    };
  }
  function center() {
    const view = api!.getAppState();
    return {
      x: -view.scrollX + view.width / (2 * view.zoom.value) - 150,
      y: -view.scrollY + view.height / (2 * view.zoom.value) - 80,
    };
  }
  function insert(elements: ExcalidrawElement[]) {
    if (!api) return;
    flushSync(() =>
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), ...elements],
        appState: {
          selectedElementIds: Object.fromEntries(
            elements.filter((e) => e.type !== 'text').map((e) => [e.id, true])
          ),
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      })
    );
    api.setActiveTool({ type: 'selection' });
    root.current?.querySelector<HTMLElement>('.excalidraw')?.focus();
  }
  function operation(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    operations.current = operations.current
      .then(fn)
      .catch((e) => setError(e.message || 'Não foi possível adicionar a imagem.'))
      .finally(() => setBusy(false));
    return operations.current;
  }
  async function addAssets(assets: VisualAsset[], point?: { x: number; y: number }) {
    if (!api) return;
    let i = 0;
    for (const asset of assets) {
      const file = await readFile(asset);
      api.addFiles([file]);
      const p = point || center(),
        width = Math.min(480, asset.width),
        height = (width * asset.height) / asset.width;
      insert(
        convertToExcalidrawElements(
          [
            {
              type: 'image',
              id: crypto.randomUUID(),
              fileId: asset.id as FileId,
              x: p.x + i * 28,
              y: p.y + i * 28,
              width,
              height,
              status: 'saved',
              scale: [1, 1],
              crop: null,
            },
          ],
          { regenerateIds: false }
        )
      );
      i++;
    }
  }
  async function fileImages(files: File[], point?: { x: number; y: number }) {
    if (files.length > 20) throw Error('Adicione até 20 imagens de cada vez.');
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) throw Error('Cada imagem deve ter até 10 MB.');
      const input = new Uint8Array(await file.arrayBuffer()),
        header = imageSize(input);
      if (
        !['png', 'jpg', 'webp'].includes(header.type || '') ||
        !header.width ||
        !header.height ||
        header.width > 8192 ||
        header.height > 8192 ||
        header.width * header.height > 24000000
      )
        throw Error('Use PNG, JPEG ou WebP de até 8192 pixels por lado e 24 milhões de pixels.');
      const bitmap = await createImageBitmap(new Blob([input]));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height),
        context = canvas.getContext('2d');
      if (!context) {
        bitmap.close();
        throw Error('Não foi possível preparar a imagem.');
      }
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const png = await canvas.convertToBlob({ type: 'image/png' });
      if (png.size > 20 * 1024 * 1024) throw Error('A imagem convertida excede 20 MB.');
      const r = await window.grello.addImage(new Uint8Array(await png.arrayBuffer()));
      if (!r.ok) throw Error(r.error);
      await addAssets([r.value], point);
    }
  }
  const changed = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (
        ['frame', 'magicframe', 'embeddable', 'laser', 'image'].includes(appState.activeTool.type)
      ) {
        editorRef.current?.setActiveTool({ type: 'selection' });
        return;
      }
      const refreshed = refreshReferences(elements, stateRef.current);
      if (refreshed)
        editorRef.current?.updateScene({
          elements: refreshed,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      setZoom((old) => (old === appState.zoom.value ? old : appState.zoom.value));
      const selectedIds = appState.selectedElementIds;
      const ref =
        elements.find((e) => !e.isDeleted && selectedIds[e.id] && e.customData?.grelloCardId)
          ?.customData?.grelloCardId || '';
      setSelected((old) => (old === ref ? old : ref));
      setCount((old) => {
        const n = elements.filter((e) => !e.isDeleted).length;
        return old === n ? old : n;
      });
      // Pointer hover and selection changes do not schedule database writes.
      const key =
        elements.map((e) => e.id + ':' + e.version + ':' + e.versionNonce).join('|') +
        ':' +
        appState.scrollX +
        ':' +
        appState.scrollY +
        ':' +
        appState.zoom.value;
      if (signature.current !== key) {
        signature.current = key;
        save.changed();
      }
    },
    [save.changed]
  );
  const openSelected = () => {
    if (state.cards.some((c) => c.id === selected)) openCard(selected);
  };
  const fit = () =>
    api?.scrollToContent(undefined, {
      fitToViewport: true,
      animate: false,
      viewportZoomFactor: 0.85,
    });
  if (!loaded)
    return (
      <section className="visual-loading" role="status">
        {error ? (
          <>
            <p>{error}</p>
            <button className="soft-button" onClick={() => setRetry((n) => n + 1)}>
              Tentar novamente
            </button>
          </>
        ) : (
          'Preparando seu quadro visual…'
        )}
      </section>
    );
  return (
    <section className="visual-workspace" aria-label="Quadro visual">
      <div className="visual-toolbar" role="toolbar" aria-label="Referências do quadro visual">
        <button
          className="soft-button"
          disabled={!api || busy}
          onClick={() =>
            void operation(async () => {
              const r = await window.grello.pickImages();
              if (!r.ok) throw Error(r.error);
              await fileImages(
                r.value.map((file) => new File([new Uint8Array(file.bytes)], file.name))
              );
            })
          }
        >
          <ImagePlus size={16} />
          Imagem
        </button>
        <button
          className="soft-button"
          disabled={!api || busy}
          onClick={() =>
            void operation(async () => {
              const r = await window.grello.clipboardImage();
              if (!r.ok) throw Error(r.error);
              if (!r.value) throw Error('Copie uma imagem antes de colar.');
              await fileImages([new File([new Uint8Array(r.value.bytes)], r.value.name)]);
            })
          }
        >
          <ClipboardPaste size={16} />
          Colar imagem
        </button>
        <button
          className="soft-button"
          disabled={!api}
          onClick={() => {
            setPanel('note');
          }}
        >
          <StickyNote size={16} />
          Nota
        </button>
        <button
          className="soft-button"
          disabled={!api}
          onClick={() => {
            setPanel('card');
          }}
        >
          <Link2 size={16} />
          Vincular cartão
        </button>
        <button
          className="icon-button bordered"
          title="Enquadrar tudo (Shift+1)"
          aria-label="Enquadrar todo o conteúdo"
          disabled={!api}
          onClick={fit}
        >
          <Maximize size={17} />
        </button>
        <ZoomControls api={api} zoom={zoom} />
        {selected && (
          <button
            className="soft-button"
            disabled={!state.cards.some((c) => c.id === selected)}
            onClick={openSelected}
          >
            Abrir cartão
          </button>
        )}
        <span
          className={'visual-save ' + (save.status === 'error' ? 'danger-text' : '')}
          role="status"
        >
          {busy || save.status === 'saving' ? (
            <LoaderCircle size={14} className="spin" />
          ) : (
            <Check size={14} />
          )}{' '}
          {busy
            ? 'Adicionando imagem…'
            : save.status === 'pending'
              ? 'Alterações pendentes'
              : save.status === 'saving'
                ? 'Salvando…'
                : save.status === 'error'
                  ? 'Falha ao salvar'
                  : 'Quadro salvo'}
        </span>
      </div>
      {(error || save.error) && (
        <div className="visual-error" role="alert">
          <span>{error || save.error} Seu trabalho permanece nesta tela.</span>
          {save.error && (
            <button className="soft-button" onClick={() => void save.flush()}>
              Tentar salvar novamente
            </button>
          )}
          <button className="text-button" onClick={() => setError('')}>
            Dispensar
          </button>
        </div>
      )}
      <div
        className="visual-editor"
        ref={root}
        onDragOverCapture={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDropCapture={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            e.stopPropagation();
            const view = api?.getAppState();
            const point = view
              ? {
                  x: (e.clientX - view.offsetLeft) / view.zoom.value - view.scrollX,
                  y: (e.clientY - view.offsetTop) / view.zoom.value - view.scrollY,
                }
              : undefined;
            void operation(() => fileImages(Array.from(e.dataTransfer.files), point));
          }
        }}
        onPasteCapture={(e) => {
          if ((e.target as HTMLElement).closest('input,textarea,[contenteditable="true"]')) return;
          const files = Array.from(e.clipboardData.files);
          if (files.length) {
            e.preventDefault();
            e.stopPropagation();
            void operation(() => fileImages(files));
          }
        }}
      >
        <Excalidraw
          excalidrawAPI={setApi}
          initialData={{
            elements: restoreElements(loaded.scene.elements as ExcalidrawElement[], null),
            files: loaded.files,
            appState: {
              scrollX: loaded.scene.view.scrollX,
              scrollY: loaded.scene.view.scrollY,
              zoom: { value: loaded.scene.view.zoom as AppState['zoom']['value'] },
              viewBackgroundColor: '#f7f8fa',
              currentItemFontFamily: 2,
              currentItemRoughness: 0,
            },
          }}
          onChange={changed}
          onPointerDown={save.pointerDown}
          onPointerUp={save.pointerUp}
          theme={theme}
          langCode="pt-BR"
          name="Quadro visual"
          handleKeyboardGlobally={false}
          autoFocus={false}
          isCollaborating={false}
          validateEmbeddable={false}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              saveAsImage: false,
              toggleTheme: false,
              changeViewBackgroundColor: false,
            },
            tools: { image: false },
            welcomeScreen: false,
          }}
          onLinkOpen={(element, event) => {
            event.preventDefault();
            const id = element.customData?.grelloCardId;
            if (id && state.cards.some((c) => c.id === id)) openCard(id);
          }}
          onPaste={(data) => {
            if (data.files && Object.keys(data.files).some((id) => !api?.getFiles()[id])) {
              setError('Para transportar imagens, use um pacote Mirello ou adicione o arquivo.');
              return false;
            }
            if (
              data.elements?.some(
                (e) =>
                  ['iframe', 'embeddable', 'frame', 'magicframe'].includes(e.type) ||
                  (e.link && !e.link.startsWith('grello-card:'))
              )
            ) {
              setError('Cole apenas textos, imagens ou elementos locais do quadro.');
              return false;
            }
            return true;
          }}
        >
          <MainMenu>
            <MainMenu.Item onSelect={fit}>Enquadrar todo o conteúdo</MainMenu.Item>
            <MainMenu.DefaultItems.Help />
          </MainMenu>
        </Excalidraw>
        {count === 0 && (
          <div className="visual-empty">
            <strong>Um espaço para conectar ideias.</strong>
            <p>
              Adicione uma imagem, uma nota ou um cartão.
              <br />
              Use as ferramentas acima para desenhar, escrever e conectar.
            </p>
            <small>Arraste imagens para cá · Espaço + arrastar para navegar</small>
          </div>
        )}
      </div>
      <div className="visual-hint">
        Referências acompanham os cartões originais. Excluir um elemento visual não exclui a tarefa.{' '}
        <span>Shift+1 enquadra tudo · Ctrl+Z desfaz · Ctrl+Shift+Z refaz</span>
      </div>
      {panel === 'note' && (
        <NoteDialog
          onClose={() => setPanel(null)}
          onCreate={(text, color) => {
            const p = center();
            insert(noteElements(text, color, p.x, p.y));
            setPanel(null);
          }}
        />
      )}
      {panel === 'card' && (
        <CardReferencePicker
          state={state}
          boardId={boardId}
          onClose={() => setPanel(null)}
          onPick={(id) => {
            const p = center();
            insert(referenceElements(state, id, p.x, p.y));
            setPanel(null);
          }}
        />
      )}
    </section>
  );
}
