"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HeartPulse,
  XCircle,
  Calendar,
  Radio,
  CreditCard,
  Edit3,
  FileSpreadsheet,
  ArrowRight,
  Shield,
  Activity as ActivityIcon,
} from "lucide-react";
import { formatDateIndo } from "@/lib/date-utils";
import { useTheme } from "@/context/ThemeContext";

// Bar Chart Component
function BarChart({ data, theme }: { data: { label: string; value: number; color: string }[]; theme: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const isDark = theme === "dark";

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const percentage = (item.value / maxValue) * 100;
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={isDark ? "text-slate-300" : "text-slate-600"}>{item.label}</span>
              <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{item.value}</span>
            </div>
            <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Donut Chart Component
function DonutChart({ data, theme }: { data: { label: string; value: number; color: string }[]; theme: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const isDark = theme === "dark";

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Belum ada data</span>
      </div>
    );
  }

  let cumulativePercent = 0;
  const size = 160;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, idx) => {
          const percent = (item.value / total) * 100;
          const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -(cumulativePercent / 100) * circumference;
          cumulativePercent += percent;

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="mt-4 space-y-1 w-full">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className={isDark ? "text-slate-300" : "text-slate-600"}>{item.label}</span>
            </div>
            <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal Bar Chart for Categories
function CategoryBarChart({ data, theme }: { data: { label: string; hadir: number; terlambat: number; izin: number; sakit: number }[]; theme: string }) {
  const isDark = theme === "dark";
  const maxValue = Math.max(...data.flatMap((d) => [d.hadir, d.terlambat, d.izin, d.sakit]), 1);

  return (
    <div className="space-y-4">
      {data.map((item, idx) => {
        const total = item.hadir + item.terlambat + item.izin + item.sakit;
        return (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                {item.label}
              </span>
              <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {total} total
              </span>
            </div>
            <div className={`flex h-6 rounded-lg overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
              {item.hadir > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${(item.hadir / maxValue) * 100}%`, minWidth: item.hadir > 0 ? "20px" : "0" }}
                  title={`Hadir: ${item.hadir}`}
                >
                  <span className="text-[9px] text-white font-bold">{item.hadir}</span>
                </div>
              )}
              {item.terlambat > 0 && (
                <div
                  className="h-full bg-amber-500 transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${(item.terlambat / maxValue) * 100}%`, minWidth: item.terlambat > 0 ? "20px" : "0" }}
                  title={`Terlambat: ${item.terlambat}`}
                >
                  <span className="text-[9px] text-white font-bold">{item.terlambat}</span>
                </div>
              )}
              {item.izin > 0 && (
                <div
                  className="h-full bg-blue-500 transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${(item.izin / maxValue) * 100}%`, minWidth: item.izin > 0 ? "20px" : "0" }}
                  title={`Izin: ${item.izin}`}
                >
                  <span className="text-[9px] text-white font-bold">{item.izin}</span>
                </div>
              )}
              {item.sakit > 0 && (
                <div
                  className="h-full bg-purple-500 transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${(item.sakit / maxValue) * 100}%`, minWidth: item.sakit > 0 ? "20px" : "0" }}
                  title={`Sakit: ${item.sakit}`}
                >
                  <span className="text-[9px] text-white font-bold">{item.sakit}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-center gap-4 pt-2">
        {[
          { label: "Hadir", color: "bg-emerald-500" },
          { label: "Terlambat", color: "bg-amber-500" },
          { label: "Izin", color: "bg-blue-500" },
          { label: "Sakit", color: "bg-purple-500" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { theme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Gagal memuat dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] ${
        theme === "dark" ? "text-slate-400" : "text-slate-500"
      }`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const breakdown = data?.breakdown || {
    ALL: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, totalRegistered: 0, totalCheckedIn: 0 },
    SISWA: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, total: 0 },
    GURU: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, total: 0 },
    PEGAWAI: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, total: 0 },
  };

  const todayActivities = data?.activities || [];

  // Chart data
  const barChartData = [
    { label: "Hadir Tepat Waktu", value: breakdown.ALL.hadir, color: "#10b981" },
    { label: "Terlambat", value: breakdown.ALL.terlambat, color: "#f59e0b" },
    { label: "Izin", value: breakdown.ALL.izin, color: "#3b82f6" },
    { label: "Sakit", value: breakdown.ALL.sakit, color: "#a855f7" },
    { label: "Alpa", value: breakdown.ALL.alpa, color: "#ef4444" },
  ];

  const donutChartData = [
    { label: "Hadir", value: breakdown.ALL.hadir, color: "#10b981" },
    { label: "Terlambat", value: breakdown.ALL.terlambat, color: "#f59e0b" },
    { label: "Izin", value: breakdown.ALL.izin, color: "#3b82f6" },
    { label: "Sakit", value: breakdown.ALL.sakit, color: "#a855f7" },
  ];

  const categoryBarData = [
    { label: "Siswa", hadir: breakdown.SISWA.hadir, terlambat: breakdown.SISWA.terlambat, izin: breakdown.SISWA.izin, sakit: breakdown.SISWA.sakit },
    { label: "Guru", hadir: breakdown.GURU.hadir, terlambat: breakdown.GURU.terlambat, izin: breakdown.GURU.izin, sakit: breakdown.GURU.sakit },
    { label: "Pegawai", hadir: breakdown.PEGAWAI.hadir, terlambat: breakdown.PEGAWAI.terlambat, izin: breakdown.PEGAWAI.izin, sakit: breakdown.PEGAWAI.sakit },
  ];

  return (
    <div className="space-y-8">
      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
            theme === "dark" ? "text-slate-100" : "text-slate-800"
          }`}>
            Dashboard Presensi Hari Ini
          </h1>
          <p className={`text-sm mt-1 flex items-center gap-2 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>{formatDateIndo(new Date())}</span>
          </p>
        </div>

        {/* Quick Actions Header */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/manual"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
          >
            <Edit3 className="w-4 h-4" />
            <span>Input Manual</span>
          </Link>
          <Link
            href="/"
            target="_blank"
            className={`px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Layar Kiosk</span>
          </Link>
        </div>
      </div>

      {/* Ringkasan 4 Kartu Utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Hadir Tepat Waktu */}
        <div className={`rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-lg border ${
          theme === "dark"
            ? "bg-slate-900/80 border-emerald-500/30"
            : "bg-white border-emerald-300"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
              Hadir Tepat
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className={`text-3xl sm:text-4xl font-black mt-3 ${
            theme === "dark" ? "text-emerald-400" : "text-emerald-600"
          }`}>
            {breakdown.ALL.hadir}
          </div>
          <div className={`text-[11px] mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            {breakdown.ALL.totalCheckedIn > 0
              ? `${Math.round((breakdown.ALL.hadir / breakdown.ALL.totalCheckedIn) * 100)}% dari total`
              : "Belum ada data"}
          </div>
        </div>

        {/* Terlambat */}
        <div className={`rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-lg border ${
          theme === "dark"
            ? "bg-slate-900/80 border-amber-500/30"
            : "bg-white border-amber-300"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Terlambat
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className={`text-3xl sm:text-4xl font-black mt-3 ${
            theme === "dark" ? "text-amber-400" : "text-amber-600"
          }`}>
            {breakdown.ALL.terlambat}
          </div>
          <div className={`text-[11px] mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            {breakdown.ALL.totalCheckedIn > 0
              ? `${Math.round((breakdown.ALL.terlambat / breakdown.ALL.totalCheckedIn) * 100)}% dari total`
              : "Belum ada data"}
          </div>
        </div>

        {/* Izin */}
        <div className={`rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-lg border ${
          theme === "dark"
            ? "bg-slate-900/80 border-blue-500/30"
            : "bg-white border-blue-300"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
              Izin
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className={`text-3xl sm:text-4xl font-black mt-3 ${
            theme === "dark" ? "text-blue-400" : "text-blue-600"
          }`}>
            {breakdown.ALL.izin}
          </div>
          <div className={`text-[11px] mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            Surat izin masuk sistem
          </div>
        </div>

        {/* Sakit */}
        <div className={`rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-lg border ${
          theme === "dark"
            ? "bg-slate-900/80 border-purple-500/30"
            : "bg-white border-purple-300"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">
              Sakit
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className={`text-3xl sm:text-4xl font-black mt-3 ${
            theme === "dark" ? "text-purple-400" : "text-purple-600"
          }`}>
            {breakdown.ALL.sakit}
          </div>
          <div className={`text-[11px] mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            Sakit terkonfirmasi
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className={`rounded-3xl p-6 shadow-xl border ${
          theme === "dark"
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-slate-200"
        }`}>
          <h2 className={`font-bold text-base mb-4 ${
            theme === "dark" ? "text-slate-100" : "text-slate-800"
          }`}>
            Diagram Batang Kehadiran
          </h2>
          <BarChart data={barChartData} theme={theme} />
        </div>

        {/* Donut Chart */}
        <div className={`rounded-3xl p-6 shadow-xl border ${
          theme === "dark"
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-slate-200"
        }`}>
          <h2 className={`font-bold text-base mb-4 ${
            theme === "dark" ? "text-slate-100" : "text-slate-800"
          }`}>
            Diagram Persentase
          </h2>
          <DonutChart data={donutChartData} theme={theme} />
        </div>

        {/* Category Bar Chart */}
        <div className={`rounded-3xl p-6 shadow-xl border ${
          theme === "dark"
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-slate-200"
        }`}>
          <h2 className={`font-bold text-base mb-4 ${
            theme === "dark" ? "text-slate-100" : "text-slate-800"
          }`}>
            Per Kategori
          </h2>
          <CategoryBarChart data={categoryBarData} theme={theme} />
        </div>
      </div>

      {/* Pintasan Aksi Pengelola */}
      <div className={`rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 border ${
        theme === "dark"
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-slate-200"
      }`}>
        <div>
          <h2 className={`font-bold text-base mb-1 ${
            theme === "dark" ? "text-slate-100" : "text-slate-800"
          }`}>
            Pintasan Pengelolaan
          </h2>
          <p className={`text-xs ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            Akses cepat ke fitur-fitur utama sistem
          </p>
        </div>

        <div className="space-y-2.5">
          {[
            { href: "/admin/people", icon: Users, color: "blue", label: "Kelola & Import Siswa/Guru" },
            { href: "/admin/id-card", icon: CreditCard, color: "emerald", label: "Cetak ID Card (KTP Ukuran A4)" },
            { href: "/admin/reports", icon: FileSpreadsheet, color: "purple", label: "Export Laporan ke Excel & PDF" },
            { href: "/admin/wa-gateway", icon: Radio, color: "amber", label: "Konfigurasi WhatsApp Gateway" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold transition ${
                  theme === "dark"
                    ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-100"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 text-${item.color}-500`} />
                  <span>{item.label}</span>
                </div>
                <ArrowRight className={`w-4 h-4 ${
                  theme === "dark" ? "text-slate-500" : "text-slate-400"
                }`} />
              </Link>
            );
          })}
        </div>

        <div className={`p-3 rounded-2xl text-[11px] ${
          theme === "dark"
            ? "bg-blue-950/40 border border-blue-500/30 text-blue-300"
            : "bg-blue-50 border border-blue-200 text-blue-700"
        }`}>
          💡 <strong>Tips:</strong> Siswa/guru yang lupa membawa kartu RFID dapat dicatatkan presensinya melalui menu <strong>Input Presensi Manual</strong>.
        </div>
      </div>
    </div>
  );
}
