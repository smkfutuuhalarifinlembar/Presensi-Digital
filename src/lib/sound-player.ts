import confetti from "canvas-confetti";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Nada sukses Hadir Tepat Waktu (Harmoni C5 - E5 - G5)
 */
export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);

      gain.gain.setValueAtTime(0, startTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, startTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + 0.4);
    });
  } catch (err) {
    console.warn("Audio chime error:", err);
  }
}

/**
 * Nada peringatan Terlambat (Nada G4 - F4 hangat)
 */
export function playWarningChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [440, 392]; // A4, G4
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.15);

      gain.gain.setValueAtTime(0, startTime + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, startTime + idx * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + idx * 0.15);
      osc.stop(startTime + idx * 0.15 + 0.45);
    });
  } catch (err) {
    console.warn("Audio warning chime error:", err);
  }
}

/**
 * Nada error / kartu tidak dikenal (Buzzer rendah)
 */
export function playErrorBuzz() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    console.warn("Audio buzz error:", err);
  }
}

/**
 * Text-to-Speech (Menyebutkan nama dan status)
 */
export function speakPresence(name: string, status: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel(); // Hentikan suara sebelumnya jika ada

    const statusText =
      status === "HADIR"
        ? "Hadir tepat waktu."
        : status === "TERLAMBAT"
        ? "Tercatat terlambat."
        : status;

    const text = `Terima kasih, ${name}. ${statusText}`;
    const utterance = new SpeechSynthesisUtterance(text);

    // Cari suara Bahasa Indonesia jika ada
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(
      (v) => v.lang.startsWith("id") || v.lang.includes("ID")
    );
    if (idVoice) {
      utterance.voice = idVoice;
    }
    utterance.lang = "id-ID";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

/**
 * Efek selebrasi confetti saat hadir tepat waktu
 */
export function triggerSuccessConfetti() {
  try {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#3b82f6", "#10b981", "#f59e0b", "#6366f1"],
    });
  } catch {}
}
