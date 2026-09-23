"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, RefreshCw, AlertCircle, CheckCircle2, XCircle, ScanLine, Wifi } from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  isSubmitting: boolean;
  lastResult: { success: boolean; message: string; name?: string; time?: string; status?: string } | null;
  onResetResult: () => void;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScan,
  isSubmitting,
  lastResult,
  onResetResult,
}: QrScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "kiosk-qr-reader";
  const lastResultTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setIsStarting(true);
      if (lastResultTimer.current) {
        clearTimeout(lastResultTimer.current);
        lastResultTimer.current = null;
      }
      return;
    }

    let isMounted = true;
    setIsStarting(true);
    setErrorMsg(null);

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(readerElementId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          // qrbox responsif: ikut ukuran container (maks 250px, min 150px)
          qrbox: (viewWidth: number, viewHeight: number) => {
            const side = Math.max(150, Math.min(250, viewWidth, viewHeight));
            return { width: side, height: side };
          },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isMounted && !isSubmitting) {
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // Abaikan error frame pencarian biasa
          }
        );

        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Camera start error:", err);
          setErrorMsg(
            "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser."
          );
          setIsStarting(false);
        }
      }
    };

    const timeout = setTimeout(startScanner, 200);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-reset: setelah 2.5 detik, notifikasi hilang dan scanner tetap aktif
  useEffect(() => {
    if (lastResult) {
      if (lastResultTimer.current) clearTimeout(lastResultTimer.current);
      lastResultTimer.current = setTimeout(() => {
        onResetResult();
      }, 2500);
    }
    return () => {
      if (lastResultTimer.current) {
        clearTimeout(lastResultTimer.current);
        lastResultTimer.current = null;
      }
    };
  }, [lastResult]);

  if (!isOpen) return null;

  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* Mode Badge: QR Code Aktif */}
      <div
        className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-semibold mb-4"
        style={{
          backgroundColor: "#1e3a8a",
          borderColor: "#3b82f6",
          color: "#bfdbfe",
        }}
      >
        <Camera className="w-3.5 h-3.5 animate-pulse" />
        <span>Mode Aktif: Scan Kamera QR Code</span>
      </div>

      {/* Camera Area - scanner SELALU AKTIF dan tidak terhalang overlay apapun */}
      <div className="relative my-1">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 max-w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-blue-500/50 shadow-2xl flex items-center justify-center">
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 z-10 bg-slate-900/70">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              <span>Menghubungkan Kamera...</span>
            </div>
          )}

          {errorMsg ? (
            <div className="p-4 text-center text-rose-400 text-xs flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div id={readerElementId} className="w-full h-full" />
          )}
        </div>
      </div>

      {/* Notifikasi Berhasil/Gagal - DI LUAR area scanner, sehingga kamera tetap aktif */}
      {lastResult && lastResult.message !== "Memproses..." && (
        <div
          className={`mt-3 w-full max-w-sm px-4 py-3 rounded-2xl border-2 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            lastResult.success
              ? "bg-emerald-950/90 border-emerald-500/60"
              : "bg-rose-950/90 border-rose-500/60"
          }`}
        >
          {lastResult.success ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
          )}
          <div className="flex-1 text-left min-w-0">
            <div
              className={`text-sm font-black ${
                lastResult.success ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {lastResult.success ? "PRESENSI BERHASIL" : "PRESENSI GAGAL"}
            </div>
            {lastResult.name && (
              <div className="text-xs text-white font-semibold truncate">
                {lastResult.name}
                {lastResult.status && (
                  <span className="text-slate-300 font-normal"> • {lastResult.status}</span>
                )}
                {lastResult.time && (
                  <span className="text-slate-400 font-mono"> • {lastResult.time}</span>
                )}
              </div>
            )}
            {!lastResult.success && lastResult.message && (
              <div className="text-[11px] text-rose-200 truncate">
                ⚠ {lastResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indikator Sedang Memproses */}
      {isSubmitting && (
        <div className="mt-3 text-xs text-blue-300 font-semibold flex items-center gap-1.5 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Memproses presensi...
        </div>
      )}

      {/* Instruksi */}
      {!errorMsg && !isSubmitting && !lastResult && (
        <p className="text-slate-200 text-sm sm:text-base max-w-md mt-4 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-700/60 shadow-lg backdrop-blur-sm flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-blue-400" />
          Arahkan QR Code ID Card tepat ke dalam kotak scanner di atas.
        </p>
      )}

      {/* Tombol Kembali ke Mode RFID */}
      <div className="w-full flex items-center gap-4 my-5">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-xs text-slate-200 font-semibold uppercase tracking-wider bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg backdrop-blur-sm">
          Mode RFID
        </span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm sm:text-base border border-slate-700 hover:border-slate-600 shadow-lg flex items-center justify-center gap-3 transition transform active:scale-95"
      >
        <Wifi className="w-5 h-5 text-emerald-400" />
        <span>Beralih ke Mode RFID</span>
      </button>
    </div>
  );
}
