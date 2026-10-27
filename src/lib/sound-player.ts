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
 * Text-to-Speech (Menyebutkan nama, kegiatan, dan status)
 *
 * Format ucapan: "{nama}, kegiatan {aktivitas}, {keterangan status}"
 * Contoh: "Fathul Aziz, kegiatan Presensi Pagi Masuk, Hadir tepat waktu."
 * Contoh: "Fathul Aziz, kegiatan Upacara Bendera Senin, Tercatat terlambat."
 *
 * Jika activityName tidak tersedia, kembali ke format lama tanpa kegiatan.
 */
export type TtsVoiceType = "laki-laki" | "perempuan";

/**
 * Pilih suara TTS berdasarkan jenis kelamin.
 * Prioritas: suara Indonesia dengan nama yang cocok (Andika=laki-laki, Riska=perempuan),
 * lalu fallback ke suara Indonesia pertama yang tersedia.
 */
function pickVoiceByGender(voiceType?: TtsVoiceType): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined") return undefined;

  const voices = window.speechSynthesis.getVoices();
  const idVoices = voices.filter((v) => v.lang.startsWith("id"));

  if (idVoices.length === 0) return undefined;

  if (voiceType === "laki-laki") {
    return (
      idVoices.find((v) => v.name.toLowerCase().includes("andika")) ||
      idVoices.find((v) => v.name.toLowerCase().includes("male")) ||
      idVoices.find((v) => v.name.toLowerCase().includes("laki")) ||
      idVoices[0]
    );
  }
  if (voiceType === "perempuan") {
    return (
      idVoices.find((v) => v.name.toLowerCase().includes("riska")) ||
      idVoices.find((v) => v.name.toLowerCase().includes("female")) ||
      idVoices.find((v) => v.name.toLowerCase().includes("cewek")) ||
      idVoices.find((v) => v.name.toLowerCase().includes("wanita")) ||
      idVoices[0]
    );
  }

  // Default (tanpa preferensi): cewek dulu, lalu cowok, lalu pertama yang ada
  return (
    idVoices.find((v) => v.name.toLowerCase().includes("riska")) ||
    idVoices.find((v) => v.name.toLowerCase().includes("female")) ||
    idVoices.find((v) => v.name.toLowerCase().includes("andika")) ||
    idVoices.find((v) => v.name.toLowerCase().includes("male")) ||
    idVoices[0]
  );
}

/**
 * Ambil nama suara TTS yang akan digunakan untuk ditampilkan di UI admin.
 */
export function getSelectedTtsVoiceName(voiceType?: TtsVoiceType): string {
  const voice = pickVoiceByGender(voiceType);
  return voice ? voice.name : "(browser default)";
}

/**
 * Pengaturan pitch (ketebalan nada) berdasarkan gender agar terdengar berbeda
 * meskipun sistem hanya menyediakan satu suara Indonesia.
 */
export function getTtsPitch(voiceType?: TtsVoiceType): number {
  if (voiceType === "laki-laki") return 0.92;
  if (voiceType === "perempuan") return 1.08;
  return 1.0;
}

/**
 * Text-to-Speech (Menyebutkan nama, kegiatan, dan status)
 *
 * Format ucapan: "{nama}, kegiatan {aktivitas}, {keterangan status}"
 * Contoh: "Fathul Aziz, kegiatan Presensi Pagi Masuk, Hadir tepat waktu."
 * Contoh: "Fathul Aziz, kegiatan Upacara Bendera Senin, Tercatat terlambat."
 *
 * Jika activityName tidak tersedia, kembali ke format lama tanpa kegiatan.
 * voiceType opsional: "laki-laki" atau "perempuan" untuk memilih gender suara TTS.
 */
export function speakPresence(
  name: string,
  status: string,
  activityName?: string | null,
  voiceType?: TtsVoiceType
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel(); // Hentikan suara sebelumnya jika ada

    const statusText =
      status === "HADIR"
        ? "Hadir tepat waktu."
        : status === "TERLAMBAT"
        ? "Tercatat terlambat."
        : status;

    let text: string;
    if (activityName && activityName.trim()) {
      text = `${name}, kegiatan ${activityName.trim()}, ${statusText}`;
    } else {
      text = `Terima kasih, ${name}. ${statusText}`;
    }
    const utterance = new SpeechSynthesisUtterance(text);

    const selectedVoice = pickVoiceByGender(voiceType);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.lang = "id-ID";
    utterance.rate = 1.05;
    utterance.pitch = getTtsPitch(voiceType);

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

/**
 * Uji coba suara TTS sebelum digunakan di produksi.
 * Membicakan kalimat tes dengan nama aktivitas "Test Sistem TTS".
 */
export function testSpeakPresence(voiceType?: TtsVoiceType) {
  const label =
    voiceType === "laki-laki"
      ? "suara laki-laki"
      : voiceType === "perempuan"
        ? "suara perempuan"
        : "suara default";
  speakPresence("Uji Coba TTS", "HADIR", `Ini adalah tes ${label}`, voiceType);
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
