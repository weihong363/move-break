import type { RoutineSnapshot } from './routine-verifier';

export type SoundCue = 'reminder' | 'start' | 'tick' | 'final-tick' | 'step-complete';
type Note = { frequency: number; offset: number; duration: number; volume: number };

const melodies: Record<SoundCue, Note[]> = {
  reminder: [
    { frequency: 523, offset: 0, duration: 0.2, volume: 0.08 },
    { frequency: 659, offset: 0.22, duration: 0.3, volume: 0.08 },
    { frequency: 784, offset: 0.46, duration: 0.4, volume: 0.07 },
  ],
  start: [{ frequency: 440, offset: 0, duration: 0.1, volume: 0.06 }, { frequency: 660, offset: 0.12, duration: 0.16, volume: 0.06 }],
  tick: [{ frequency: 660, offset: 0, duration: 0.1, volume: 0.06 }],
  'final-tick': [{ frequency: 880, offset: 0, duration: 0.12, volume: 0.06 }],
  'step-complete': [{ frequency: 784, offset: 0, duration: 0.12, volume: 0.06 }, { frequency: 1047, offset: 0.14, duration: 0.22, volume: 0.06 }],
};

const scheduleNote = (context: AudioContext, note: Note) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + note.offset;
  oscillator.frequency.value = note.frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(note.volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(start);
  oscillator.stop(start + note.duration + 0.02);
};

export const createSoundPlayer = () => {
  let context: AudioContext | undefined;
  const prime = async () => {
    try {
      context ??= new AudioContext();
      if (context.state === 'suspended') await context.resume();
    } catch { /* Audio availability must not interrupt camera verification. */ }
  };
  const play = (cue: SoundCue) => {
    if (!context || context.state !== 'running') return;
    melodies[cue].forEach((note) => scheduleNote(context!, note));
  };
  return { prime, play };
};

export const createRoutineSoundTracker = (holdDurationMs: number) => {
  let step: string | undefined;
  let terminalPhase: RoutineSnapshot['phase'] | undefined;
  let lastSecond: number | undefined;
  const reset = () => { step = undefined; terminalPhase = undefined; lastSecond = undefined; };
  const update = (snapshot: RoutineSnapshot): SoundCue[] => {
    const cues: SoundCue[] = [];
    const nextStep = `${snapshot.movementIndex}:${snapshot.rotationStep ?? ''}`;
    if (snapshot.phase === 'complete' || snapshot.phase === 'movement-complete') {
      if (terminalPhase !== snapshot.phase) cues.push(snapshot.phase === 'complete' ? 'reminder' : 'step-complete');
      terminalPhase = snapshot.phase;
      return cues;
    }
    terminalPhase = undefined;
    if (nextStep !== step) { step = nextStep; lastSecond = undefined; cues.push('start'); }
    const seconds = Math.max(0, Math.ceil((1 - snapshot.progress) * holdDurationMs / 1000));
    if (snapshot.phase === 'holding' && seconds !== lastSecond) {
      if (cues.length === 0) cues.push(seconds <= 1 ? 'final-tick' : 'tick');
      lastSecond = seconds;
    }
    return cues;
  };
  return { reset, update };
};
