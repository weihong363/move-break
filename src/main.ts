import './styles.css';
import { createAppController } from './app-controller';

const root = document.querySelector<HTMLElement>('#app');

if (!root) throw new Error('MoveBreak requires an app root.');

createAppController(root);
