import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopSettings, CompanionStatus, DesktopCommand } from '../src/desktop-settings.js' with { 'resolution-mode': 'import' };
const subscribe = <T,>(channel: string, callback: (value: T) => void) => {
  const listener = (_event: unknown, value: T) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('moveBreak', {
  hasCameraPermission: () => ipcRenderer.invoke('camera:granted'),
  requestCameraAccess: () => ipcRenderer.invoke('camera:request'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: DesktopSettings) => ipcRenderer.invoke('settings:save', settings),
  getStartupAvailable: () => ipcRenderer.invoke('startup:available'),
  onSettings: (callback: (settings: DesktopSettings) => void) => subscribe('settings:changed', callback),
  onCommand: (callback: (command: DesktopCommand) => void) => subscribe('companion:command', callback),
  reportStatus: (status: CompanionStatus) => ipcRenderer.send('companion:status', status),
});
