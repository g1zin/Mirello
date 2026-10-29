import { useEffect, useRef, useState } from 'react';
import { guardClose } from './closeGuard';
export function useAutosave<T>(initial: T, onSave: (value: T) => Promise<boolean>) {
  const [value, setValue] = useState(initial),
    [status, setStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const current = useRef(value),
    saved = useRef(JSON.stringify(initial)),
    fn = useRef(onSave),
    inFlight = useRef<Promise<boolean> | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  current.current = value;
  fn.current = onSave;
  async function flush(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current) {
      if (!(await inFlight.current)) return false;
      return flush();
    }
    const payload = current.current,
      key = JSON.stringify(payload);
    if (key === saved.current) return true;
    setStatus('saving');
    const task = fn.current(payload);
    inFlight.current = task;
    const ok = await task;
    inFlight.current = null;
    if (ok) {
      saved.current = key;
      setStatus(JSON.stringify(current.current) === key ? 'saved' : 'dirty');
    } else setStatus('error');
    if (ok && JSON.stringify(current.current) !== key) return flush();
    return ok;
  }
  useEffect(() => {
    if (JSON.stringify(value) === saved.current) return;
    setStatus('dirty');
    timer.current = setTimeout(() => void flush(), 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => guardClose(() => flushRef.current()), []);
  return { value, setValue, status, flush };
}
