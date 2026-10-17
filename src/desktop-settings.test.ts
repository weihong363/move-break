import { describe, expect, it } from 'vitest';
import { defaultSettings, restoreSettings, validateSettings } from './desktop-settings';

describe('desktop settings boundary', () => {
  it('ignores obsolete demo flags without changing the configured reminder', () => {
    expect(restoreSettings({ ...defaultSettings, inactivitySeconds: 60, demoMode: true }))
      .toEqual({ ...defaultSettings, inactivitySeconds: 60 });
  });
  it('accepts the daily defaults and strips unrelated input', () => {
    expect(validateSettings({ ...defaultSettings, arbitrary: 'discard' })).toEqual(defaultSettings);
  });
  it.each([{ holdSeconds: 0 }, { movementCount: 5 }, { inactivitySeconds: 0 }, { inactivitySeconds: 7201 }, { inactivitySeconds: 1.5 }, { sound: 'yes' }, { holdSeconds: 2.5 }])('rejects invalid settings %o', (change) => {
    expect(() => validateSettings({ ...defaultSettings, ...change })).toThrow();
  });
  it.each([1, 10, 30, 1500, 7200])('accepts a %i-second reminder', (inactivitySeconds) => {
    expect(validateSettings({ ...defaultSettings, inactivitySeconds }).inactivitySeconds).toBe(inactivitySeconds);
  });
  it('converts saved minutes without losing other preferences or retaining the old field', () => {
    const { inactivitySeconds: _, ...rest } = defaultSettings;
    expect(restoreSettings({ ...rest, inactivityMinutes: 2, sound: false })).toEqual({ ...defaultSettings, inactivitySeconds: 120, sound: false });
  });
  it('preserves new seconds when an old field is also present', () => {
    expect(restoreSettings({ ...defaultSettings, inactivitySeconds: 10, inactivityMinutes: 25 })).toEqual({ ...defaultSettings, inactivitySeconds: 10 });
  });
});
