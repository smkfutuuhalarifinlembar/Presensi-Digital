"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity,
  Users,
  CheckCircle2,
  Clock,
  HeartPulse,
  XCircle,
  RefreshCw,
  Calendar,
  UserCheck,
  UserX,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  TrendingUp,
  Zap,
  BarChart3,
} from "lucide-react";
import { formatDateIndo } from "@/lib/date-utils";

export default function LiveMonitoringPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [previousCheckIn, setPreviousCheckIn] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/live", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const newCheckIn = json.checkedInAll;
        const isNewData = silent && data && newCheckIn > previousCheckIn;
        setData(json);
        setLastUpdate(new Date());

        if (isNewData && json.recent) {
          const newIds = new Set<string>();
          const currentTop = json.recent.slice(0, newCheckIn - previousCheckIn);
          currentTop.forEach((r: any) => newIds.add(r.id));
          setNewEntryIds(newIds);
          setIsFlashing(true);
          setTimeout(() => {
            setNewEntryIds(new Set());
            setIsFlashing(false);
          }, 3000);
        }
        setPreviousCheckIn(newCheckIn);
      }
    } catch (err) {
      console.error("Gagal memuat data live:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [data, previousCheckIn]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, [isPaused, fetchData]);

  // Handle fullscreen state
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Hitung total status
  const totalStats = data.byClass.reduce(
    (acc: any, c: any) => {
      acc.hadir += c.stats.hadir;
      acc.terlambat += c.stats.terlambat;
      acc.izin += c.stats.izin;
      acc.sakit += c.stats.sakit;
      acc.belum += c.stats.belum;
      acc.total += c.stats.total;
      return acc;
    },
    { hadir: 0, terlambat: 0, izin: 0, sakit: 0, belum: 0, total: 0 }
  );

  const overallPct = data.totalAll > 0 ? Math.round((data.checkedInAll / data.totalAll) * 100) : 0;
  const secondsAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : 0;

  return (
    <div ref={containerRef} className={isFullscreen ? "bg-slate-950 min-h-screen p-4 sm:p-6" : "space-y-6"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Activity className={`w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 ${isFlashing ? "animate-ping" : "animate-pulse"}`} />
            Live Monitoring Presensi
            {isFlashing && (
              <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase">
                <Zap className="w-3 h-3" /> Update
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            {formatDateIndo(new Date())} •
            <span className="text-emerald-300">Update {secondsAgo < 5 ? "baru saja" : `${secondsAgo} detik lalu`}</span>
            {!isPaused && <span>• Auto-refresh 5 detik</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              isPaused
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? "Lanjutkan" : "Pause"}
          </button>
          <button
            onClick={() => fetchData()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      {/* KPI Cards + Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Donut Chart */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-5 shadow-2xl lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Distribusi Status
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{totalStats.total} Orang</span>
          </div>
          <DonutChart
            segments={[
              { value: totalStats.hadir, color: "#10b981", label: "Hadir" },
              { value: totalStats.terlambat, color: "#f59e0b", label: "Telat" },
              { value: totalStats.izin, color: "#3b82f6", label: "Izin" },
              { value: totalStats.sakit, color: "#a855f7", label: "Sakit" },
              { value: totalStats.belum, color: "#64748b", label: "Belum" },
            ]}
            centerText={`${overallPct}%`}
            centerSubtext="Hadir"
          />
          <div className="mt-4 space-y-1.5">
            {[
              { label: "Hadir", value: totalStats.hadir, color: "bg-emerald-500" },
              { label: "Terlambat", value: totalStats.terlambat, color: "bg-amber-500" },
              { label: "Izin", value: totalStats.izin, color: "bg-blue-500" },
              { label: "Sakit", value: totalStats.sakit, color: "bg-purple-500" },
              { label: "Belum", value: totalStats.belum, color: "bg-slate-500" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span className="text-slate-300 font-semibold">{s.label}</span>
                </div>
                <span className="text-slate-200 font-bold font-mono">
                  {s.value} <span className="text-slate-500 text-[10px]">({totalStats.total > 0 ? Math.round((s.value / totalStats.total) * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart Per Class */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Progress Kehadiran per Kelas/Kategori
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Top {Math.min(8, data.byClass.length)}</span>
          </div>
          <BarChart
            data={data.byClass.slice(0, 8).map((c: any) => ({
              label: c.className,
              pct: c.stats.total > 0 ? Math.round((c.stats.checkedIn / c.stats.total) * 100) : 0,
              checkedIn: c.stats.checkedIn,
              total: c.stats.total,
            }))}
          />
        </div>
      </div>

      {/* Progress Bar Global */}
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 border rounded-3xl p-5 shadow-xl transition-all ${isFlashing ? "border-emerald-500 shadow-emerald-500/20" : "border-slate-700"}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Progress Kehadiran Hari Ini
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono flex items-baseline gap-2">
              <span className={isFlashing ? "text-emerald-300 transition" : "text-emerald-400"}>{data.checkedInAll}</span>
              <span className="text-slate-500 text-lg">/ {data.totalAll}</span>
              <span className="text-sm text-slate-300 ml-2 font-sans">
                ({overallPct}%)
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {data.totalAll - data.checkedInAll} orang belum presensi
            </div>
          </div>
          <div className="flex-1 max-w-md">
            <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700 ease-out"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Live Feed + Per Class */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              Aktivitas Terbaru
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Live</span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {data.recent && data.recent.length > 0 ? (
              data.recent.map((r: any) => {
                const info = getStatusInfo(r.status);
                const isNew = newEntryIds.has(r.id);
                return (
                  <div
                    key={r.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isNew
                        ? "bg-emerald-900/40 border-emerald-500/60 animate-pulse shadow-lg shadow-emerald-500/10"
                        : "bg-slate-800/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center shrink-0 border border-slate-700">
                        {r.photoUrl ? (
                          <img src={r.photoUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-[10px] font-bold text-blue-300">
                            {r.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          {r.name}
                          {isNew && <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500 text-white font-black">BARU</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {r.className || r.role} • {r.activity}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${info.cls}`}>
                          {info.label}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">{r.time}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-slate-500 text-xs py-8">
                Belum ada aktivitas presensi hari ini.
              </div>
            )}
          </div>
        </div>

        {/* Per Class Detail */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Filter:</span>
            {[
              { id: "ALL", label: "Semua" },
              { id: "BELUM", label: "Belum Presensi" },
              { id: "HADIR", label: "Hadir" },
              { id: "TERLAMBAT", label: "Terlambat" },
              { id: "SAKIT", label: "Sakit" },
              { id: "IZIN", label: "Izin" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filter === f.id
                    ? "bg-blue-600 text-white shadow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {data.byClass.map((cls: any) => {
              const filteredMembers = cls.members.filter((m: any) => {
                if (filter === "ALL") return true;
                if (filter === "BELUM") return m.status === "BELUM";
                return m.status === filter;
              });

              const pct = cls.stats.total > 0 ? Math.round((cls.stats.checkedIn / cls.stats.total) * 100) : 0;

              if (filter !== "ALL" && filteredMembers.length === 0) return null;

              return (
                <div
                  key={cls.className}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        {cls.className}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">{cls.role}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-300">
                        {cls.stats.checkedIn}/{cls.stats.total}
                      </span>
                      <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 w-8">{pct}%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <MiniStat color="emerald" icon={<CheckCircle2 className="w-2.5 h-2.5" />} value={cls.stats.hadir} label="Hadir" />
                    <MiniStat color="amber" icon={<Clock className="w-2.5 h-2.5" />} value={cls.stats.terlambat} label="Telat" />
                    <MiniStat color="purple" icon={<HeartPulse className="w-2.5 h-2.5" />} value={cls.stats.sakit} label="Sakit" />
                    <MiniStat color="blue" icon={<AlertTriangle className="w-2.5 h-2.5" />} value={cls.stats.izin} label="Izin" />
                    <MiniStat color="rose" icon={<UserX className="w-2.5 h-2.5" />} value={cls.stats.belum} label="Belum" />
                  </div>

                  {filteredMembers.length > 0 && filter !== "ALL" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {filteredMembers.slice(0, 20).map((m: any) => (
                        <PersonRow key={m.id} m={m} />
                      ))}
                      {filteredMembers.length > 20 && (
                        <div className="text-center text-[10px] text-slate-500 py-1">
                          +{filteredMembers.length - 20} lainnya
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutChart({ segments, centerText, centerSubtext }: { segments: { value: number; color: string; label: string }[]; centerText: string; centerSubtext: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg, i) => {
            if (seg.value === 0 || total === 0) return null;
            const pct = seg.value / total;
            const dasharray = `${pct * circumference} ${circumference}`;
            const dashoffset = -offset;
            offset += pct * circumference;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                style={{ transition: "stroke-dasharray 0.7s ease-out" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-black text-white">{centerText}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{centerSubtext}</div>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; pct: number; checkedIn: number; total: number }[] }) {
  if (data.length === 0) {
    return <div className="text-center text-slate-500 text-xs py-8">Belum ada data</div>;
  }
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const barColor = d.pct >= 80 ? "from-emerald-500 to-teal-400" : d.pct >= 50 ? "from-amber-500 to-orange-400" : "from-rose-500 to-red-400";
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-32 sm:w-40 text-xs text-slate-300 font-semibold truncate" title={d.label}>
              {d.label}
            </div>
            <div className="flex-1 h-6 bg-slate-800 rounded-lg overflow-hidden relative">
              <div
                className={`h-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out flex items-center justify-end px-2`}
                style={{ width: `${Math.max(d.pct, 4)}%` }}
              >
                {d.pct > 20 && (
                  <span className="text-[10px] font-black text-white drop-shadow">{d.pct}%</span>
                )}
              </div>
              {d.pct <= 20 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">
                  {d.pct}%
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono w-16 text-right shrink-0">
              {d.checkedIn}/{d.total}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ color, icon, value, label }: { color: string; icon: React.ReactNode; value: number; label: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${colorMap[color] || ""}`}>
      {icon}
      {value} {label}
    </span>
  );
}

function PersonRow({ m }: { m: any }) {
  const statusInfo = getStatusInfo(m.status);
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800/50 border border-slate-800">
      <div className="w-6 h-6 rounded-md bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
        {m.photoUrl ? (
          <img src={m.photoUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="font-bold text-[9px] text-blue-300">
            {m.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-white truncate">{m.name}</div>
      </div>
      <div className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${statusInfo.cls}`}>
        {statusInfo.label}
      </div>
    </div>
  );
}

function getStatusInfo(s: string) {
  switch (s) {
    case "HADIR": return { label: "H", cls: "bg-emerald-500/30 text-emerald-300" };
    case "TERLAMBAT": return { label: "T", cls: "bg-amber-500/30 text-amber-300" };
    case "IZIN": return { label: "I", cls: "bg-blue-500/30 text-blue-300" };
    case "SAKIT": return { label: "S", cls: "bg-purple-500/30 text-purple-300" };
    case "ALPA": return { label: "A", cls: "bg-rose-500/30 text-rose-300" };
    case "BOLOS": return { label: "B", cls: "bg-red-600/30 text-red-300" };
    case "DINAS_LUAR": return { label: "DL", cls: "bg-indigo-500/30 text-indigo-300" };
    default: return { label: "—", cls: "bg-slate-700 text-slate-300" };
  }
}
