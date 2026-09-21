"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Users,
  CalendarDays,
  CheckCircle2,
  Power,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const LEVELS = [
  { id: "TK", label: "TK / PAUD" },
  { id: "SD", label: "SD / MI" },
  { id: "SMP", label: "SMP / MTs" },
  { id: "SMA", label: "SMA / MA" },
  { id: "SMK", label: "SMK" },
  { id: "PESANTREN", label: "Pesantren" },
  { id: "LAINNYA", label: "Lainnya" },
];

export default function InstitutionsPage() {
  const { theme } = useTheme();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    level: "SD",
    address: "",
    isActive: true,
  });

  const fetchInstitutions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/institutions", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setInstitutions(json.institutions || []);
      }
    } catch (err) {
      console.error("Gagal memuat data lembaga:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const openAddModal = () => {
    setSelected(null);
    setFormData({ code: "", name: "", level: "SD", address: "", isActive: true });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (inst: any) => {
    setSelected(inst);
    setFormData({
      code: inst.code,
      name: inst.name,
      level: inst.level || "SD",
      address: inst.address || "",
      isActive: inst.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const url = selected ? `/api/institutions/${selected.id}` : "/api/institutions";
      const method = selected ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIsModalOpen(false);
        fetchInstitutions();
      } else {
        setFormError(json.error || "Gagal menyimpan data lembaga.");
      }
    } catch {
      setFormError("Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/institutions/${selected.id}`, { method: "DELETE" });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        fetchInstitutions();
      }
    } catch (err) {
      console.error("Gagal menghapus lembaga:", err);
    }
  };

  const levelLabel = (lvl: string) => LEVELS.find((l) => l.id === lvl)?.label || lvl;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
            Manajemen Yayasan & Lembaga
          </h1>
          <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            Kelola beberapa lembaga (TK, SD, SMP, SMK) di bawah satu yayasan dengan jam presensi berbeda
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 self-start sm:self-auto transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Lembaga</span>
        </button>
      </div>

      <div className="p-4 rounded-3xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-3">
        <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
        <p className="leading-relaxed">
          <strong>Fitur Yayasan:</strong> Tambahkan setiap lembaga, lalu atur jadwal presensi per lembaga di menu
          <strong> Manajemen Jadwal &amp; Jam Presensi</strong>. Setiap lembaga dapat memiliki jam masuk, batas hadir, dan toleransi yang berbeda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <span>Memuat data lembaga...</span>
          </div>
        ) : institutions.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-3xl border border-slate-800">
            Belum ada lembaga. Klik "Tambah Lembaga" untuk memulai.
          </div>
        ) : (
          institutions.map((inst) => (
            <div
              key={inst.id}
              className={`bg-slate-900 border rounded-3xl p-6 shadow-xl relative overflow-hidden transition ${
                inst.isActive ? "border-slate-800" : "border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/20">
                    {inst.level}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{inst.name}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">{inst.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(inst)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                    title="Edit Lembaga"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelected(inst);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Hapus Lembaga"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  {levelLabel(inst.level)}
                </span>
                {inst.isActive ? (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Aktif
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-700 text-slate-400 border border-slate-600 flex items-center gap-1">
                    <Power className="w-3 h-3" /> Nonaktif
                  </span>
                )}
              </div>

              {inst.address && (
                <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">{inst.address}</p>
              )}

              <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <Users className="w-3 h-3" /> Anggota
                  </div>
                  <span className="text-lg font-bold text-white font-mono">
                    {inst._count?.people ?? 0}
                  </span>
                </div>
                <div className="text-center border-l border-slate-700/50">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <CalendarDays className="w-3 h-3" /> Jadwal
                  </div>
                  <span className="text-lg font-bold text-white font-mono">
                    {inst._count?.activities ?? 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {selected ? "Edit Lembaga" : "Tambah Lembaga Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kode Lembaga *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: SD-01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jenjang *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lembaga *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: SD Islam Al-Azhar"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alamat (opsional)
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  placeholder="Alamat singkat lembaga..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-xs font-semibold text-slate-200">
                  Lembaga aktif (jadwal presensi berlaku)
                </span>
              </label>

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
                  {isSaving ? "Menyimpan..." : "Simpan Lembaga"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Hapus Lembaga</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-white">{selected.name}</strong>?
              Data orang dan jadwal terkait tidak akan dihapus, namun akan kehilangan keterkaitan dengan lembaga ini.
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