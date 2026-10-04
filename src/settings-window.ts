import { defaultSettings, validateSettings, type DesktopSettings } from './desktop-settings';

const checkbox = (key: keyof DesktopSettings, label: string, values: DesktopSettings) => `<label class="setting-row"><span>${label}</span><input type="checkbox" name="${key}" ${values[key] ? 'checked' : ''}></label>`;
const numeric = (key: keyof DesktopSettings, label: string, min: number, max: number, values: DesktopSettings) => `<label class="setting-row"><span>${label}</span><input type="number" name="${key}" min="${min}" max="${max}" step="1" value="${values[key]}"></label>`;

export const createSettingsWindow = async (root: HTMLElement) => {
  const bridge = window.moveBreak;
  let values = bridge ? await bridge.getSettings() : { ...defaultSettings };
  const startupAvailable = bridge ? await bridge.getStartupAvailable() : false;
  document.body.classList.add('settings-surface');
  root.innerHTML = `<form class="settings-form">
    <h1>Settings</h1>
    <fieldset><legend>General</legend>
      ${numeric('inactivityMinutes', 'Reminder after (minutes)', 1, 120, values)}
      ${numeric('movementCount', 'Movements per break', 1, 4, values)}
      ${numeric('holdSeconds', 'Hold duration (seconds)', 1, 15, values)}
      ${checkbox('sound', 'Sound', values)}
    </fieldset>
    <fieldset><legend>Window</legend>${checkbox('alwaysOnTop', 'Always on top', values)}${checkbox('showCompanion', 'Show companion', values)}</fieldset>
    <fieldset><legend>Startup</legend>${checkbox('launchAtLogin', 'Launch at login', values)}${startupAvailable ? '' : '<small>Available in the installed app.</small>'}</fieldset>
    <fieldset><legend>Privacy</legend><p>Camera processing stays on your device. Video is never recorded or uploaded.</p></fieldset>
    <details><summary>Developer</summary>${checkbox('demoMode', 'Demo mode · 5-second reminder', values)}${checkbox('debugCamera', 'Show camera debug view', values)}<small>Timing changes apply to the next monitoring session.</small></details>
    <p class="settings-result" role="status"></p>
  </form>`;
  root.querySelector<HTMLInputElement>('[name="launchAtLogin"]')!.disabled = !startupAvailable;
  const form = root.querySelector<HTMLFormElement>('form')!;
  const message = root.querySelector<HTMLElement>('[role="status"]')!;
  const sync = (next: DesktopSettings) => {
    values = next;
    for (const [key, value] of Object.entries(next)) {
      const input = form.elements.namedItem(key) as HTMLInputElement;
      if (typeof value === 'boolean') input.checked = value; else input.value = String(value);
    }
  };
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('change', async () => {
    if (!form.reportValidity()) return;
    const next = Object.fromEntries(Object.keys(values).map((key) => {
      const input = form.elements.namedItem(key) as HTMLInputElement;
      return [key, input.type === 'checkbox' ? input.checked : Number(input.value)];
    }));
    try { sync(bridge ? await bridge.saveSettings(validateSettings(next)) : validateSettings(next)); message.textContent = 'Saved'; }
    catch { message.textContent = 'Could not save settings. Try again.'; }
  });
  bridge?.onSettings(sync);
};
