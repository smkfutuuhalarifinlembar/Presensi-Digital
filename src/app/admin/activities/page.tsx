"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Activity as ActivityIcon,
  ShieldAlert,
  FolderOpen,
  Tag,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ActivitiesPage() {
  const { theme } = useTheme();
  const [activities, setActivities] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  // Form kategori
  const [categoryFormData, setCategoryFormData] = useState({ name: "" });
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState<boolean>(false);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    category: "UMUM",
    daysOfWeek: "1,2,3,4,5",
    specificDate: "",
    startTime: "06:30",
    endTime: "08:30",
    lateCutoffTime: "07:00",
    gracePeriodMinutes: 15,
    targetRoles: "ALL",
    targetClasses: "ALL",
    institutionId: "",
    isActive: true,
  });

  const DAYS = [
    { id: "1", label: "Senin" },
    { id: "2", label: "Selasa" },
    { id: "3", label: "Rabu" },
    { id: "4", label: "Kamis" },
    { id: "5", label: "Jumat" },
    { id: "6", label: "Sabtu" },
    { id: "0", label: "Ahad" },
  ];

  const ROLES = [
    { id: "SISWA", label: "Siswa" },
    { id: "GURU", label: "Guru" },
    { id: "PEGAWAI", label: "Pegawai" },
    { id: "KEPALA_SEKOLAH", label: "Kepala Sekolah" },
  ];

  const toggleDay = (dayId: string) => {
    let currentDays = formData.daysOfWeek === "ALL" ? "1,2,3,4,5,6,0" : formData.daysOfWeek;
    let daysArray = currentDays.split(",").filter(Boolean);
    
    if (daysArray.includes(dayId)) {
      daysArray = daysArray.filter(d => d !== dayId);
    } else {
      daysArray.push(dayId);
    }
    
    // Sort to keep it neat
    daysArray.sort();
    
    const newValue = daysArray.length === 7 ? "ALL" : daysArray.join(",");
    setFormData({ ...formData, daysOfWeek: newValue });
  };

  const toggleRole = (roleId: string) => {
    let currentRoles = formData.targetRoles === "ALL" ? "SISWA,GURU,PEGAWAI,KEPALA_SEKOLAH" : formData.targetRoles;
    let rolesArray = currentRoles.split(",").filter(Boolean);

    if (rolesArray.includes(roleId)) {
      rolesArray = rolesArray.filter(r => r !== roleId);
    } else {
      rolesArray.push(roleId);
    }

    const allRoles = ["SISWA", "GURU", "PEGAWAI", "KEPALA_SEKOLAH"];
    const newValue = rolesArray.length === allRoles.length ? "ALL" : rolesArray.join(",");
    setFormData({ ...formData, targetRoles: newValue });
  };

  const toggleClass = (cls: string) => {
    let currentClasses = formData.targetClasses === "ALL" ? [...classes] : formData.targetClasses.split(",").filter(Boolean);
    let arr = [...currentClasses];

    if (arr.includes(cls)) {
      arr = arr.filter(c => c !== cls);
    } else {
      arr.push(cls);
    }

    const newValue = arr.length === 0 || arr.length === classes.length ? "ALL" : arr.join(",");
    setFormData({ ...formData, targetClasses: newValue });
  };

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchActivities = async (showLoader: boolean = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const [res, resPeople, resCats] = await Promise.all([
        fetch("/api/activities", { cache: "no-store" }),
        fetch("/api/people?limit=1"),
        fetch("/api/activity-categories", { cache: "no-store" }),
      ]);
      if (res.ok) {
        const json = await res.json();
        setActivities(json.activities || []);
        setInstitutions(json.institutions || []);
      }
      if (resCats.ok) {
        const jc = await resCats.json();
        setCategories(jc.categories || []);
      }
      if (resPeople.ok) {
        const jp = await resPeople.json();
        setClasses(jp.classes || []);
      }
    } catch (err) {
      console.error("Gagal memuat jadwal kegiatan:", err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(true);
    // Jaga status badge (Akan Datang / Sedang Berlangsung / Selesai) tetap
    // sinkron dengan layar presensi: refresh berkala + saat window kembali fokus
    const interval = setInterval(() => fetchActivities(), 30000);
    const handleVisible = () => {
      if (document.visibilityState === "visible") fetchActivities();
    };
    const handleFocus = () => fetchActivities();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  const openAddModal = () => {
    setSelectedActivity(null);
    setFormData({
      name: "",
      category: categories[0]?.name || "UMUM",
      daysOfWeek: "1,2,3,4,5",
      specificDate: "",
      startTime: "06:30",
      endTime: "08:30",
      lateCutoffTime: "07:00",
      gracePeriodMinutes: 15,
      targetRoles: "ALL",
      targetClasses: "ALL",
      institutionId: "",
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (act: any) => {
    setSelectedActivity(act);
    setFormData({
      name: act.name,
      category: act.category || "UMUM",
      daysOfWeek: act.daysOfWeek || "ALL",
      specificDate: act.specificDate || "",
      startTime: act.startTime,
      endTime: act.endTime,
      lateCutoffTime: act.lateCutoffTime,
      gracePeriodMinutes: act.gracePeriodMinutes || 0,
      targetRoles: act.targetRoles || "ALL",
      targetClasses: act.targetClasses || "ALL",
      institutionId: act.institutionId || "",
      isActive: act.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const url = selectedActivity
        ? `/api/activities/${selectedActivity.id}`
        : "/api/activities";
      const method = selectedActivity ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (res.ok && (json.success || json.activity)) {
        setIsModalOpen(false);
        fetchActivities();
      } else {
        setFormError(json.error || "Gagal menyimpan jadwal kegiatan.");
      }
    } catch (err: any) {
      setFormError("Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedActivity) return;
    try {
      const res = await fetch(`/api/activities/${selectedActivity.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        fetchActivities();
      }
    } catch (err) {
      console.error("Gagal menghapus kegiatan:", err);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = categoryFormData.name.trim();
    if (!name) return;

    setIsSavingCategory(true);
    setCategoryError(null);
    try {
      const url = editingCategory
        ? `/api/activity-categories/${editingCategory.id}`
        : "/api/activity-categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCategoryError(json.error || "Gagal menyimpan kategori.");
        return;
      }

      setCategoryFormData({ name: "" });
      setEditingCategory(null);
      await fetchActivities();
    } catch {
      setCategoryError("Gagal menyimpan kategori.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    const affected = activities.filter((a) => (a.category || "UMUM") === cat.name).length;
    const msg =
      affected > 0
        ? `Hapus kategori "${cat.name}"? ${affected} kegiatan akan dipindahkan ke kategori "UMUM".`
        : `Hapus kategori "${cat.name}"?`;
    if (!window.confirm(msg)) return;

    setCategoryError(null);
    try {
      const res = await fetch(`/api/activity-categories/${cat.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryError(json.error || "Gagal menghapus kategori.");
        return;
      }
      await fetchActivities();
    } catch {
      setCategoryError("Gagal menghapus kategori.");
    }
  };

  const openEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryFormData({ name: cat.name });
    setCategoryError(null);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryFormData({ name: "" });
    setCategoryError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
            theme === "dark" ? "text-slate-100" : "text-slate-800"
          }`}>
            Manajemen Jadwal & Jam Presensi
          </h1>
          <p className={`text-sm mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            Atur sesi presensi otomatis buka/tutup, batas jam hadir, dan toleransi keterlambatan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 flex items-center gap-2 transition"
          >
            <Tag className="w-4 h-4" />
            <span>Kelola Kategori</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kegiatan Baru</span>
          </button>
        </div>
      </div>

      {/* Info Card Pengingat Auto Buka/Tutup */}
      <div className="p-4 rounded-3xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-3">
        <Clock className="w-5 h-5 text-blue-400 shrink-0" />
        <p className="leading-relaxed">
          <strong>Sistem Otomatis:</strong> Sesi presensi akan otomatis dibuka saat jam mulai tiba dan otomatis ditutup saat jam selesai terlewati tanpa perlu tindakan manual dari admin.
        </p>
      </div>

      {/* List Kegiatan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <div className="col-span-2 p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <span>Memuat jadwal kegiatan...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-3xl border border-slate-800">
            Belum ada kegiatan presensi yang dibuat. Klik tombol Tambah di atas.
          </div>
        ) : (
          activities.map((act) => {
            const isActive = act.state === "ACTIVE";
            const isUpcoming = act.state === "UPCOMING";

            return (
              <div
                key={act.id}
                className={`bg-slate-900 border rounded-3xl p-6 shadow-xl relative overflow-hidden transition flex flex-col justify-between space-y-4 ${
                  isActive
                    ? "border-emerald-500/60 shadow-emerald-500/10"
                    : "border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                        isActive
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                          : isUpcoming
                          ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive
                            ? "bg-emerald-400"
                            : isUpcoming
                            ? "bg-blue-400"
                            : "bg-slate-500"
                        }`}
                      />
                      <span>{act.stateLabel}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(act)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                        title="Edit Jadwal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedActivity(act);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Hapus Jadwal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {act.name}
                  </h3>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Tag className="w-2.5 h-2.5" />
                      {act.category || "UMUM"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/60 text-slate-300 border border-slate-600/50">
                      {activities.filter((x) => (x.category || "UMUM") === (act.category || "UMUM")).length} kegiatan
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    Hari:{" "}
                    <span className="text-slate-200 font-semibold">
                      {act.daysOfWeek === "ALL"
                        ? "Setiap Hari"
                        : act.daysOfWeek.split(",").map((d: string) => {
                            const dayMap: any = {
                              "1": "Senin", "2": "Selasa", "3": "Rabu", 
                              "4": "Kamis", "5": "Jumat", "6": "Sabtu", "0": "Ahad"
                            };
                            return dayMap[d];
                          }).join(", ")}
                    </span>
                    {act.specificDate && ` (Khusus Tanggal ${act.specificDate})`}
                  </p>

                  {/* Indikator Sinkronisasi dengan Layar Presensi */}
                  <p className="text-[11px] mt-1.5">
                    {!act.isActive ? (
                      <span className="text-rose-300 font-semibold">
                        Kegiatan nonaktif — tidak tampil di "Jadwal Hari Ini" layar presensi
                      </span>
                    ) : act.isToday ? (
                      <span className="text-emerald-300 font-semibold">
                        Berlaku hari ini — tampil di "Jadwal Hari Ini" layar presensi
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Tidak berlaku hari ini — tidak tampil di layar presensi
                      </span>
                    )}
                  </p>
                </div>

                {/* Jam Mulai, Selesai & Toleransi */}
                <div className="grid grid-cols-3 gap-2.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50 text-xs text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Mulai</span>
                    <span className="text-sm font-bold text-emerald-400">{act.startTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Batas Hadir</span>
                    <span className="text-sm font-bold text-amber-400">{act.lateCutoffTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Selesai</span>
                    <span className="text-sm font-bold text-rose-400">{act.endTime}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span>
                      Toleransi:{" "}
                      <strong className="text-slate-200">
                        {act.gracePeriodMinutes || 0} Menit
                      </strong>
                    </span>
                    <span>
                      Target:{" "}
                      <strong className="text-slate-200">
                        {act.targetRoles === "ALL" ? "Semua Orang" : act.targetRoles}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>
                      Lembaga:{" "}
                      <strong className="text-blue-300">
                        {institutions.find((i: any) => i.id === act.institutionId)?.name || "Semua (Global)"}
                      </strong>
                    </span>
                    {act.targetRoles !== "ALL" && act.targetRoles.includes("SISWA") && (
                      <span>
                        Kelas:{" "}
                        <strong className="text-emerald-300">
                          {act.targetClasses === "ALL" ? "Semua Kelas" : act.targetClasses}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===================================================
          MODAL TAMBAH / EDIT KEGIATAN
          =================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {selectedActivity ? "Edit Jadwal Kegiatan" : "Tambah Kegiatan Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nama Kegiatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Kegiatan Presensi *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Presensi Masuk Pagi / Upacara Bendera"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Kategori Kegiatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Kategori Kegiatan *
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat: any) => (
                    <button
                      key={cat.id || cat.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.name })}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                        formData.category === cat
                          ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/20"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold border bg-slate-800 border-dashed border-slate-600 text-emerald-400 hover:border-emerald-500 transition inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Buat Kategori
                  </button>
                </div>
                <span className="text-[11px] text-slate-500">
                  Semua kegiatan dengan kategori yang sama akan digabung pada Rekap &amp; Laporan Presensi
                </span>
              </div>

              {/* Hari Berlaku */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Hari Berlaku *
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const isChecked = formData.daysOfWeek === "ALL" || formData.daysOfWeek.split(",").includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                          isChecked
                            ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lembaga / Yayasan */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lembaga Penyelenggara
                </label>
                <select
                  value={formData.institutionId || ""}
                  onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Semua / Global (tanpa lembaga)</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.level})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">
                  Jadwal hanya berlaku untuk orang dari lembaga ini
                </span>
              </div>

              {/* Target Peserta */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Target Peserta Presensi *
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => {
                    const isChecked = formData.targetRoles === "ALL" || formData.targetRoles.split(",").includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                          isChecked
                            ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/20"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Kelas (khusus Siswa) */}
              {(formData.targetRoles === "ALL" || formData.targetRoles.includes("SISWA")) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Ditujukan ke Kelas (khusus Siswa)
                  </label>
                  {classes.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">
                      Belum ada data kelas. Tambahkan data siswa terlebih dahulu.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, targetClasses: "ALL" })}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                            formData.targetClasses === "ALL"
                              ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          Semua Kelas
                        </button>
                        {classes.map((cls) => {
                          const isChecked = formData.targetClasses !== "ALL" && formData.targetClasses.split(",").includes(cls);
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => toggleClass(cls)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                                isChecked
                                  ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20"
                                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                              }`}
                            >
                              {cls}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {formData.targetClasses === "ALL"
                          ? "Jadwal berlaku untuk semua kelas"
                          : `Jadwal hanya untuk ${formData.targetClasses.split(",").length} kelas terpilih`}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Jam Mulai & Jam Selesai */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jam Mulai Dibuka *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                  <span className="text-[11px] text-slate-500">Sesi mulai aktif</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jam Selesai Ditutup *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                  <span className="text-[11px] text-slate-500">Sesi tertutup otomatis</span>
                </div>
              </div>

              {/* Jam Batas Hadir vs Terlambat & Toleransi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jam Batas "Hadir" *
                  </label>
                  <input
                    type="time"
                    value={formData.lateCutoffTime}
                    onChange={(e) => setFormData({ ...formData, lateCutoffTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                  <span className="text-[11px] text-slate-500">Batas tepat waktu</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Toleransi Terlambat (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={formData.gracePeriodMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gracePeriodMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[11px] text-slate-500">Tambahan waktu sebelum Terlambat</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {isDeleteModalOpen && selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Hapus Jadwal Kegiatan</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus jadwal{" "}
              <strong className="text-white">{selectedActivity.name}</strong>? Riwayat presensi pada kegiatan ini akan tetap tersimpan.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Kategori */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                Kelola Kategori Kegiatan
              </h3>
              <button
                onClick={closeCategoryModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <p className="text-xs text-slate-400 leading-relaxed">
                Kelompokkan kegiatan agar rekap presensi lebih ringkas. Semua kegiatan
                dalam satu kategori akan digabung otomatis pada menu{" "}
                <strong className="text-slate-200">Rekap &amp; Laporan Presensi</strong>.
              </p>

              {/* Form Tambah / Edit Kategori */}
              <form onSubmit={handleCategorySubmit} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  {editingCategory ? "Ubah Nama Kategori" : "Nama Kategori Baru"}
                </label>
                {categoryError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{categoryError}</span>
                  </div>
                )}
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ name: e.target.value })}
                  placeholder="Contoh: Presensi Masuk, Presensi Pulang, Upacara"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
                <div className="flex justify-end gap-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryFormData({ name: "" });
                        setCategoryError(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingCategory}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
                  >
                    {isSavingCategory ? "Menyimpan..." : editingCategory ? "Update" : "Tambah"}
                  </button>
                </div>
              </form>

              {/* Daftar Kategori */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-400" />
                  Daftar Kategori ({categories.length})
                </h4>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {categories.map((cat: any) => {
                    const count = activities.filter(
                      (a) => (a.category || "UMUM") === cat.name
                    ).length;
                    const isDefault = cat.name === "UMUM";
                    return (
                      <li
                        key={cat.id || cat.name}
                        className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl"
                      >
                        <div className="min-w-0">
                          <span className="block text-sm font-bold text-white truncate">{cat.name}</span>
                          <span className="block text-[11px] text-slate-400">
                            {count} kegiatan{isDefault ? " (kategori bawaan)" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition"
                            title="Ubah Nama Kategori"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            disabled={isDefault}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            title={isDefault ? "Kategori bawaan tidak dapat dihapus" : "Hapus Kategori"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
