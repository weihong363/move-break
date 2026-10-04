import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoutineSoundTracker, createSoundPlayer } from './sound';
import type { RoutineSnapshot } from './routine-verifier';

const frame = (overrides: Partial<RoutineSnapshot> = {}): RoutineSnapshot => ({
  poseMatched: overrides.phase === 'holding', movement: 'overhead-reach', movementIndex: 0, instruction: 'Reach up', phase: 'demo', progress: 0, ...overrides,
});

afterEach(() => vi.unstubAllGlobals());

it('schedules notes only after audio is unlocked and tolerates unavailable audio', async () => {
  const start = vi.fn();
  const context = {
    state: 'running', currentTime: 0, destination: {},
    createOscillator: () => ({ frequency: { value: 0 }, connect: () => ({ connect: vi.fn() }), start, stop: vi.fn() }),
    createGain: () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }),
  };
  vi.stubGlobal('AudioContext', function () { return context; });
  const sound = createSoundPlayer();
  sound.play('reminder');
  expect(start).not.toHaveBeenCalled();
  await sound.prime();
  sound.play('reminder');
  expect(start).toHaveBeenCalledTimes(3);
  sound.setEnabled(false);
  sound.play('start');
  expect(start).toHaveBeenCalledTimes(3);
  vi.stubGlobal('AudioContext', undefined);
  await expect(createSoundPlayer().prime()).resolves.toBeUndefined();
});

describe('routine sound transitions', () => {
  it('confirms a match, keeps a beat only while matched, and stops on pause or completion', () => {
    const sounds = createRoutineSoundTracker(3000, 750);
    expect(sounds.update(frame(), 0)).toEqual(['start']);
    expect(sounds.update(frame(), 700)).toEqual([]);
    expect(sounds.update(frame(), 750)).toEqual([]);
    const hold = frame({ phase: 'holding', progress: 0.1 });
    expect(sounds.update(hold, 1000)).toEqual(['matched']);
    expect(sounds.update(hold, 1750)).toEqual(['pulse']);
    expect(sounds.update({ ...hold, phase: 'paused-tracking', poseMatched: false }, 2500)).toEqual([]);
    expect(sounds.update(hold, 2600)).toEqual(['matched']);
    expect(sounds.update(hold, 3350)).toEqual(['pulse']);
    expect(sounds.update(frame({ phase: 'movement-complete' }), 3300)).toEqual(['step-complete']);
    expect(sounds.update(frame({ phase: 'movement-complete' }), 5000)).toEqual([]);
  });

  it('plays start once, then ticks only when valid hold time crosses a second', () => {
    const sounds = createRoutineSoundTracker(3000);
    expect(sounds.update(frame())).toEqual(['start']);
    expect(sounds.update(frame())).toEqual([]);
    expect(sounds.update(frame({ phase: 'holding', progress: 0.1 }))).toEqual(['matched']);
    expect(sounds.update(frame({ phase: 'holding', progress: 0.2 }))).toEqual([]);
    expect(sounds.update(frame({ phase: 'holding', progress: 0.4 }))).toEqual(['tick']);
    expect(sounds.update(frame({ phase: 'paused-tracking', progress: 0.4 }))).toEqual([]);
    expect(sounds.update(frame({ phase: 'holding', progress: 0.4 }))).toEqual([]);
    expect(sounds.update(frame({ phase: 'holding', progress: 0.7 }))).toEqual(['final-tick']);
  });

  it('announces step end, next start and full completion once despite repeated frames', () => {
    const sounds = createRoutineSoundTracker(3000);
    sounds.update(frame());
    const end = frame({ phase: 'movement-complete', progress: 1 });
    expect(sounds.update(end)).toEqual(['step-complete']);
    expect(sounds.update(end)).toEqual([]);
    const next = frame({ movement: 'side-bend-left', movementIndex: 1 });
    expect(sounds.update(next)).toEqual(['start']);
    expect(sounds.update(next)).toEqual([]);
    const done = frame({ movement: 'torso-rotation', movementIndex: 3, phase: 'complete', progress: 1 });
    expect(sounds.update(done)).toEqual(['reminder']);
    expect(sounds.update(done)).toEqual([]);
    sounds.reset();
    expect(sounds.update(frame())).toEqual(['start']);
  });

  it('announces the other rotation direction once and freezes ticks on lost tracking', () => {
    const sounds = createRoutineSoundTracker(3000);
    const turn = frame({ movement: 'torso-rotation', movementIndex: 3, rotationStep: 'first-side' });
    expect(sounds.update(turn)).toEqual(['start']);
    const other = { ...turn, rotationStep: 'other-side' as const };
    expect(sounds.update(other)).toEqual(['start']);
    expect(sounds.update({ ...other, phase: 'paused-tracking' })).toEqual([]);
    expect(sounds.update(other)).toEqual([]);
  });
});

it('resumes suspended audio before playing a pose-match confirmation', async () => {
  const start = vi.fn();
  const context = {
    state: 'suspended', currentTime: 0, destination: {},
    resume: vi.fn(async () => { context.state = 'running'; }),
    createOscillator: () => ({ frequency: { value: 0 }, connect: () => ({ connect: vi.fn() }), start, stop: vi.fn() }),
    createGain: () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }),
  };
  vi.stubGlobal('AudioContext', function () { return context; });
  const sound = createSoundPlayer();
  await sound.prime();
  sound.play('matched');
  expect(context.resume).toHaveBeenCalledOnce();
  expect(start).toHaveBeenCalledTimes(2);
});
