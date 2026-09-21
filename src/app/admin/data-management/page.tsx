"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2,
  AlertTriangle,
  Users,
  CalendarDays,
  Activity,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Database,
  Clock,
} from "lucide-react";

export default function DataManagementPage() {
  const [counts, setCounts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Filters for targeted deletion
  const [attendanceFilter, setAttendanceFilter] = useState({
    startDate: "",
    endDate: "",
    role: "ALL",
    className: "ALL",
  });
  const [peopleFilter, setPeopleFilter] = useState({
    role: "ALL",
    className: "ALL",
  });

  const loadCounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/data-management");
      if (res.ok) {
        const json = await res.json();
        setCounts(json);
      }
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const handleDelete = async (type: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${getDeleteLabel(type)}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      let url = `/api/data-management?type=${type}`;

      if (type === "attendance") {
        if (attendanceFilter.startDate && attendanceFilter.endDate) {
          url += `&startDate=${attendanceFilter.startDate}&endDate=${attendanceFilter.endDate}`;
        }
        if (attendanceFilter.role !== "ALL") {
          url += `&role=${attendanceFilter.role}`;
        }
        if (attendanceFilter.className !== "ALL") {
          url += `&className=${attendanceFilter.className}`;
        }
      } else if (type === "people") {
        if (peopleFilter.role !== "ALL") {
          url += `&role=${peopleFilter.role}`;
        }
        if (peopleFilter.className !== "ALL") {
          url += `&className=${peopleFilter.className}`;
        }
      }

      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();

      if (res.ok && json.success) {
        setDeleteResult({ type: "success", text: json.message });
        loadCounts();
      } else {
        setDeleteResult({ type: "error", text: json.error || "Gagal menghapus data" });
      }
    } catch (err: any) {
      setDeleteResult({ type: "error", text: err.message || "Terjadi kesalahan" });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const getDeleteLabel = (type: string) => {
    switch (type) {
      case "attendance": return "data presensi";
      case "people": return "data orang";
      case "activities": return "data kegiatan";
      case "all": return "SEMUA data";
      default: return "data";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-rose-400" />
            Hapus Data
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola dan hapus data presensi, orang, kegiatan (Super Admin only)
          </p>
        </div>
      </div>

      {deleteResult && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm ${
            deleteResult.type === "success"
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
              : "bg-rose-950/80 border-rose-500 text-rose-200"
          }`}
        >
          {deleteResult.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{deleteResult.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <span>Memuat data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Delete Attendance */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Hapus Data Presensi</h3>
                <p className="text-xs text-slate-400">{counts?.counts?.attendance || 0} record tersimpan</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Dari Tanggal</label>
                  <input
                    type="date"
                    value={attendanceFilter.startDate}
                    onChange={(e) => setAttendanceFilter({ ...attendanceFilter, startDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={attendanceFilter.endDate}
                    onChange={(e) => setAttendanceFilter({ ...attendanceFilter, endDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Kategori</label>
                  <select
                    value={attendanceFilter.role}
                    onChange={(e) => setAttendanceFilter({ ...attendanceFilter, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Semua</option>
                    <option value="SISWA">Siswa</option>
                    <option value="GURU">Guru</option>
                    <option value="PEGAWAI">Pegawai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Kelas</label>
                  <select
                    value={attendanceFilter.className}
                    onChange={(e) => setAttendanceFilter({ ...attendanceFilter, className: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Semua</option>
                    <option value="X-RPL-1">X-RPL-1</option>
                    <option value="X-TKJ-1">X-TKJ-1</option>
                    <option value="XI-RPL-1">XI-RPL-1</option>
                    <option value="XI-TKJ-1">XI-TKJ-1</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDelete("attendance")}
              disabled={isDeleting}
              className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Presensi</span>
            </button>
          </div>

          {/* Delete People */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Hapus Data Orang</h3>
                <p className="text-xs text-slate-400">{counts?.counts?.people || 0} orang terdaftar</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Kategori</label>
                  <select
                    value={peopleFilter.role}
                    onChange={(e) => setPeopleFilter({ ...peopleFilter, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Semua</option>
                    <option value="SISWA">Siswa</option>
                    <option value="GURU">Guru</option>
                    <option value="PEGAWAI">Pegawai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Kelas</label>
                  <select
                    value={peopleFilter.className}
                    onChange={(e) => setPeopleFilter({ ...peopleFilter, className: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Semua</option>
                    <option value="X-RPL-1">X-RPL-1</option>
                    <option value="X-TKJ-1">X-TKJ-1</option>
                    <option value="XI-RPL-1">XI-RPL-1</option>
                    <option value="XI-TKJ-1">XI-TKJ-1</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDelete("people")}
              disabled={isDeleting}
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Orang</span>
            </button>
          </div>

          {/* Delete Activities */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Hapus Data Kegiatan</h3>
                <p className="text-xs text-slate-400">{counts?.counts?.activities || 0} kegiatan terdaftar</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Menghapus kegiatan tidak akan menghapus data presensi yang terkait.</span>
            </div>

            <button
              onClick={() => handleDelete("activities")}
              disabled={isDeleting}
              className="w-full px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Kegiatan</span>
            </button>
          </div>

          {/* Reset All Data */}
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Reset Semua Data</h3>
                <p className="text-xs text-slate-400">Hapus seluruh data (kecuali akun & pengaturan)</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Peringatan:</strong> Tindakan ini akan menghapus SEMUA data presensi, orang, kegiatan, dan log audit. 
                Pengaturan sekolah dan akun admin tetap dipertahankan.
              </span>
            </div>

            <button
              onClick={() => handleDelete("all")}
              disabled={isDeleting}
              className="w-full px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Semua Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200 space-y-2">
        <p className="font-bold text-blue-100">ℹ️ Informasi Hapus Data:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Data yang dihapus tidak dapat dikembalikan (kecuali dari backup)</li>
          <li>Hapus data orang akan menonaktifkan akun (soft delete) beserta seluruh riwayat presensinya</li>
          <li>Sebaiki backup data sebelum melakukan penghapusan massal</li>
          <li>Log audit akan mencatat setiap penghapusan data</li>
        </ul>
      </div>
    </div>
  );
}
