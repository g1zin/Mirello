import { randomUUID } from 'node:crypto';
import { mergeStates } from './actions';
import { validateBundle, type VisualBundle } from '../shared/visual';
import type { State } from '../shared/model';
// The existing task merger remains authoritative. Its resulting array positions provide
// the correspondence for the visual IDs without matching user titles or changing legacy behavior.
export function mergeVisualBundle(current: State, input: VisualBundle): VisualBundle {
  const source = validateBundle(input),
    tasks = mergeStates(current, source.tasks),
    map = new Map<string, string>();
  for (const key of ['boards', 'columns', 'cards', 'labels'] as const)
    source.tasks[key].forEach((entry, i) =>
      map.set(entry.id, tasks[key][current[key].length + i].id)
    );
  const result = structuredClone(source);
  for (const asset of result.assets) {
    const old = asset.id;
    asset.id = randomUUID();
    map.set(old, asset.id);
  }
  for (const scene of result.visuals) {
    scene.boardId = map.get(scene.boardId)!;
    const elementMap = new Map<string, string>(),
      groupMap = new Map<string, string>();
    for (const e of scene.elements) {
      elementMap.set(e.id, randomUUID());
      for (const g of e.groupIds) if (!groupMap.has(g)) groupMap.set(g, randomUUID());
    }
    for (const e of scene.elements) {
      e.id = elementMap.get(e.id)!;
      e.groupIds = e.groupIds.map((g) => groupMap.get(g)!);
      if (e.containerId) e.containerId = elementMap.get(e.containerId)!;
      if (e.boundElements)
        e.boundElements = e.boundElements.map((b) => ({ ...b, id: elementMap.get(b.id)! }));
      for (const side of ['startBinding', 'endBinding'] as const)
        if (e[side]) e[side]!.elementId = elementMap.get(e[side]!.elementId)!;
      if (e.fileId) e.fileId = map.get(e.fileId)!;
      if (e.customData?.grelloCardId) {
        const old = e.customData.grelloCardId;
        // A permanently deleted source card must stay unavailable, even if its old ID exists at the destination.
        if (!map.has(old)) map.set(old, randomUUID());
        e.customData.grelloCardId = map.get(old)!;
        e.link = 'grello-card:' + e.customData.grelloCardId;
      } else if (e.link) e.link = null;
    }
  }
  return validateBundle({ ...result, tasks });
}
