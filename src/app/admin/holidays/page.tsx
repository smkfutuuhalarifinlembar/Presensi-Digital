"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Info,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function HolidaysPage() {
  const { theme } = useTheme();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());

  // Form state
  const [formData, setFormData] = useState({
    dateString: "",
    name: "",
    type: "NATIONAL",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isDark = theme === "dark";

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/holidays?year=${currentYear}&month=${currentMonth + 1}`);
      if (res.ok) {
        const json = await res.json();
        setHolidays(json.holidays || []);
      }
    } catch (err) {
      console.error("Gagal memuat data libur:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentMonth, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setResult({ type: "success", text: "Hari libur berhasil ditambahkan." });
        setIsModalOpen(false);
        setFormData({ dateString: "", name: "", type: "NATIONAL", description: "" });
        fetchHolidays();
      } else {
        setFormError(json.error || "Gagal menyimpan data libur.");
      }
    } catch (err: any) {
      setFormError("Terjadi kesalahan sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      const json = await res.json();

      if (res.ok && json.success) {
        setResult({ type: "success", text: "Hari libur berhasil dihapus." });
        fetchHolidays();
      } else {
        setResult({ type: "error", text: json.error || "Gagal menghapus data libur." });
      }
    } catch (err) {
      setResult({ type: "error", text: "Terjadi kesalahan sistem." });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Calendar helpers
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const getHolidayForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return holidays.find((h) => h.dateString === dateStr);
  };

  const isSunday = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date.getDay() === 0;
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const bulanOptions = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const tahunOptions: number[] = [];
  for (let y = today.getFullYear() - 2; y <= today.getFullYear() + 3; y++) {
    tahunOptions.push(y);
  }

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isDark ? "text-slate-100" : "text-slate-800"
          }`}>
            Kelola Hari Libur
          </h1>
          <p className={`text-sm mt-1 ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}>
            Tandai tanggal libur nasional, sekolah, dan hari Minggu
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ dateString: "", name: "", type: "NATIONAL", description: "" });
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Libur</span>
        </button>
      </div>

      {result && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm ${
            result.type === "success"
              ? isDark
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                : "bg-emerald-50 border-emerald-300 text-emerald-700"
              : isDark
              ? "bg-rose-950/80 border-rose-500 text-rose-200"
              : "bg-rose-50 border-rose-300 text-rose-700"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{result.text}</span>
        </div>
      )}

      {/* Info Box */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
        isDark
          ? "bg-blue-950/40 border-blue-500/30 text-blue-200"
          : "bg-blue-50 border-blue-200 text-blue-700"
      }`}>
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold">Informasi Hari Libur:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Hari Minggu otomatis dianggap libur (tidak perlu ditandai)</li>
            <li>Tanggal yang ditandai libur tidak dihitung sebagai "Alpa"</li>
            <li>Libur Nasional: Hari libur resmi pemerintah</li>
            <li>Libur Sekolah: Hari libur khusus sekolah (libur semester, dll)</li>
          </ul>
        </div>
      </div>

      {/* Calendar */}
      <div className={`rounded-3xl p-6 shadow-xl border ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}>
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPrevMonth}
            className={`p-2 rounded-xl transition ${
              isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-blue-500 border ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-slate-50 border-slate-300 text-slate-700"
              }`}
            >
              {bulanOptions.map((b, idx) => (
                <option key={idx} value={idx}>
                  {b}
                </option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-blue-500 border ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-slate-50 border-slate-300 text-slate-700"
              }`}
            >
              {tahunOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={goToNextMonth}
            className={`p-2 rounded-xl transition ${
              isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
            <div
              key={day}
              className={`text-center text-xs font-semibold py-2 ${
                day === "Min"
                  ? isDark
                    ? "text-rose-400"
                    : "text-rose-500"
                  : isDark
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const holiday = getHolidayForDay(day);
            const sunday = isSunday(day);
            const todayDate = isToday(day);
            const isHoliday = holiday || sunday;

            return (
              <div
                key={day}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition cursor-pointer ${
                  todayDate
                    ? isDark
                      ? "bg-blue-600/30 border-2 border-blue-500"
                      : "bg-blue-100 border-2 border-blue-400"
                    : isHoliday
                    ? isDark
                      ? "bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30"
                      : "bg-rose-50 border border-rose-300 hover:bg-rose-100"
                    : isDark
                    ? "hover:bg-slate-800 border border-transparent"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
                onClick={() => {
                  if (holiday) {
                    setDeleteConfirm(holiday.id);
                  } else {
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    setFormData({ dateString: dateStr, name: "", type: "NATIONAL", description: "" });
                    setFormError(null);
                    setIsModalOpen(true);
                  }
                }}
              >
                <span
                  className={`text-sm font-semibold ${
                    todayDate
                      ? "text-blue-400"
                      : sunday
                      ? isDark
                        ? "text-rose-400"
                        : "text-rose-500"
                      : holiday
                      ? isDark
                        ? "text-rose-300"
                        : "text-rose-600"
                      : isDark
                      ? "text-slate-300"
                      : "text-slate-700"
                  }`}
                >
                  {day}
                </span>
                {holiday && (
                  <div className="absolute bottom-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  </div>
                )}
                {sunday && !holiday && (
                  <div className="absolute bottom-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className={`flex items-center justify-center gap-4 mt-4 pt-4 border-t ${
          isDark ? "border-slate-700" : "border-slate-200"
        }`}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Hari Ini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Libur</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Minggu</span>
          </div>
        </div>
      </div>

      {/* Holiday List */}
      <div className={`rounded-3xl p-6 shadow-xl border ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}>
        <h2 className={`font-bold text-base mb-4 ${
          isDark ? "text-slate-100" : "text-slate-800"
        }`}>
          Daftar Libur Bulan {bulanOptions[currentMonth]} {currentYear}
        </h2>

        {isLoading ? (
          <div className={`p-8 text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : holidays.length === 0 ? (
          <div className={`p-8 text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada libur yang ditandai bulan ini.</p>
            <p className="text-xs mt-1">Hari Minggu otomatis dianggap libur.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark
                    ? "bg-slate-800/60 border-slate-700"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}>
                      {holiday.name}
                    </div>
                    <div className={`text-xs ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {new Date(holiday.dateString + "T00:00:00").toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-500">
                        {holiday.type === "NATIONAL" ? "Nasional" : "Sekolah"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteConfirm(holiday.id)}
                  className={`p-2 rounded-lg transition ${
                    isDark
                      ? "text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                      : "text-slate-400 hover:text-rose-500 hover:bg-slate-100"
                  }`}
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${
            isDark ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? "border-slate-800" : "border-slate-200"
            }`}>
              <h3 className={`font-bold text-base ${
                isDark ? "text-slate-100" : "text-slate-800"
              }`}>
                Tambah Hari Libur
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1 rounded-lg ${
                  isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                  isDark
                    ? "bg-rose-950/80 border-rose-500 text-rose-200"
                    : "bg-rose-50 border-rose-300 text-rose-700"
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}>
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formData.dateString}
                  onChange={(e) => setFormData({ ...formData, dateString: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 border ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-slate-200"
                      : "bg-slate-50 border-slate-300 text-slate-800"
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}>
                  Nama Libur
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Hari Raya Idul Fitri"
                   className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 border ${
                     isDark
                       ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-400"
                       : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
                   }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}>
                  Tipe Libur
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 border ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-slate-200"
                      : "bg-slate-50 border-slate-300 text-slate-800"
                  }`}
                >
                  <option value="NATIONAL">Libur Nasional</option>
                  <option value="SCHOOL">Libur Sekolah</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}>
                  Keterangan (Opsional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  rows={2}
                   className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 border resize-none ${
                     isDark
                       ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-400"
                       : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
                   }`}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t" style={{ borderColor: isDark ? "#334155" : "#e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${
            isDark ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
          }`}>
            <h3 className={`font-bold text-base mb-2 ${
              isDark ? "text-slate-100" : "text-slate-800"
            }`}>
              Hapus Hari Libur
            </h3>
            <p className={`text-sm mb-4 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}>
              Apakah Anda yakin ingin menghapus hari libur ini?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
