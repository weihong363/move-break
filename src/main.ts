import './styles.css';
import { createAppController } from './app-controller';
import { createSettingsWindow } from './settings-window';
import { enableWindowDragging } from './window-drag';

const root = document.querySelector<HTMLElement>('#app');

if (!root) throw new Error('MoveBreak requires an app root.');

if (new URLSearchParams(location.search).get('surface') === 'settings') void createSettingsWindow(root);
else {
  if (window.moveBreak) {
    document.body.classList.add('desktop-surface');
    enableWindowDragging(root, window.moveBreak);
  }
  createAppController(root);
}
