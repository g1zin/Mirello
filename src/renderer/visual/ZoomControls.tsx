import { CaptureUpdateAction } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI, AppState } from '@excalidraw/excalidraw/types';
export function ZoomControls({ api, zoom }: { api: ExcalidrawImperativeAPI | null; zoom: number }) {
  function change(direction: number) {
    if (!api) return;
    const state = api.getAppState(),
      value = Math.max(
        0.1,
        Math.min(30, Math.round((state.zoom.value + direction * 0.1) * 100) / 100)
      );
    const scrollX =
      state.scrollX + state.width / (2 * value) - state.width / (2 * state.zoom.value);
    const scrollY =
      state.scrollY + state.height / (2 * value) - state.height / (2 * state.zoom.value);
    api.updateScene({
      appState: { zoom: { value: value as AppState['zoom']['value'] }, scrollX, scrollY },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }
  return (
    <div className="visual-zoom" role="group" aria-label="Controles de zoom">
      <button
        className="icon-button"
        aria-label="Diminuir zoom"
        disabled={!api || zoom <= 0.1}
        onClick={() => change(-1)}
      >
        −
      </button>
      <output aria-label="Zoom do quadro visual">{Math.round(zoom * 100)}%</output>
      <button
        className="icon-button"
        aria-label="Aumentar zoom"
        disabled={!api || zoom >= 30}
        onClick={() => change(1)}
      >
        +
      </button>
    </div>
  );
}
