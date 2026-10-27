"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Building2,
  Tag,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface Institution {
  id: string;
  name: string;
  code: string;
  level: string;
}

interface HolidayItem {
  id: string;
  dateString: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  institutionId: string | null;
  institution: Institution | null;
}

export default function HolidaysPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayItem | null>(null);
  const [deleteConfirmHoliday, setDeleteConfirmHoliday] = useState<HolidayItem | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    dayNumber: number;
    holidays: HolidayItem[];
    isSunday: boolean;
  } | null>(null);

  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Calendar navigation state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());

  // Filter state
  const [filterInstitution, setFilterInstitution] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Add Form state
  const [formData, setFormData] = useState<{
    dateString: string;
    name: string;
    type: string;
    description: string;
    institutionId: string;
    startDate: string;
    endDate: string;
    useRange: boolean;
  }>({
    dateString: "",
    name: "",
    type: "NATIONAL",
    description: "",
    institutionId: "all",
    startDate: "",
    endDate: "",
    useRange: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Edit Form state
  const [editFormData, setEditFormData] = useState<{
    id: string;
    dateString: string;
    name: string;
    type: string;
    description: string;
    institutionId: string;
  }>({
    id: "",
    dateString: "",
    name: "",
    type: "NATIONAL",
    description: "",
    institutionId: "all",
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchInstitutions = async () => {
    try {
      const res = await fetch("/api/institutions?isActive=true", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setInstitutions(json.institutions || []);
      }
    } catch (err) {
      console.error("Gagal memuat data lembaga:", err);
    }
  };

  const fetchHolidays = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(currentYear),
        month: String(currentMonth + 1),
      });

      if (filterInstitution !== "all") {
        params.append("institutionId", filterInstitution);
      }
      if (filterType !== "all") {
        params.append("type", filterType);
      }

      const res = await fetch(`/api/holidays?${params.toString()}`);
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
    fetchInstitutions();
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [currentMonth, currentYear, filterInstitution, filterType]);

  const resetAddForm = (initialDate = "") => {
    setFormData({
      dateString: initialDate,
      name: "",
      type: "NATIONAL",
      description: "",
      institutionId: "all",
      startDate: initialDate,
      endDate: "",
      useRange: false,
    });
    setFormError(null);
  };

  const handleOpenAddModal = (targetDate = "") => {
    resetAddForm(targetDate);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (h: HolidayItem) => {
    setEditFormData({
      id: h.id,
      dateString: h.dateString,
      name: h.name,
      type: h.type,
      description: h.description || "",
      institutionId: h.institutionId || "all",
    });
    setEditFormError(null);
    setEditingHoliday(h);
    // Tutup detail day jika sedang terbuka
    setSelectedDayDetail(null);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    if (formData.useRange) {
      if (!formData.startDate) {
        setFormError("Tanggal awal wajib diisi.");
        setIsSaving(false);
        return;
      }
      if (formData.endDate && formData.endDate < formData.startDate) {
        setFormError("Tanggal akhir tidak boleh lebih awal dari tanggal awal.");
        setIsSaving(false);
        return;
      }
    } else {
      if (!formData.dateString) {
        setFormError("Tanggal wajib diisi.");
        setIsSaving(false);
        return;
      }
    }

    if (!formData.name.trim()) {
      setFormError("Nama libur wajib diisi.");
      setIsSaving(false);
      return;
    }

    try {
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || null,
        institutionId: formData.institutionId === "all" ? null : formData.institutionId,
      };

      if (formData.useRange) {
        payload.startDate = formData.startDate;
        payload.endDate = formData.endDate || "";
      } else {
        payload.dateString = formData.dateString;
      }

      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setResult({
          type: "success",
          text: json.message || "Hari libur berhasil ditambahkan.",
        });
        setIsAddModalOpen(false);
        resetAddForm();
        fetchHolidays();
      } else {
        setFormError(json.error || "Gagal menyimpan data libur.");
      }
    } catch {
      setFormError("Terjadi kesalahan jaringan atau sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setEditFormError(null);

    if (!editFormData.name.trim()) {
      setEditFormError("Nama libur wajib diisi.");
      setIsUpdating(false);
      return;
    }

    if (!editFormData.dateString) {
      setEditFormError("Tanggal wajib diisi.");
      setIsUpdating(false);
      return;
    }

    try {
      const payload = {
        id: editFormData.id,
        name: editFormData.name.trim(),
        dateString: editFormData.dateString,
        type: editFormData.type,
        description: editFormData.description.trim() || null,
        institutionId: editFormData.institutionId === "all" ? null : editFormData.institutionId,
      };

      const res = await fetch("/api/holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setResult({
          type: "success",
          text: json.message || "Hari libur berhasil diperbarui.",
        });
        setEditingHoliday(null);
        fetchHolidays();
      } else {
        setEditFormError(json.error || "Gagal memperbarui data libur.");
      }
    } catch {
      setEditFormError("Terjadi kesalahan sistem saat memperbarui data.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      const json = await res.json();

      if (res.ok && json.success) {
        setResult({ type: "success", text: "Hari libur berhasil dihapus." });
        setDeleteConfirmHoliday(null);
        setSelectedDayDetail(null);
        fetchHolidays();
      } else {
        setResult({ type: "error", text: json.error || "Gagal menghapus data libur." });
      }
    } catch {
      setResult({ type: "error", text: "Terjadi kesalahan sistem." });
    }
  };

  // Calendar Calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Map: dateString -> Array of HolidayItem
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, HolidayItem[]>();
    for (const h of holidays) {
      const list = map.get(h.dateString) || [];
      list.push(h);
      map.set(h.dateString, list);
    }
    return map;
  }, [holidays]);

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
  for (let y = today.getFullYear() - 3; y <= today.getFullYear() + 4; y++) {
    tahunOptions.push(y);
  }

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Handle click on calendar cell
  const handleCellClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayHolidays = holidaysByDate.get(dateStr) || [];
    const sunday = isSunday(day);

    if (dayHolidays.length > 0) {
      // Buka modal detail tanggal
      setSelectedDayDetail({
        dateStr,
        dayNumber: day,
        holidays: dayHolidays,
        isSunday: sunday,
      });
    } else {
      // Tanggal kosong (termasuk Minggu yang belum ada libur khusus): langsung buka Tambah Libur
      handleOpenAddModal(dateStr);
    }
  };

  // Quick stats for the month
  const totalSundaysInMonth = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(currentYear, currentMonth, d).getDay() === 0) {
        count++;
      }
    }
    return count;
  }, [currentYear, currentMonth, daysInMonth]);

  const nationalHolidaysCount = useMemo(() => {
    return holidays.filter((h) => h.type === "NATIONAL").length;
  }, [holidays]);

  const schoolHolidaysCount = useMemo(() => {
    return holidays.filter((h) => h.type === "SCHOOL").length;
  }, [holidays]);

  // Filtered holiday list for bottom view
  const filteredHolidaysList = useMemo(() => {
    return holidays.filter((h) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = h.name.toLowerCase().includes(q);
      const matchDesc = h.description ? h.description.toLowerCase().includes(q) : false;
      const matchInst = h.institution ? h.institution.name.toLowerCase().includes(q) : false;
      const matchDate = h.dateString.includes(q);
      return matchName || matchDesc || matchInst || matchDate;
    });
  }, [holidays, searchQuery]);

  const inputClass = `w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 border transition ${
    isDark
      ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
      : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
  }`;

  const labelClass = `block text-xs font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-600"}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                isDark ? "text-slate-100" : "text-slate-800"
              }`}
            >
              Kelola Hari Libur
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Kalender Akademik
            </span>
          </div>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Atur hari libur nasional, libur sekolah/semester, dan pengecualian presensi siswa & guru
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2 transition transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Hari Libur</span>
        </button>
      </div>

      {/* Result Alert */}
      {result && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-in fade-in duration-200 ${
            result.type === "success"
              ? isDark
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
                : "bg-emerald-50 border-emerald-300 text-emerald-700"
              : isDark
              ? "bg-rose-950/80 border-rose-500/50 text-rose-200"
              : "bg-rose-50 border-rose-300 text-rose-700"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          )}
          <span className="font-medium">{result.text}</span>
          <button
            className="ml-auto opacity-60 hover:opacity-100 p-1 rounded"
            onClick={() => setResult(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Total Libur Bulan Ini</span>
            <CalendarDays className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-500">{holidays.length}</span>
            <span className="text-xs text-slate-400">tanggal aktif</span>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Libur Nasional</span>
            <Tag className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-500">{nationalHolidaysCount}</span>
            <span className="text-xs text-slate-400">hari resmi</span>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Libur Sekolah</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-500">{schoolHolidaysCount}</span>
            <span className="text-xs text-slate-400">agenda sekolah</span>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Hari Minggu</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-500">{totalSundaysInMonth}</span>
            <span className="text-xs text-slate-400">otomatis libur</span>
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div
        className={`rounded-3xl p-4 sm:p-6 shadow-xl border ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        {/* Calendar Controls & Filter Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className={`p-2 rounded-xl transition border ${
                isDark
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className={`rounded-xl px-3 py-1.5 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200"
                    : "bg-slate-50 border-slate-300 text-slate-800"
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
                className={`rounded-xl px-3 py-1.5 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200"
                    : "bg-slate-50 border-slate-300 text-slate-800"
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
              className={`p-2 rounded-xl transition border ${
                isDark
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={goToCurrentMonth}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isDark
                  ? "bg-slate-800/80 border-slate-700 text-blue-400 hover:bg-slate-800"
                  : "bg-slate-100 border-slate-200 text-blue-600 hover:bg-slate-200"
              }`}
            >
              Bulan Ini
            </button>
          </div>

          {/* Filtering by Institution & Type */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Lembaga */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterInstitution}
                onChange={(e) => setFilterInstitution(e.target.value)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border focus:outline-none ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-slate-300"
                    : "bg-slate-50 border-slate-300 text-slate-700"
                }`}
              >
                <option value="all">Semua Lembaga (Global & Terdaftar)</option>
                <option value="global">Hanya Global (Semua Lembaga)</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tipe */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border focus:outline-none ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-300"
                  : "bg-slate-50 border-slate-300 text-slate-700"
              }`}
            >
              <option value="all">Semua Tipe Libur</option>
              <option value="NATIONAL">Libur Nasional</option>
              <option value="SCHOOL">Libur Sekolah</option>
            </select>
          </div>
        </div>

        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((dayName, idx) => (
            <div
              key={dayName}
              className={`text-center text-xs font-bold py-2 rounded-lg ${
                idx === 0
                  ? isDark
                    ? "text-rose-400 bg-rose-500/10"
                    : "text-rose-600 bg-rose-50"
                  : isDark
                  ? "text-slate-400 bg-slate-800/40"
                  : "text-slate-600 bg-slate-100"
              }`}
            >
              <span className="hidden sm:inline">{dayName}</span>
              <span className="sm:hidden">{dayName.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty spacer cells before day 1 */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className={`min-h-[70px] sm:min-h-[96px] rounded-2xl border border-dashed opacity-25 ${
                isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50/50"
              }`}
            />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayHolidays = holidaysByDate.get(dateStr) || [];
            const sunday = isSunday(day);
            const todayDate = isToday(day);
            const hasHoliday = dayHolidays.length > 0;

            const hasNational = dayHolidays.some((h) => h.type === "NATIONAL");
            const hasSchool = dayHolidays.some((h) => h.type === "SCHOOL");

            return (
              <div
                key={day}
                onClick={() => handleCellClick(day)}
                className={`min-h-[70px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between transition-all cursor-pointer select-none group border ${
                  todayDate
                    ? isDark
                      ? "bg-blue-950/40 border-2 border-blue-500 shadow-md shadow-blue-500/10"
                      : "bg-blue-50/80 border-2 border-blue-400 shadow-md shadow-blue-500/10"
                    : hasHoliday
                    ? hasNational
                      ? isDark
                        ? "bg-rose-950/30 border-rose-500/40 hover:bg-rose-950/50"
                        : "bg-rose-50/80 border-rose-300 hover:bg-rose-100/70"
                      : isDark
                      ? "bg-amber-950/30 border-amber-500/40 hover:bg-amber-950/50"
                      : "bg-amber-50/80 border-amber-300 hover:bg-amber-100/70"
                    : sunday
                    ? isDark
                      ? "bg-rose-950/15 border-rose-900/30 hover:bg-rose-950/30"
                      : "bg-rose-50/40 border-rose-200/50 hover:bg-rose-50"
                    : isDark
                    ? "bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {/* Cell Top Header: Day Number & Badges */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      todayDate
                        ? "bg-blue-600 text-white shadow-sm"
                        : sunday
                        ? "text-rose-500 font-extrabold"
                        : hasHoliday
                        ? hasNational
                          ? "text-rose-400 font-bold"
                          : "text-amber-400 font-bold"
                        : isDark
                        ? "text-slate-300"
                        : "text-slate-700"
                    }`}
                  >
                    {day}
                  </span>

                  {/* Icon indicator for quick hover */}
                  <div className="flex items-center gap-1">
                    {sunday && !hasHoliday && (
                      <span className="hidden sm:inline text-[9px] font-semibold text-rose-400/80">
                        Minggu
                      </span>
                    )}
                    {dayHolidays.length > 1 && (
                      <span className="px-1 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">
                        +{dayHolidays.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cell Holiday Pills / Preview */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayHolidays.map((h) => (
                    <div
                      key={h.id}
                      className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold truncate flex items-center gap-1 transition ${
                        h.type === "NATIONAL"
                          ? isDark
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 group-hover:bg-rose-500/30"
                            : "bg-rose-100 text-rose-700 border border-rose-200 group-hover:bg-rose-200"
                          : isDark
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500/30"
                          : "bg-amber-100 text-amber-800 border border-amber-200 group-hover:bg-amber-200"
                      }`}
                      title={`${h.name}${h.institution ? ` (${h.institution.name})` : " (Semua Lembaga)"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          h.type === "NATIONAL" ? "bg-rose-500" : "bg-amber-500"
                        }`}
                      />
                      <span className="truncate">{h.name}</span>
                    </div>
                  ))}

                  {/* Empty state hint on hover */}
                  {!hasHoliday && !sunday && (
                    <div className="opacity-0 group-hover:opacity-100 transition text-[9px] text-blue-500/70 font-semibold text-center py-1">
                      + Tambah
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 pt-4 border-t ${
            isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"
          } text-xs`}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
              ●
            </div>
            <span>Hari Ini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-rose-500/30 border border-rose-500/50" />
            <span>Libur Nasional</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-amber-500/30 border border-amber-500/50" />
            <span>Libur Sekolah</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-rose-500/10 border border-rose-500/20" />
            <span>Hari Minggu (Otomatis Libur)</span>
          </div>
        </div>
      </div>

      {/* Holiday List Card */}
      <div
        className={`rounded-3xl p-4 sm:p-6 shadow-xl border ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2
              className={`font-bold text-base sm:text-lg ${
                isDark ? "text-slate-100" : "text-slate-800"
              }`}
            >
              Daftar Libur Bulan {bulanOptions[currentMonth]} {currentYear}
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {filteredHolidaysList.length} hari libur terdaftar pada periode ini
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau tanggal..."
              className={`w-full rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 border ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                  : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
              }`}
            />
          </div>
        </div>

        {isLoading ? (
          <div className={`p-8 text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500 mx-auto mb-2" />
            <span className="text-sm">Memuat daftar libur...</span>
          </div>
        ) : filteredHolidaysList.length === 0 ? (
          <div
            className={`p-8 text-center rounded-2xl border border-dashed ${
              isDark
                ? "bg-slate-800/20 border-slate-800 text-slate-400"
                : "bg-slate-50/50 border-slate-200 text-slate-500"
            }`}
          >
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40 text-blue-500" />
            <p className="text-sm font-semibold">
              {searchQuery ? "Tidak ditemukan libur yang cocok." : "Belum ada libur yang ditandai bulan ini."}
            </p>
            <p className="text-xs mt-1 text-slate-400">
              Hari Minggu tetap otomatis dihitung libur oleh sistem.
            </p>
            <button
              onClick={() => handleOpenAddModal()}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredHolidaysList.map((holiday) => (
              <div
                key={holiday.id}
                className={`p-3.5 rounded-2xl border flex items-start justify-between transition hover:shadow-md ${
                  holiday.type === "NATIONAL"
                    ? isDark
                      ? "bg-rose-950/15 border-rose-900/30 hover:border-rose-800/50"
                      : "bg-rose-50/50 border-rose-200/70 hover:border-rose-300"
                    : isDark
                    ? "bg-amber-950/15 border-amber-900/30 hover:border-amber-800/50"
                    : "bg-amber-50/50 border-amber-200/70 hover:border-amber-300"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      holiday.type === "NATIONAL"
                        ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-bold text-sm leading-tight truncate ${
                        isDark ? "text-slate-100" : "text-slate-800"
                      }`}
                    >
                      {holiday.name}
                    </div>

                    <div className="text-xs text-slate-400 font-medium mt-1">
                      {new Date(holiday.dateString + "T00:00:00").toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          holiday.type === "NATIONAL"
                            ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-600 border border-amber-500/30"
                        }`}
                      >
                        {holiday.type === "NATIONAL" ? "Nasional" : "Sekolah"}
                      </span>

                      {holiday.institution ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-500 border border-blue-400/30">
                          {holiday.institution.name} ({holiday.institution.code})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-400/30">
                          Semua Lembaga
                        </span>
                      )}
                    </div>

                    {holiday.description && (
                      <p
                        className={`text-xs mt-2 line-clamp-2 ${
                          isDark ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        {holiday.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions: Edit & Delete */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleOpenEditModal(holiday)}
                    className={`p-2 rounded-xl transition ${
                      isDark
                        ? "text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                        : "text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                    }`}
                    title="Ubah Hari Libur"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmHoliday(holiday)}
                    className={`p-2 rounded-xl transition ${
                      isDark
                        ? "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        : "text-slate-500 hover:text-rose-600 hover:bg-slate-100"
                    }`}
                    title="Hapus Hari Libur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================================================
          MODAL: DETAIL HARI PADA KALENDER
          =================================================== */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <div>
                <h3 className={`font-bold text-base ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  Detail Tanggal {selectedDayDetail.dayNumber} {bulanOptions[currentMonth]} {currentYear}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(selectedDayDetail.dateStr + "T00:00:00").toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className={`p-1.5 rounded-xl transition ${
                  isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh]">
              {selectedDayDetail.isSunday && (
                <div
                  className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                    isDark
                      ? "bg-purple-950/30 border-purple-800/40 text-purple-300"
                      : "bg-purple-50 border-purple-200 text-purple-700"
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Hari ini adalah hari Minggu (otomatis libur presensi).</span>
                </div>
              )}

              {selectedDayDetail.holidays.map((h) => (
                <div
                  key={h.id}
                  className={`p-4 rounded-2xl border space-y-2 ${
                    h.type === "NATIONAL"
                      ? isDark
                        ? "bg-rose-950/20 border-rose-800/40"
                        : "bg-rose-50 border-rose-200"
                      : isDark
                      ? "bg-amber-950/20 border-amber-800/40"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4
                        className={`font-bold text-sm ${
                          isDark ? "text-slate-100" : "text-slate-800"
                        }`}
                      >
                        {h.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.type === "NATIONAL"
                              ? "bg-rose-500/20 text-rose-500"
                              : "bg-amber-500/20 text-amber-600"
                          }`}
                        >
                          {h.type === "NATIONAL" ? "Libur Nasional" : "Libur Sekolah"}
                        </span>
                        {h.institution ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500">
                            {h.institution.name}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600">
                            Semua Lembaga
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {h.description && (
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {h.description}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                    <button
                      onClick={() => handleOpenEditModal(h)}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 flex items-center gap-1 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmHoliday(h);
                        setSelectedDayDetail(null);
                      }}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-600/10 text-rose-500 hover:bg-rose-600/20 flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`p-4 border-t flex items-center justify-between ${
                isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <button
                onClick={() => {
                  const targetDate = selectedDayDetail.dateStr;
                  setSelectedDayDetail(null);
                  handleOpenAddModal(targetDate);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-500/10 flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Libur Lain di Tanggal Ini</span>
              </button>

              <button
                onClick={() => setSelectedDayDetail(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL: TAMBAH HARI LIBUR
          =================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            {/* Header */}
            <div
              className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    Tambah Hari Libur
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tandai tanggal atau rentang tanggal libur sekolah / nasional
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`p-1.5 rounded-xl transition ${
                  isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitAdd} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs animate-in fade-in ${
                    isDark
                      ? "bg-rose-950/80 border-rose-500 text-rose-200"
                      : "bg-rose-50 border-rose-300 text-rose-700"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Toggle Mode: Tanggal Tunggal vs Rentang */}
              <div>
                <label className={labelClass}>Pilih Mode Tanggal</label>
                <div
                  className={`p-1 rounded-2xl border flex gap-1 ${
                    isDark ? "bg-slate-800/60 border-slate-700" : "bg-slate-100 border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        useRange: false,
                        dateString: prev.dateString || prev.startDate,
                      }))
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      !formData.useRange
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : isDark
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Tanggal Tunggal (1 Hari)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        useRange: true,
                        startDate: prev.startDate || prev.dateString,
                      }))
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.useRange
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : isDark
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Rentang Tanggal (Multi Hari)</span>
                  </button>
                </div>
              </div>

              {/* Tanggal Tunggal */}
              {!formData.useRange && (
                <div>
                  <label className={labelClass}>
                    Tanggal Libur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateString}
                    onChange={(e) => setFormData({ ...formData, dateString: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              )}

              {/* Rentang Tanggal */}
              {formData.useRange && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>
                      Tanggal Awal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tanggal Akhir (Opsional)</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      min={formData.startDate || undefined}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className={inputClass}
                    />
                    <p className={`text-[10px] mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Kosongkan bila hanya 1 hari pada tanggal awal.
                    </p>
                  </div>
                </div>
              )}

              {/* Nama Libur */}
              <div>
                <label className={labelClass}>
                  Nama Hari Libur <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Hari Raya Idul Fitri, Libur Semester Ganjil..."
                  className={inputClass}
                  required
                />
              </div>

              {/* Tipe Libur & Cakupan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tipe Libur</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={inputClass}
                  >
                    <option value="NATIONAL">Libur Nasional (Pemerintah)</option>
                    <option value="SCHOOL">Libur Sekolah (Internal)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Cakupan Lembaga</label>
                  <select
                    value={formData.institutionId}
                    onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="all">Semua Lembaga (Global)</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className={labelClass}>Keterangan Tambahan (Opsional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Catatan pengumuman atau detail libur..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Modal Buttons */}
              <div
                className={`pt-4 flex items-center justify-end gap-2 border-t ${
                  isDark ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
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
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 disabled:opacity-50 transition"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Hari Libur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL: EDIT HARI LIBUR
          =================================================== */}
      {editingHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            {/* Header */}
            <div
              className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    Ubah Hari Libur
                  </h3>
                  <p className="text-xs text-slate-400">Perbarui data hari libur yang sudah ada</p>
                </div>
              </div>
              <button
                onClick={() => setEditingHoliday(null)}
                className={`p-1.5 rounded-xl transition ${
                  isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4 overflow-y-auto">
              {editFormError && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs animate-in fade-in ${
                    isDark
                      ? "bg-rose-950/80 border-rose-500 text-rose-200"
                      : "bg-rose-50 border-rose-300 text-rose-700"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Tanggal */}
              <div>
                <label className={labelClass}>
                  Tanggal Libur <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={editFormData.dateString}
                  onChange={(e) => setEditFormData({ ...editFormData, dateString: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              {/* Nama Libur */}
              <div>
                <label className={labelClass}>
                  Nama Hari Libur <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              {/* Tipe & Cakupan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tipe Libur</label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className={inputClass}
                  >
                    <option value="NATIONAL">Libur Nasional (Pemerintah)</option>
                    <option value="SCHOOL">Libur Sekolah (Internal)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Cakupan Lembaga</label>
                  <select
                    value={editFormData.institutionId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, institutionId: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="all">Semua Lembaga (Global)</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className={labelClass}>Keterangan Tambahan</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Buttons */}
              <div
                className={`pt-4 flex items-center justify-end gap-2 border-t ${
                  isDark ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditingHoliday(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 disabled:opacity-50 transition"
                >
                  {isUpdating ? "Memperbarui..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL: KONFIRMASI HAPUS HARI LIBUR
          =================================================== */}
      {deleteConfirmHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3
              className={`font-bold text-base mb-1 ${
                isDark ? "text-slate-100" : "text-slate-800"
              }`}
            >
              Hapus Hari Libur?
            </h3>
            <p className={`text-sm mb-4 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Anda akan menghapus libur &ldquo;<strong className="text-rose-500">{deleteConfirmHoliday.name}</strong>&rdquo; pada tanggal{" "}
              <strong>{deleteConfirmHoliday.dateString}</strong>. Tanggal ini akan kembali menjadi hari sekolah biasa.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmHoliday(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmHoliday.id)}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition"
              >
                Ya, Hapus Libur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
