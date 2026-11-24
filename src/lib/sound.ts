let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = "triangle",
  volume = 0.13
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
  gain.gain.setValueAtTime(0.001, ctx.currentTime + startOffset);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + startOffset + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration + 0.02);
}

export type SoundEffectKind = "correct" | "combo" | "wrong" | "clear";

export function playSoundEffect(kind: SoundEffectKind, enabled: boolean) {
  if (!enabled) return;
  try {
    if (kind === "correct") {
      playTone(659.25, 0, 0.11, "triangle", 0.13);
      playTone(880.0, 0.075, 0.17, "triangle", 0.14);
    } else if (kind === "combo") {
      // 5問・10問・15問・リーチ時のちょっと華やかな音
      playTone(659.25, 0, 0.1, "triangle", 0.13);
      playTone(880.0, 0.07, 0.11, "triangle", 0.14);
      playTone(1174.66, 0.15, 0.22, "triangle", 0.15);
    } else if (kind === "wrong") {
      playTone(220, 0, 0.16, "sawtooth", 0.065);
      playTone(174.61, 0.13, 0.25, "sawtooth", 0.065);
    } else if (kind === "clear") {
      playTone(523.25, 0.0, 0.13, "triangle", 0.14);
      playTone(659.25, 0.1, 0.13, "triangle", 0.14);
      playTone(783.99, 0.2, 0.13, "triangle", 0.14);
      playTone(1046.5, 0.31, 0.44, "triangle", 0.16);
    }
  } catch {
    // 音声再生不可環境では無視
  }
}
