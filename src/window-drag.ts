import type { DesktopBridge } from './desktop-settings';

export const enableWindowDragging = (root: HTMLElement, desktop: DesktopBridge): void => {
  let pointerId: number | undefined;
  root.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    if (event.target.closest('button, input, select, textarea, a, video, .camera-shell')) return;
    pointerId = event.pointerId;
    root.setPointerCapture(pointerId);
    desktop.dragWindow('start', event.screenX, event.screenY);
    event.preventDefault();
  });
  root.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointerId) desktop.dragWindow('move', event.screenX, event.screenY);
  });
  const endDrag = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    pointerId = undefined;
    desktop.dragWindow('end', event.screenX, event.screenY);
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
  };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  root.addEventListener('lostpointercapture', endDrag);
};
