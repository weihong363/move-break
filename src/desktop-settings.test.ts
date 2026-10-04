import { describe, expect, it } from 'vitest';
import { defaultSettings, validateSettings } from './desktop-settings';

describe('desktop settings boundary', () => {
  it('accepts the daily defaults and strips unrelated input', () => {
    expect(validateSettings({ ...defaultSettings, arbitrary: 'discard' })).toEqual(defaultSettings);
  });
  it.each([{ holdSeconds: 0 }, { movementCount: 5 }, { inactivityMinutes: 0 }, { sound: 'yes' }, { holdSeconds: 2.5 }])('rejects invalid settings %o', (change) => {
    expect(() => validateSettings({ ...defaultSettings, ...change })).toThrow();
  });
});
