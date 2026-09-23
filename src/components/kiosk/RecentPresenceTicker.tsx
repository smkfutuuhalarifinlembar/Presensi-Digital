"use client";

import React from "react";
import { UserCheck, Clock, Radio, QrCode, Edit3 } from "lucide-react";

interface RecentPresenceTickerProps {
  recentAttendances: any[];
  stats: {
    total: number;
    hadir: number;
    terlambat: number;
  };
  /** Tampilan panel penuh tinggi (kolom kanan kiosk) dengan scroll internal */
  fullHeight?: boolean;
  /** Susun daftar jadi 1 kolom (untuk panel sempit di kolom kanan) */
  stackedList?: boolean;
}

export default function RecentPresenceTicker({
  recentAttendances,
  stats,
  fullHeight = false,
  stackedList = false,
}: RecentPresenceTickerProps) {
  return (
    <div
      className={`w-full bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col gap-4${fullHeight ? " flex-1 min-h-0 overflow-y-auto" : ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-tight bg-slate-900/70 px-3 py-1 rounded-xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
              Presensi Terbaru Hari Ini
            </h3>
            <p className="text-xs text-slate-200 bg-slate-900/70 px-3 py-1 rounded-lg border border-slate-700/50 shadow-lg backdrop-blur-sm mt-1">
              Menampilkan kehadiran yang baru saja tercatat
            </p>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-200 font-medium">
            Total: <span className="font-bold text-white font-mono">{stats.total}</span>
          </div>
          <div className="bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-300 font-medium">
            Hadir: <span className="font-bold font-mono">{stats.hadir}</span>
          </div>
          <div className="bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 font-medium">
            Terlambat: <span className="font-bold font-mono">{stats.terlambat}</span>
          </div>
        </div>
      </div>

      {/* List Recent */}
      {recentAttendances.length === 0 ? (
        <div className="text-center py-8 text-slate-200 text-sm bg-slate-900/70 px-4 py-3 rounded-xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
          Belum ada presensi yang tercatat hari ini.
        </div>
      ) : (
        <div className={`grid gap-3 ${stackedList ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"}`}>
          {recentAttendances.slice(0, 5).map((item) => {
            const isHadir = item.status === "HADIR";
            return (
              <div
                key={item.id}
                className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3 flex items-center gap-3 transition shadow-sm"
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 border ${isHadir
                      ? "bg-emerald-900/60 border-emerald-500/40 text-emerald-300"
                      : "bg-amber-900/60 border-amber-500/40 text-amber-300"
                    }`}
                >
                  {item.person?.name
                    ? item.person.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                    : "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {item.person?.name || "Anonim"}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {item.person?.className || item.person?.position || item.person?.role}
                  </div>
                </div>

                {/* Time & Status Badge */}
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${isHadir
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                  >
                    {item.status}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {item.timeString}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
