export type DesktopSettings = {
  inactivityMinutes: number;
  movementCount: number;
  holdSeconds: number;
  sound: boolean;
  alwaysOnTop: boolean;
  showCompanion: boolean;
  launchAtLogin: boolean;
  demoMode: boolean;
  debugCamera: boolean;
};
export type CompanionStatus = { monitoring: boolean; label: string; remainingSeconds?: number };
export type DesktopCommand = 'pause' | 'resume' | 'demo-break';
export interface DesktopBridge {
  requestCameraAccess(): Promise<boolean>;
  getSettings(): Promise<DesktopSettings>;
  saveSettings(settings: DesktopSettings): Promise<DesktopSettings>;
  onSettings(callback: (settings: DesktopSettings) => void): () => void;
  onCommand(callback: (command: DesktopCommand) => void): () => void;
  reportStatus(status: CompanionStatus): void;
  getStartupAvailable(): Promise<boolean>;
}
declare global { interface Window { moveBreak?: DesktopBridge } }

export const defaultSettings: DesktopSettings = {
  inactivityMinutes: 25, movementCount: 4, holdSeconds: 3, sound: true,
  alwaysOnTop: true, showCompanion: true, launchAtLogin: false, demoMode: false, debugCamera: false,
};
export const validateSettings = (input: unknown): DesktopSettings => {
  const values = input as Record<string, unknown> | null;
  if (!values || typeof values !== 'object') throw new Error('Invalid settings');
  const result = { ...defaultSettings };
  for (const key of ['sound', 'alwaysOnTop', 'showCompanion', 'launchAtLogin', 'demoMode', 'debugCamera'] as const) {
    if (typeof values[key] !== 'boolean') throw new Error(`Invalid ${key}`);
    result[key] = values[key];
  }
  for (const [key, min, max] of [['inactivityMinutes', 1, 120], ['movementCount', 1, 4], ['holdSeconds', 1, 15]] as const) {
    const value = values[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
    result[key] = value;
  }
  return result;
};
