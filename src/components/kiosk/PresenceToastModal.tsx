"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Clock, User, Award } from "lucide-react";

export interface PresenceNotificationData {
  id: string; // unique id per trigger so timer restarts
  name: string;
  nisNip: string;
  role: string;
  className?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  status: "HADIR" | "TERLAMBAT";
  time: string;
  activityName: string;
  method: string;
}

interface PresenceToastModalProps {
  data: PresenceNotificationData | null;
  onDismiss: () => void;
}

export default function PresenceToastModal({
  data,
  onDismiss,
}: PresenceToastModalProps) {
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    if (!data) return;

    // Reset progress bar to 100% setiap kali ada data baru (termasuk saat diinterupsi kartu berikutnya)
    setProgress(100);

    const duration = 5000; // 5 detik
    const interval = 50; // update setiap 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [data?.id]); // Restart setiap kali data.id berganti

  if (!data) return null;

  const isHadir = data.status === "HADIR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border-2 transition-all ${isHadir
            ? "bg-gradient-to-b from-slate-900 to-emerald-950/40 border-emerald-500/80 shadow-emerald-500/20"
            : "bg-gradient-to-b from-slate-900 to-amber-950/40 border-amber-500/80 shadow-amber-500/20"
          }`}
      >
        {/* Header Toast */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${isHadir
              ? "bg-gradient-to-r from-emerald-600 to-teal-600"
              : "bg-gradient-to-r from-amber-600 to-orange-600"
            }`}
        >
          <div className="flex items-center gap-2.5">
            {isHadir ? (
              <CheckCircle2 className="w-7 h-7 text-white animate-bounce" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-white animate-pulse" />
            )}
            <div>
              <h3 className="font-bold text-lg leading-tight tracking-wide">
                {isHadir ? "PRESENSI BERHASIL" : "TERCATAT TERLAMBAT"}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                {data.activityName} • Metode {data.method}
              </p>
            </div>
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-mono font-bold"
            style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "#ffffff" }}
          >
            {data.time}
          </div>
        </div>

        {/* Body Card */}
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          {/* Foto Profil / Avatar */}
          <div className="relative">
            {data.photoUrl ? (
              <img
                src={data.photoUrl}
                alt={data.name}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-slate-700 shadow-xl bg-slate-800"
              />
            ) : (
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center border-4 shadow-xl text-3xl font-black ${isHadir
                    ? "bg-emerald-900/60 border-emerald-500/50 text-emerald-300"
                    : "bg-amber-900/60 border-amber-500/50 text-amber-300"
                  }`}
              >
                {data.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
            )}
            <div
              className={`absolute -bottom-2 -right-2 p-1.5 rounded-xl border shadow-lg ${isHadir
                  ? "bg-emerald-500 text-white border-emerald-400"
                  : "bg-amber-500 text-white border-amber-400"
                }`}
            >
              <Award className="w-5 h-5" />
            </div>
          </div>

          {/* Informasi Orang */}
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div
              className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border mb-1"
              style={{ backgroundColor: "#1e293b", color: "#e2e8f0", borderColor: "#475569" }}
            >
              {data.role}
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">
              {data.name}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              ID: <span className="text-slate-200 font-mono">{data.nisNip}</span>
            </p>
            {(data.className || data.position) && (
              <p className="text-blue-400 text-sm font-semibold">
                {data.className || data.position}
              </p>
            )}

            <div className="pt-3">
              <span
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs tracking-wider uppercase border shadow-md"
                style={{
                  backgroundColor: isHadir ? "#064e3b" : "#78350f",
                  color: isHadir ? "#6ee7b7" : "#fcd34d",
                  borderColor: isHadir ? "#10b981" : "#f59e0b",
                }}
              >
                <Clock className="w-3.5 h-3.5" />
                {isHadir ? "HADIR TEPAT WAKTU" : "TERLAMBAT"}
              </span>
            </div>
          </div>
        </div>

        {/* Timer Bar (5 Detik Countdown) */}
        <div className="w-full bg-slate-800 h-1.5 relative overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${isHadir ? "bg-emerald-400" : "bg-amber-400"
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          className="px-6 py-2.5 text-[11px] text-center font-medium border-t border-slate-800/80"
          style={{
            backgroundColor: "#0f172a",
            color: "#f8fafc",
          }}
        >
          Notifikasi tertutup otomatis dalam 5 detik atau langsung berganti saat kartu berikutnya di-tap.
        </div>
      </div>
    </div>
  );
}
