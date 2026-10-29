import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, Reply, Snapshot } from '../../shared/model';
export function useWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [error, setError] = useState(''),
    [pending, setPending] = useState(0),
    [saved, setSaved] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const accept = useCallback((s: Snapshot) => {
    setSnapshot((old) => (!old || s.revision >= old.revision ? s : old));
  }, []);
  useEffect(() => {
    window.grello
      .load()
      .then((r) => {
        if (r.ok) accept(r.value);
        else setError(r.error);
      })
      .catch(() =>
        setError('Não foi possível abrir seus dados. Feche e abra o aplicativo novamente.')
      );
  }, [accept]);
  const run = useCallback(
    <T>(operation: () => Promise<Reply<T>>, onSuccess?: (value: T) => void): Promise<boolean> => {
      setPending((n) => n + 1);
      setSaved(false);
      const task = queue.current.then(async () => {
        try {
          const r = await operation();
          if (!r.ok) {
            setError(r.error);
            return false;
          }
          onSuccess?.(r.value);
          setError('');
          setSaved(true);
          return true;
        } catch {
          setError('Não foi possível salvar. Tente novamente antes de fechar o aplicativo.');
          return false;
        } finally {
          setPending((n) => n - 1);
        }
      });
      queue.current = task;
      return task;
    },
    []
  );
  const dispatch = useCallback(
    (action: Action) => run(() => window.grello.dispatch(action), accept),
    [run, accept]
  );
  const waitForIdle = useCallback(async () => {
    await queue.current;
  }, []);
  return {
    waitForIdle,
    state: snapshot?.state ?? null,
    error,
    setError,
    pending,
    saved,
    dispatch,
    run,
    accept,
  };
}
