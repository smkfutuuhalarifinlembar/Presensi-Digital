"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Search,
  Download,
  CheckCircle2,
  Clock,
  HeartPulse,
  XCircle,
  FileText,
  Grid3X3,
  List,
} from "lucide-react";
import { getTodayDateString, formatDateIndo } from "@/lib/date-utils";

type ViewMode = "list" | "matrix";

// Util: format date menjadi YYYY-MM-DD menggunakan waktu LOKAL (bukan UTC)
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReportsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any>(null);
  const [summary, setSummary] = useState<Record<string, number>>({
    TOTAL: 0,
    HADIR: 0,
    TERLAMBAT: 0,
    IZIN: 0,
    SAKIT: 0,
    ALPA: 0,
    BOLOS: 0,
    DINAS_LUAR: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  // Filters
  const today = getTodayDateString();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  // Default: rentang = 1 hari pertama s.d hari terakhir bulan BERJALAN (kalender)
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [startDate, setStartDate] = useState<string>(formatLocalDate(firstDayOfMonth));
  const [endDate, setEndDate] = useState<string>(formatLocalDate(lastDayOfMonth));
  const [activityId, setActivityId] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Hitung startDate & endDate dari bulan yang dipilih (sesuai kalender)
  const updateDateRange = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    setStartDate(formatLocalDate(firstDay));
    setEndDate(formatLocalDate(lastDay));
  };

  // Saat bulan/tahun berubah, update date range
  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    updateDateRange(month, selectedYear);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    updateDateRange(selectedMonth, year);
  };

  // Nama bulan dalam Bahasa Indonesia
  const bulanOptions = [
    { value: 0, label: "Januari" },
    { value: 1, label: "Februari" },
    { value: 2, label: "Maret" },
    { value: 3, label: "April" },
    { value: 4, label: "Mei" },
    { value: 5, label: "Juni" },
    { value: 6, label: "Juli" },
    { value: 7, label: "Agustus" },
    { value: 8, label: "September" },
    { value: 9, label: "Oktober" },
    { value: 10, label: "November" },
    { value: 11, label: "Desember" },
  ];

  // Generate tahun options (5 tahun terakhir sampai 2 tahun ke depan)
  const tahunOptions: number[] = [];
  for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 2; y++) {
    tahunOptions.push(y);
  }

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        activityId,
        role: roleFilter,
        className: classFilter,
        status: statusFilter,
        search: searchQuery,
        view: viewMode,
        limit: "200",
      });

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (viewMode === "matrix") {
          setMatrix(json);
          setRecords([]);
          // Kalkulasi summary dari data matriks per orang
          // (H, T, I, S, A, B, DL sudah dikalkulasi di backend)
          const rows = json.matrix || [];
          const totalSummary: Record<string, number> = {
            TOTAL: 0,
            HADIR: 0,
            TERLAMBAT: 0,
            IZIN: 0,
            SAKIT: 0,
            ALPA: 0,
            BOLOS: 0,
            DINAS_LUAR: 0,
          };
          for (const row of rows) {
            const s = row.summary || {};
            totalSummary.HADIR += s.H || 0;
            totalSummary.TERLAMBAT += s.T || 0;
            totalSummary.IZIN += s.I || 0;
            totalSummary.SAKIT += s.S || 0;
            totalSummary.ALPA += s.A || 0;
            totalSummary.BOLOS += s.B || 0;
            totalSummary.DINAS_LUAR += s.D || 0;
          }
          totalSummary.TOTAL =
            totalSummary.HADIR +
            totalSummary.TERLAMBAT +
            totalSummary.IZIN +
            totalSummary.SAKIT +
            totalSummary.ALPA +
            totalSummary.BOLOS +
            totalSummary.DINAS_LUAR;
          setSummary(totalSummary);
        } else {
          setRecords(json.records || []);
          setMatrix(null);
          if (json.summary) setSummary(json.summary);
        }
      }
    } catch (err) {
      console.error("Gagal memuat laporan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch filter dropdown options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [resAct, resPeople, resSettings] = await Promise.all([
          fetch("/api/activities"),
          fetch("/api/people?limit=1"),
          fetch("/api/settings"),
        ]);
        if (resAct.ok) {
          const j = await resAct.json();
          setActivities(j.activities || []);
        }
        if (resPeople.ok) {
          const j = await resPeople.json();
          setClasses(j.classes || []);
        }
        if (resSettings.ok) {
          const j = await resSettings.json();
          if (j.settings) {
            let lines = [];
            try { lines = JSON.parse(j.settings.headerLines || '[]'); } catch { lines = []; }
            setSchoolSettings({ ...j.settings, headerLines: lines });
          }
        }
      } catch { }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, activityId, roleFilter, classFilter, statusFilter, viewMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  const handlePrint = () => {
    if (viewMode === "matrix") {
      // Untuk matriks & bulanan, paksa landscape
      const css = document.createElement("style");
      css.id = "__force_landscape__";
      css.innerHTML = `@page { size: A4 landscape !important; margin: 8mm 6mm !important; }`;
      document.head.appendChild(css);
    }
    window.print();
    setTimeout(() => {
      const el = document.getElementById("__force_landscape__");
      if (el) el.remove();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman (Disembunyikan saat cetak) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Rekap & Laporan Presensi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Laporan kehadiran harian, mingguan, dan bulanan siap export Excel dan cetak A4
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${viewMode === "list"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <List className="w-3.5 h-3.5" /> Daftar
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${viewMode === "matrix"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" /> Matriks Bulanan
            </button>
          </div>

          {/* Tombol Cetak Langsung (Print-friendly) */}
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Cetak</span>
          </button>

          {/* Tombol Export Excel */}
          <a
            href={`/api/reports/export?startDate=${startDate}&endDate=${endDate}&activityId=${activityId}&role=${roleFilter}&className=${classFilter}&status=${statusFilter}`}
            download
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Filter Panel (Disembunyikan saat cetak) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        {/* Bulan & Tahun Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Periode Bulan:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              {bulanOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              {tahunOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400 ml-2">
              ({bulanOptions[selectedMonth].label} {selectedYear})
            </span>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Kegiatan</label>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Kegiatan</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Kategori</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="SISWA">Siswa</option>
              <option value="GURU">Guru</option>
              <option value="PEGAWAI">Pegawai & Staf</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Kelas</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Status Kehadiran</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="HADIR">Hadir Tepat Waktu</option>
              <option value="TERLAMBAT">Terlambat</option>
              <option value="IZIN">Izin</option>
              <option value="SAKIT">Sakit</option>
              <option value="ALPA">Alpa</option>
              <option value="BOLOS">Bolos</option>
              <option value="DINAS_LUAR">Dinas Luar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Chips (Hanya tampil di layar, disembunyikan saat print) */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-slate-400 block font-semibold">
            Total Presensi
          </span>
          <span className="text-2xl font-black text-white font-mono">
            {summary.TOTAL || records.length}
          </span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-emerald-400 block font-semibold">
            Hadir Tepat Waktu
          </span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {summary.HADIR || 0}
          </span>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-amber-400 block font-semibold">
            Terlambat
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono">
            {summary.TERLAMBAT || 0}
          </span>
        </div>

        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-blue-400 block font-semibold">
            Izin
          </span>
          <span className="text-2xl font-black text-blue-400 font-mono">
            {summary.IZIN || 0}
          </span>
        </div>

        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-purple-400 block font-semibold">
            Sakit
          </span>
          <span className="text-2xl font-black text-purple-400 font-mono">
            {summary.SAKIT || 0}
          </span>
        </div>

        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-rose-400 block font-semibold">
            Alpa / Bolos
          </span>
          <span className="text-2xl font-black text-rose-400 font-mono">
            {(summary.ALPA || 0) + (summary.BOLOS || 0)}
          </span>
        </div>
      </div>

      {/* Kop Surat (Print Header) */}
      <div className="hidden print:block">
        <div className="relative text-center border-b-2 border-slate-900 pb-3 mb-2">
          {schoolSettings?.headerLogoLeftUrl && (
            <img src={schoolSettings.headerLogoLeftUrl} alt="Logo Kiri" className="absolute top-0 left-0 w-16 h-16 object-contain" />
          )}
          {schoolSettings?.headerLogoRightUrl && (
            <img src={schoolSettings.headerLogoRightUrl} alt="Logo Kanan" className="absolute top-0 right-0 w-16 h-16 object-contain" />
          )}
          <div className="mt-2">
            {(schoolSettings?.headerLines || [{ text: "LAPORAN REKAPITULASI PRESENSI", fontSize: "text-lg" }]).map((line: any, i: number) => {
              const lineObj = typeof line === "object" ? line : { text: line, fontSize: "text-lg" };
              return (
                <p key={i} className={`font-black ${lineObj.fontSize || "text-lg"} ${i === 0 ? 'uppercase' : ''}`}>
                  {lineObj.text || line}
                </p>
              );
            })}
          </div>
        </div>
        <p className="text-sm font-semibold">Periode: {formatDateIndo(startDate)} s.d {formatDateIndo(endDate)}</p>
        <p className="text-xs text-slate-600 mt-0.5">Kategori: {roleFilter === "ALL" ? "Semua Kategori" : roleFilter} | Kelas: {classFilter === "ALL" ? "Semua Kelas" : classFilter}</p>
      </div>

      {/* Tabel Data Rekap Presensi (Print-Friendly A4) */}
      <div className="bg-slate-900 border border-slate-800 print:border-none rounded-3xl overflow-hidden shadow-xl print:shadow-none">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <span>Memuat data laporan...</span>
          </div>
        ) : viewMode === "matrix" ? (
          <MatrixView matrix={matrix} isMonthly={true} />
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Tidak ada data presensi pada rentang filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300 print:text-slate-900 print-table">
              <thead className="bg-slate-800/80 print:bg-slate-100 text-slate-400 print:text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="px-4 py-3 font-bold w-10">No</th>
                  <th className="px-4 py-3 font-bold">Waktu & Tanggal</th>
                  <th className="px-4 py-3 font-bold">Nama Lengkap</th>
                  <th className="px-3 py-3 font-bold">ID</th>
                  <th className="px-3 py-3 font-bold">Kelas / Jabatan</th>
                  <th className="px-3 py-3 font-bold">Kegiatan</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 font-bold">Metode</th>
                  <th className="px-4 py-3 font-bold">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                {records.map((r, idx) => {
                  const isHadir = r.status === "HADIR";
                  const isTerlambat = r.status === "TERLAMBAT";

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                      <td className="px-4 py-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono">
                        <div>{r.timeString} WIB</div>
                        <div className="text-[11px] text-slate-500">{r.dateString}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-white print:text-slate-900">
                        {r.person?.name || "-"}
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-400 print:text-slate-700">
                        {r.person?.nisNip || "-"}
                      </td>
                      <td className="px-3 py-3 text-slate-400 print:text-slate-700">
                        {r.person?.className || r.person?.position || r.person?.role}
                      </td>
                      <td className="px-3 py-3 text-slate-300 print:text-slate-800">
                        {r.activity?.name || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isHadir
                            ? "bg-emerald-500/20 text-emerald-400 print:text-slate-900"
                            : isTerlambat
                              ? "bg-amber-500/20 text-amber-400 print:text-slate-900"
                              : "bg-blue-500/20 text-blue-400 print:text-slate-900"
                            }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] font-mono text-slate-400">
                        {r.method}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 print:text-slate-700">
                        {r.remarks || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_LETTER: Record<string, string> = {
  HADIR: "H",
  TERLAMBAT: "T",
  IZIN: "I",
  SAKIT: "S",
  ALPA: "A",
  BOLOS: "B",
  DINAS_LUAR: "DL",
  LIBUR: "L",
};

const STATUS_BG: Record<string, string> = {
  HADIR: "#d1fae5",
  TERLAMBAT: "#fef3c7",
  IZIN: "#dbeafe",
  SAKIT: "#ede9fe",
  ALPA: "#fee2e2",
  BOLOS: "#fecaca",
  DINAS_LUAR: "#e0e7ff",
  LIBUR: "#fecdd3",
};

function MatrixView({ matrix, isMonthly = false }: { matrix: any; isMonthly?: boolean }) {
  if (!matrix || !matrix.dates || matrix.dates.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Tidak ada data untuk rentang tanggal ini.
      </div>
    );
  }

  const dates: string[] = matrix.dates;
  const rows: any[] = matrix.matrix || [];

  // Untuk print: gunakan landscape agar tabel leluasa
  return (
    <div className="print-landscape">
      {/* Legend (Hanya tampil di layar) */}
      <div className="no-print p-4 bg-slate-800/60 border-b border-slate-800 flex flex-wrap gap-3 text-[11px]">
        <span className="font-bold text-white mr-2">Keterangan:</span>
        {Object.entries(STATUS_LETTER).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-5 h-5 rounded font-bold text-center leading-5"
              style={{ backgroundColor: STATUS_BG[k], color: "#0f172a" }}
            >
              {v}
            </span>
            <span className="text-slate-300">{k.replace("_", " ")}</span>
          </span>
        ))}
        {isMonthly && (
          <span className="inline-flex items-center gap-1.5 ml-2 text-emerald-300">
            <span
              className="inline-block w-5 h-5 rounded font-bold text-center leading-5"
              style={{ backgroundColor: STATUS_BG["LIBUR"], color: "#0f172a" }}
            >
              {STATUS_LETTER["LIBUR"]}
            </span>
            <span>= Libur / Minggu (tidak dihitung Alpa)</span>
          </span>
        )}
      </div>

      {/* Legend Print (Hanya tampil saat print) */}
      <div className="hidden print:flex flex-wrap gap-3 text-[7px] mb-2 justify-center border-b border-slate-300 pb-1">
        {Object.entries(STATUS_LETTER).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-0.5">
            <span className="font-bold">{v}</span>
            <span>= {k.replace("_", " ")}</span>
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="matrix-table w-full text-[10px] sm:text-xs text-slate-300 print:text-slate-900 border-collapse">
          <thead className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-slate-900 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 font-bold border border-slate-700 print:border-slate-300 text-left min-w-[140px] sticky left-0 bg-slate-800 print:bg-slate-100 z-20">
                Nama Lengkap
              </th>
              <th className="px-2 py-2 font-bold border border-slate-700 print:border-slate-300 text-left min-w-[60px]">
                ID
              </th>
              <th className="px-2 py-2 font-bold border border-slate-700 print:border-slate-300 text-left min-w-[60px]">
                Kelas/Jabatan
              </th>
              {dates.map((d) => {
                const day = parseInt(d.substring(8, 10), 10);
                return (
                  <th
                    key={d}
                    className="px-0.5 py-2 font-bold border border-slate-700 print:border-slate-300 text-center min-w-[22px]"
                    title={d}
                  >
                    {day}
                  </th>
                );
              })}
              <th className="px-0.5 py-2 font-bold border border-slate-700 print:border-slate-300 text-center print:bg-emerald-100" style={{ backgroundColor: "#022c22", color: "#6ee7b7" }}>H</th>
              <th className="px-0.5 py-2 font-bold border border-slate-700 print:border-slate-300 text-center print:bg-amber-100" style={{ backgroundColor: "#451a03", color: "#fcd34d" }}>T</th>
              <th className="px-0.5 py-2 font-bold border border-slate-700 print:border-slate-300 text-center print:bg-blue-100" style={{ backgroundColor: "#1e3a8a", color: "#bfdbfe" }}>I</th>
              <th className="px-0.5 py-2 font-bold border border-slate-700 print:border-slate-300 text-center print:bg-purple-100" style={{ backgroundColor: "#4c1d95", color: "#ddd6fe" }}>S</th>
              <th className="px-0.5 py-2 font-bold border border-slate-700 print:border-slate-300 text-center print:bg-rose-100" style={{ backgroundColor: "#7f1d1d", color: "#fecaca" }}>A</th>
              <th className="px-0.5 py-2 font-bold border border-slate-700 print:border-slate-300 text-center print:bg-fuchsia-100" style={{ backgroundColor: "#581c87", color: "#e9d5ff" }}>B</th>
              <th className="px-0.5 py-2 font-bold border border-slate-700 print:border-slate-300 text-center print:bg-indigo-100" style={{ backgroundColor: "#312e81", color: "#c7d2fe" }}>DL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.personId} className={idx % 2 === 0 ? "" : "bg-slate-800/20 print:bg-slate-50"}>
                <td className="px-2 py-1.5 font-bold text-white print:text-slate-900 border border-slate-700 print:border-slate-300 text-left whitespace-nowrap sticky left-0 bg-slate-900 print:bg-white z-10">
                  {row.name}
                </td>
                <td className="px-2 py-1.5 font-mono text-slate-300 print:text-slate-700 border border-slate-700 print:border-slate-300 text-left whitespace-nowrap">
                  {row.nisNip}
                </td>
                <td className="px-2 py-1.5 text-slate-400 print:text-slate-700 border border-slate-700 print:border-slate-300 text-left whitespace-nowrap">
                  {row.className || row.position || row.role}
                </td>
                {dates.map((d) => {
                  const v = row.cells[d];
                  const letter = STATUS_LETTER[v] || "";
                  const bg = STATUS_BG[v] || "transparent";
                  return (
                    <td
                      key={d}
                      className="px-1 py-1.5 border border-slate-700 print:border-slate-300 text-center font-bold"
                      style={{
                        backgroundColor: v ? bg : undefined,
                        color: v ? "#0f172a" : undefined,
                      }}
                    >
                      {letter || "-"}
                    </td>
                  );
                })}
                <td className="px-1 py-1.5 text-center font-bold text-emerald-300 print:text-slate-900 border border-slate-700 print:border-slate-300">{row.summary.H}</td>
                <td className="px-1 py-1.5 text-center font-bold text-amber-300 print:text-slate-900 border border-slate-700 print:border-slate-300">{row.summary.T}</td>
                <td className="px-1 py-1.5 text-center font-bold text-blue-300 print:text-slate-900 border border-slate-700 print:border-slate-300">{row.summary.I}</td>
                <td className="px-1 py-1.5 text-center font-bold text-purple-300 print:text-slate-900 border border-slate-700 print:border-slate-300">{row.summary.S}</td>
                <td className="px-1 py-1.5 text-center font-bold text-rose-300 print:text-slate-900 border border-slate-700 print:border-slate-300">{row.summary.A}</td>
                <td className="px-1 py-1.5 text-center font-bold text-fuchsia-300 print:text-slate-900 border border-slate-700 print:border-slate-300">{row.summary.B}</td>
                <td className="px-1 py-1.5 text-center font-bold text-indigo-300 print:text-slate-900 border border-slate-700 print:border-slate-300">{row.summary.D}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
