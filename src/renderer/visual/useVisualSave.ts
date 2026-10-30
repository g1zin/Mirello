import { useEffect, useRef, useState, useCallback } from 'react';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { guardClose } from '../hooks/closeGuard';
import { sceneSchema, type VisualScene } from '../../shared/visual';

export function useVisualSave(
  boardId: string,
  api: ExcalidrawImperativeAPI | null,
  initial: VisualScene | null
) {
  const [status, setStatus] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved'),
    [error, setError] = useState('');
  const dirty = useRef(false),
    last = useRef(''),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    queue = useRef(Promise.resolve(true)),
    pointer = useRef(false);
  const apiRef = useRef(api);
  apiRef.current = api;
  const getScene = useCallback(() => {
    const editor = apiRef.current;
    if (!editor) return null;
    const s = editor.getAppState();
    return sceneSchema.parse({
      boardId,
      version: 1,
      elements: editor.getSceneElementsIncludingDeleted(),
      view: { scrollX: s.scrollX, scrollY: s.scrollY, zoom: s.zoom.value },
    });
  }, [boardId]);
  const flush = useCallback(
    async (force = false) => {
      if (force) dirty.current = true;
      clearTimeout(timer.current);
      const task = queue.current.then(async () => {
        if (!apiRef.current || !dirty.current) return true;
        setStatus('saving');
        try {
          const scene = getScene();
          if (!scene) return true;
          const signature = JSON.stringify(scene);
          if (signature !== last.current) {
            const result = await window.grello.saveVisual(scene);
            if (!result.ok) throw Error(result.error);
            last.current = signature;
          }
          const latest = getScene();
          dirty.current = JSON.stringify(latest) !== signature;
          setStatus(dirty.current ? 'pending' : 'saved');
          setError('');
          return true;
        } catch (e) {
          setStatus('error');
          setError(
            e instanceof Error && e.name !== 'ZodError'
              ? e.message
              : 'Não foi possível salvar este conteúdo. Desfaça a última operação e tente novamente.'
          );
          return false;
        }
      });
      queue.current = task;
      return task;
    },
    [getScene]
  );
  const changed = useCallback(() => {
    dirty.current = true;
    setStatus((old) => (old === 'error' ? old : 'pending'));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!pointer.current) void flush();
    }, 800);
  }, [flush]);
  useEffect(() => {
    if (initial) last.current = JSON.stringify(initial);
    return () => clearTimeout(timer.current);
  }, [initial]);
  useEffect(
    () =>
      guardClose(async () => {
        // Excalidraw commits an active text editor on blur. Wait one task before taking the final snapshot.
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.closest('.visual-editor')) active.blur();
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (apiRef.current) dirty.current = true;
        return flush();
      }),
    [flush]
  );
  return {
    status,
    error,
    flush,
    changed,
    pointerDown: () => {
      pointer.current = true;
    },
    pointerUp: () => {
      pointer.current = false;
      changed();
    },
  };
}
