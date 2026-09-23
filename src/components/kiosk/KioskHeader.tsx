"use client";

import React, { useState, useEffect } from "react";
import Link from "next/server";
import { Clock, Calendar, Shield, Activity as ActivityIcon } from "lucide-react";
import { formatDateIndo } from "@/lib/date-utils";

interface KioskHeaderProps {
  school: {
    name: string;
    kioskHeaderSubtitle?: string | null;
    logoUrl?: string | null;
  };
  todayActivities: any[];
  activeActivity: any | null;
}

export default function KioskHeader({
  school,
  todayActivities,
  activeActivity,
}: KioskHeaderProps) {
  const [time, setTime] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setTime(`${h}:${m}:${s}`);
      setDateStr(formatDateIndo(now));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 text-white px-4 sm:px-8 py-2.5 sm:py-3 shadow-xl z-20 shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Identitas Sekolah */}
        <div className="flex items-center gap-4 text-center md:text-left">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt="Logo Sekolah"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl bg-white/5 p-1 border border-white/10 shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              {school.name || "SMK Negeri 1 Nusantara"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 font-medium mt-0.5">
              {school.kioskHeaderSubtitle || "Sistem Presensi Digital Terpadu"}
            </p>
          </div>
        </div>

        {/* Jam & Tanggal Digital Real-Time */}
        <div className="flex items-center gap-3 sm:gap-6 bg-slate-800/80 px-4 sm:px-6 py-2.5 rounded-2xl border border-slate-700/80 shadow-inner">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)] bg-slate-900/70 px-3 py-1 rounded-xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
              {time || "--:--:--"}
            </div>
            <div className="text-xs sm:text-sm text-slate-200 font-medium flex items-center justify-end gap-1.5 bg-slate-900/70 px-3 py-1 rounded-lg border border-slate-700/50 shadow-lg backdrop-blur-sm mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              {dateStr || "Memuat tanggal..."}
            </div>
          </div>
        </div>
      </div>

      {/* Baris Jadwal Kegiatan Hari Ini */}
      {todayActivities.length > 0 && (
        <div className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-200 bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
            <ActivityIcon className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-200">
              Jadwal Hari Ini:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {todayActivities.map((act) => {
              const isActive = act.state === "ACTIVE";
              const isUpcoming = act.state === "UPCOMING";
              const isCompleted = act.state === "COMPLETED";

              let badgeStyle = "bg-slate-800/60 text-slate-400 border-slate-700";
              if (isActive) {
                badgeStyle =
                  "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10 animate-pulse";
              } else if (isUpcoming) {
                badgeStyle = "bg-blue-500/15 text-blue-300 border-blue-500/30";
              }

              return (
                <div
                  key={act.id}
                  className={`px-3 py-1 rounded-full border flex items-center gap-2 font-medium ${badgeStyle}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${isActive
                      ? "bg-emerald-400"
                      : isUpcoming
                        ? "bg-blue-400"
                        : "bg-slate-500"
                      }`}
                  />
                  <span>{act.name}</span>
                  <span className="opacity-75 font-mono text-[11px]">
                    ({act.startTime} - {act.endTime})
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-90 px-1.5 py-0.5 rounded bg-black/20">
                    {act.stateLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
