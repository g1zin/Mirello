const guards = new Set<() => Promise<boolean>>();
export function guardClose(fn: () => Promise<boolean>) {
  guards.add(fn);
  return () => {
    guards.delete(fn);
  };
}
export async function prepareClose() {
  for (const fn of guards) {
    if (!(await fn())) return false;
  }
  return true;
}
