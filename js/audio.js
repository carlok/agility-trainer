let ctx = null;

export function getAudioContext() {
  if (typeof AudioContext === "undefined" && typeof webkitAudioContext === "undefined") {
    return null;
  }
  const Ctx = AudioContext || webkitAudioContext;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

/** Unlock/resume after user gesture (mobile autoplay policy). */
export async function ensureAudioReady() {
  const c = getAudioContext();
  if (!c) return false;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Short transition beep via Web Audio API (no external files).
 * @param {number} [frequencyHz=820]
 * @param {number} [durationSec=0.1]
 */
export function playBeep(frequencyHz = 820, durationSec = 0.1) {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequencyHz, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}
