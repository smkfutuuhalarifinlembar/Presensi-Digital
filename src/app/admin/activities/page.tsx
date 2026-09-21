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
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ActivitiesPage() {
  const { theme } = useTheme();
  const [activities, setActivities] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: "",
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

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const [res, resPeople] = await Promise.all([
        fetch("/api/activities", { cache: "no-store" }),
        fetch("/api/people?limit=1"),
      ]);
      if (res.ok) {
        const json = await res.json();
        setActivities(json.activities || []);
        setInstitutions(json.institutions || []);
      }
      if (resPeople.ok) {
        const jp = await resPeople.json();
        setClasses(jp.classes || []);
      }
    } catch (err) {
      console.error("Gagal memuat jadwal kegiatan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const openAddModal = () => {
    setSelectedActivity(null);
    setFormData({
      name: "",
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

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 self-start sm:self-auto transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kegiatan Baru</span>
        </button>
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
    </div>
  );
}
