"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  CreditCard,
  QrCode,
  FileText,
  Volume2,
  VolumeX,
  Lock,
  Wifi,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import KioskHeader from "@/components/kiosk/KioskHeader";
import PresenceToastModal, {
  PresenceNotificationData,
} from "@/components/kiosk/PresenceToastModal";
import QrScannerModal from "@/components/kiosk/QrScannerModal";
import RecentPresenceTicker from "@/components/kiosk/RecentPresenceTicker";
import {
  playSuccessChime,
  playWarningChime,
  playErrorBuzz,
  speakPresence,
  triggerSuccessConfetti,
} from "@/lib/sound-player";

export default function KioskPage() {
  // Data dari API Kiosk
  const [kioskData, setKioskData] = useState<{
    school: any;
    todayActivities: any[];
    activeActivity: any | null;
    recentAttendances: any[];
    stats: { total: number; hadir: number; terlambat: number };
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrLastResult, setQrLastResult] = useState<{
    success: boolean;
    message: string;
    name?: string;
    time?: string;
    status?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Status notifikasi konfirmasi presensi (5 detik interruptible)
  const [activeNotification, setActiveNotification] =
    useState<PresenceNotificationData | null>(null);

  // Alert/pesan error sementara di layar
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Buffer input keyboard untuk RFID Reader (USB HID)
  const rfidBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch initial kiosk metadata & schedules
  const fetchKioskData = async () => {
    try {
      const res = await fetch("/api/kiosk", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setKioskData(data);
      }
    } catch (err) {
      console.error("Gagal memuat data kiosk:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKioskData();
    // Refresh jadwal & statistik berkala setiap 30 detik
    const interval = setInterval(fetchKioskData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. Memastikan fokus selalu siap untuk RFID Reader (USB HID)
  useEffect(() => {
    const focusTrap = () => {
      // Jika modal QR tidak terbuka, pertahankan fokus di input RFID
      if (!isQrModalOpen && hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    };

    focusTrap();
    const interval = setInterval(focusTrap, 2000);
    window.addEventListener("click", focusTrap);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", focusTrap);
    };
  }, [isQrModalOpen]);

  // 3. Global Key Listener untuk RFID Reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Jika modal QR sedang aktif, abaikan keystroke RFID
      if (isQrModalOpen) return;

      const currentTime = Date.now();

      // Scanner RFID umumnya mengetik sangat cepat (< 50ms antar karakter)
      if (currentTime - lastKeyTimeRef.current > 300) {
        rfidBufferRef.current = ""; // Reset buffer jika jeda terlalu lama
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        e.preventDefault();
        const code = rfidBufferRef.current.trim();
        rfidBufferRef.current = "";
        if (code) {
          processPresence(code, "RFID");
        }
      } else if (e.key.length === 1) {
        rfidBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQrModalOpen, kioskData?.activeActivity]);

  // 4. Proses Presensi (RFID atau QR)
  const processPresence = async (identifier: string, method: "RFID" | "QR") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    // Untuk mode QR: TIDAK reset lastResult, biarkan notifikasi sebelumnya
    // tetap tampil sampai notifikasi baru menggantikan (interuptable)

    try {
      const res = await fetch("/api/kiosk/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          method,
          activityId: kioskData?.activeActivity?.id,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        // SUKSES PRESENSI
        const notifData: PresenceNotificationData = {
          id: `${json.person.id}-${Date.now()}`,
          name: json.person.name,
          nisNip: json.person.nisNip,
          role: json.person.role,
          className: json.person.className,
          position: json.person.position,
          photoUrl: json.person.photoUrl,
          status: json.status,
          time: json.time,
          activityName: json.activityName,
          method: json.method,
        };

        // Langsung gantikan notifikasi yang sedang aktif (apabila ada) dan reset 5 detik
        setActiveNotification(notifData);

        // Tampilkan juga hasil di dalam modal QR (jika sedang terbuka)
        if (isQrModalOpen) {
          setQrLastResult({
            success: true,
            message: "Presensi berhasil dicatat",
            name: json.person.name,
            time: json.time,
            status: json.status,
          });
        }

        // Efek Suara & TTS
        if (soundEnabled) {
          if (json.status === "HADIR") {
            playSuccessChime();
            triggerSuccessConfetti();
          } else {
            playWarningChime();
          }
          // Panggil Text-to-Speech
          setTimeout(() => {
            speakPresence(json.person.name, json.status);
          }, 200);
        }

        // Refresh data ticker presensi terbaru
        fetchKioskData();
      } else {
        // ERROR / SUDAH PRESENSI / COOLDOWN / BELUM DIBUKA
        if (soundEnabled) playErrorBuzz();
        setErrorMessage(json.error || "Gagal mencatat presensi.");

        if (isQrModalOpen) {
          setQrLastResult({
            success: false,
            message: json.error || "Gagal mencatat presensi",
            name: json.person?.name,
            time: json.time,
            status: json.status,
          });
        }

        // Jika error, hilangkan pesan error setelah 4 detik
        setTimeout(() => {
          setErrorMessage(null);
        }, 4000);
      }
    } catch (err: any) {
      if (soundEnabled) playErrorBuzz();
      setErrorMessage("Terjadi gangguan koneksi ke server presensi.");
      
      if (isQrModalOpen) {
        setQrLastResult({
          success: false,
          message: "Gangguan koneksi ke server",
        });
      }
      
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
      // Modal QR TIDAK lagi ditutup otomatis. User bisa tutup manual
      // atau scanner akan otomatis aktif lagi setelah timer di QrScannerModal
    }
  };

  // Handler input manual sementara untuk testing via keyboard di layar
  const handleHiddenInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = e.currentTarget.value.trim();
      e.currentTarget.value = "";
      if (val) {
        processPresence(val, "RFID");
      }
    }
  };

  const school = kioskData?.school || {
    name: "SMK Negeri 1 Nusantara",
    kioskBackgroundColor: "#0b1329",
  };

  const activeActivity = kioskData?.activeActivity;
  const isSessionOpen = Boolean(activeActivity && activeActivity.state === "ACTIVE");

  return (
    <div
      className="min-h-screen flex flex-col justify-between text-white relative overflow-hidden select-none"
      style={{
        backgroundColor: school.kioskBackgroundColor || "#0b1329",
        backgroundImage: school.kioskBackgroundUrl
          ? `url('${school.kioskBackgroundUrl}')`
          : "radial-gradient(ellipse at top, rgba(30, 58, 138, 0.3) 0%, rgba(11, 19, 41, 1) 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Hidden input trap untuk RFID USB HID */}
      <input
        ref={hiddenInputRef}
        type="text"
        className="opacity-0 absolute -top-96 left-0 pointer-events-none"
        onKeyDown={handleHiddenInputKeyDown}
        autoFocus
        tabIndex={-1}
      />

      {/* Header Kiosk */}
      <KioskHeader
        school={school}
        todayActivities={kioskData?.todayActivities || []}
        activeActivity={activeActivity}
      />

      {/* Konten Utama Kiosk */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full z-10">
        {/* Banner Status Sesi Presensi */}
        <div className="w-full text-center mb-3 sm:mb-4 lg:mb-6">
          {isSessionOpen ? (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg animate-pulse"
              style={{
                backgroundColor: "#064e3b",
                borderColor: "#10b981",
                color: "#6ee7b7",
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.18)",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs sm:text-sm font-bold tracking-wide">
                SESI PRESENSI AKTIF: {activeActivity.name} ({activeActivity.startTime} - {activeActivity.endTime})
              </span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
              style={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                color: "#cbd5e1",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-xs font-medium">
                Sesi presensi saat ini sedang ditutup atau belum tiba jadwalnya.
              </span>
            </div>
          )}
        </div>

        {/* Pesan Error / Peringatan Floating */}
        {errorMessage && (
          <div
            className="mb-3 w-full max-w-xl border-2 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200"
            style={{
              backgroundColor: "#4c0519",
              borderColor: "#f43f5e",
              color: "#fecdd3",
            }}
          >
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
            <div className="text-xs font-semibold">{errorMessage}</div>
          </div>
        )}

        {/* Card Mode Presensi (RFID Default atau QR Code embedded) */}
        <div className="w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border-2 border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl flex flex-col items-center text-center relative group min-h-[320px] sm:min-h-[400px]">
          {/* Efek Glow Animasi */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition duration-1000 -z-10" />

          {isQrModalOpen ? (
            // === MODE QR CODE (embedded, bukan pop-up) ===
            <QrScannerModal
              isOpen={isQrModalOpen}
              onClose={() => {
                setIsQrModalOpen(false);
                setQrLastResult(null);
              }}
              onScan={(token) => processPresence(token, "QR")}
              isSubmitting={isSubmitting}
              lastResult={qrLastResult}
              onResetResult={() => setQrLastResult(null)}
            />
          ) : (
            // === MODE RFID (default) ===
            <>
              {/* Mode Badge Default */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 sm:mb-6"
                style={{
                  backgroundColor: "#1e3a8a",
                  borderColor: "#3b82f6",
                  color: "#bfdbfe",
                }}
              >
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span>Mode Default: RFID Reader Siap Aktif</span>
              </div>

              {/* Kartu Ilustrasi RFID yang Berdenyut */}
              <div className="relative my-2">
                <div className="w-44 h-28 sm:w-56 sm:h-36 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 border-2 border-blue-400/50 shadow-2xl flex flex-col justify-between p-4 sm:p-5 text-left transform transition hover:scale-105 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono tracking-widest text-blue-200 font-bold">
                      KARTU IDENTITAS
                    </span>
                    <Wifi className="w-5 h-5 text-blue-200 animate-pulse" />
                  </div>
                  <div>
                    <div className="w-8 h-6 rounded bg-amber-400/80 mb-2 border border-amber-300" />
                    <div className="text-[10px] sm:text-xs text-blue-100 font-medium">
                      {school.name}
                    </div>
                  </div>
                </div>

                {/* Ripple Pulse Rings */}
                <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/30 animate-ping-slow pointer-events-none" />
              </div>

              {/* Instruksi Tap Kartu */}
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-6 tracking-tight bg-slate-900/80 px-5 py-2.5 rounded-2xl border border-slate-700/60 shadow-lg backdrop-blur-sm">
                Tempelkan Kartu RFID Anda
              </h2>
              <p className="text-slate-200 text-sm sm:text-base max-w-md mt-2 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-700/60 shadow-lg backdrop-blur-sm">
                Dekatkan kartu RFID siswa, guru, atau pegawai pada alat scanner untuk mencatat presensi secara otomatis.
              </p>

              {/* Divider */}
              <div className="w-full flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-200 font-semibold uppercase tracking-wider bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg backdrop-blur-sm">
                  Atau Gunakan QR Code
                </span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Tombol Opsi Kedua: Switch ke QR Scanner Kamera */}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm border border-slate-700 hover:border-slate-600 shadow-lg flex items-center justify-center gap-2 sm:gap-3 transition transform active:scale-95"
              >
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                <span>Beralih ke Mode Scan Kamera (QR Code)</span>
              </button>
              <Link href="/izin" className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs sm:text-sm border border-amber-500/50 shadow-lg flex items-center justify-center gap-2 sm:gap-3"><FileText className="w-4 h-4 sm:w-5 sm:h-5" /><span>Izin Tidak Masuk Sekolah</span></Link>
            </>
          )}
        </div>

          {/* Live Ticker Presensi Terbaru - lebih compact */}
          <div className="w-full mt-3 sm:mt-4 lg:mt-6">
            <RecentPresenceTicker
              recentAttendances={kioskData?.recentAttendances || []}
              stats={kioskData?.stats || { total: 0, hadir: 0, terlambat: 0 }}
            />
          </div>
        </main>

        {/* Footer Kiosk - lebih compact */}
        <footer className="w-full bg-slate-950/90 border-t border-slate-800/80 px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 z-20">
          <div className="flex items-center gap-3 sm:gap-4">
            <span>© {new Date().getFullYear()} {school.name}</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1 hover:text-slate-300 transition"
              title="Aktifkan/Nonaktifkan Suara"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audio Aktif</span>
                </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>Audio Senyap</span>
              </>
            )}
          </button>
        </div>

        {/* Akses Login Khusus Admin */}
        <div>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Panel Pengelolaan (Admin)</span>
          </Link>
        </div>
      </footer>

      {/* Modal Notifikasi Konfirmasi Presensi 5 Detik (Interruptible) */}
      <PresenceToastModal
        data={activeNotification}
        onDismiss={() => setActiveNotification(null)}
      />
    </div>
  );
}
