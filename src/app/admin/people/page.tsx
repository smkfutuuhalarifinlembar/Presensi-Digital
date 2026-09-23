"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  Trash2,
  Edit2,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Radio,
  FileText,
  Image as ImageIcon,
  Building2,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function PeopleManagementPage() {
  const { theme } = useTheme();
  const [people, setPeople] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isBulkPhotoModalOpen, setIsBulkPhotoModalOpen] = useState<boolean>(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  // Bulk Photo state
  const [bulkPhotoFiles, setBulkPhotoFiles] = useState<FileList | null>(null);
  const [bulkPhotoUploading, setBulkPhotoUploading] = useState<boolean>(false);
  const [bulkPhotoResult, setBulkPhotoResult] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nisNip: "",
    name: "",
    role: "SISWA",
    className: "",
    position: "",
    phone: "",
    parentPhone: "",
    rfidUid: "",
    gender: "L",
    institutionId: "",
  });
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isWaitingRfidTap, setIsWaitingRfidTap] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Fetch People
  const fetchPeople = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        role: roleFilter,
        className: classFilter,
        search: searchQuery,
      });

      const res = await fetch(`/api/people?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPeople(json.people);
        setClasses(json.classes || []);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch (err) {
      console.error("Gagal memuat data orang:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const res = await fetch("/api/institutions", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setInstitutions(json.institutions || []);
        }
      } catch { }
    };
    loadInstitutions();
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [page, roleFilter, classFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPeople();
  };

  // RFID Listener saat modal form tambah/edit terbuka & user klik "Daftarkan RFID"
  useEffect(() => {
    if (!isWaitingRfidTap) return;

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTime > 300) buffer = "";
      lastKeyTime = now;

      if (e.key === "Enter") {
        e.preventDefault();
        const code = buffer.trim();
        if (code) {
          setFormData((prev) => ({ ...prev, rfidUid: code }));
          setIsWaitingRfidTap(false);
        }
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWaitingRfidTap]);

  const openAddModal = () => {
    setSelectedPerson(null);
    setFormData({
      nisNip: "",
      name: "",
      role: "SISWA",
      className: "",
      position: "",
      phone: "",
      parentPhone: "",
      rfidUid: "",
      gender: "L",
      institutionId: "",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormError(null);
    setIsWaitingRfidTap(false);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (person: any) => {
    setSelectedPerson(person);
    setFormData({
      nisNip: person.nisNip || "",
      name: person.name || "",
      role: person.role || "SISWA",
      className: person.className || "",
      position: person.position || "",
      phone: person.phone || "",
      parentPhone: person.parentPhone || "",
      rfidUid: person.rfidUid || "",
      gender: person.gender || "L",
      institutionId: person.institutionId || "",
    });
    setPhotoFile(null);
    setPhotoPreview(person.photoUrl || null);
    setFormError(null);
    setIsWaitingRfidTap(false);
    setIsAddEditModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(selectedPerson?.photoUrl || null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      // 1. Upload foto jika ada file baru
      let photoUrl = selectedPerson?.photoUrl || null;
      if (photoFile) {
        setIsUploadingPhoto(true);
        const fd = new FormData();
        fd.append("file", photoFile);
        fd.append("type", "photo");
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const upJson = await upRes.json();
        if (!upRes.ok) throw new Error(upJson.error || "Gagal upload foto");
        photoUrl = upJson.url;
      }

      // 2. Simpan data orang
      const url = selectedPerson ? `/api/people/${selectedPerson.id}` : "/api/people";
      const method = selectedPerson ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, photoUrl }),
      });

      const json = await res.json();
      if (res.ok && (json.success || json.person)) {
        setIsAddEditModalOpen(false);
        fetchPeople();
      } else {
        setFormError(json.error || "Gagal menyimpan data.");
      }
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsUploadingPhoto(false);
      setIsSaving(false);
    }
  };

  const handleBulkPhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkPhotoFiles || bulkPhotoFiles.length === 0) return;

    setBulkPhotoUploading(true);
    setBulkPhotoResult(null);

    const fd = new FormData();
    for (let i = 0; i < bulkPhotoFiles.length; i++) {
      fd.append("files", bulkPhotoFiles[i]);
    }

    try {
      const res = await fetch("/api/people/bulk-photo", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      setBulkPhotoResult(json);
      if (json.success) {
        fetchPeople();
      }
    } catch (err) {
      console.error("Gagal upload foto massal:", err);
    } finally {
      setBulkPhotoUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPerson) return;
    try {
      const res = await fetch(`/api/people/${selectedPerson.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        fetchPeople();
      }
    } catch (err) {
      console.error("Gagal menghapus orang:", err);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setIsImporting(true);
    setImportResult(null);

    const fd = new FormData();
    fd.append("file", importFile);

    try {
      const res = await fetch("/api/people/import", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      setImportResult(json);
      if (json.success) {
        fetchPeople();
      }
    } catch (err) {
      console.error("Gagal import:", err);
    } finally {
      setIsImporting(false);
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
            Manajemen Data Orang
          </h1>
          <p className={`text-sm mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            Kelola data Siswa, Guru, Pegawai, dan Kepala Sekolah ({total} orang)
          </p>
        </div>

        {/* Action Buttons (Download Template, Import, Export, Tambah) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/people/template"
            download
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
            title="Download Template Excel Kosong"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Unduh Template</span>
          </a>

          <button
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => {
              setBulkPhotoFiles(null);
              setBulkPhotoResult(null);
              setIsBulkPhotoModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
          >
            <ImageIcon className="w-4 h-4 text-pink-400" />
            <span>Upload Foto Massal</span>
          </button>

          <a
            href={`/api/people/export?role=${roleFilter}&className=${classFilter}`}
            download
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-400" />
            <span>Export Data</span>
          </a>

          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Orang</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`rounded-3xl p-4 sm:p-5 shadow-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        theme === "dark"
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-slate-200"
      }`}>
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, ID, atau RFID..."
             className={`w-full rounded-2xl pl-10 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition border ${
               theme === "dark"
                 ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                 : "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
             }`}
          />
          <Search className={`w-4 h-4 absolute left-3.5 top-2.5 ${
            theme === "dark" ? "text-slate-500" : "text-slate-400"
          }`} />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filter Role */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Kategori:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="SISWA">Siswa</option>
              <option value="GURU">Guru</option>
              <option value="PEGAWAI">Pegawai & Staf</option>
              <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
            </select>
          </div>

          {/* Filter Kelas (jika siswa) */}
          {classes.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Kelas:</span>
              <select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tabel Data Orang (Responsive Card on Mobile & Table on Desktop) */}
      <div className={`rounded-3xl overflow-hidden shadow-xl border ${
        theme === "dark"
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-slate-200"
      }`}>
        {isLoading ? (
          <div className={`p-12 text-center ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <span>Memuat data...</span>
          </div>
        ) : people.length === 0 ? (
          <div className={`p-12 text-center text-sm ${
            theme === "dark" ? "text-slate-500" : "text-slate-400"
          }`}>
            Tidak ada data yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Nama & Profil</th>
                  <th className="px-4 py-3.5 font-bold">ID</th>
                  <th className="px-4 py-3.5 font-bold">Kategori / Kelas</th>
                  <th className="px-4 py-3.5 font-bold">Kartu RFID</th>
                  <th className="px-4 py-3.5 font-bold">Lembaga / Unit</th>
                  <th className="px-4 py-3.5 font-bold">Kontak WA</th>
                  <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {people.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Nama & Avatar (dengan Foto) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center font-black text-xs text-blue-400 shrink-0 overflow-hidden">
                            {p.photoUrl ? (
                              <img
                                src={p.photoUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              p.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join("")
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {p.gender === "P" ? "Perempuan" : "Laki-laki"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="px-4 py-4 font-mono font-medium text-slate-300">
                        {p.nisNip}
                      </td>

                      {/* Kategori / Kelas */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.role === "SISWA"
                              ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              : p.role === "GURU"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              }`}
                          >
                            {p.role}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {p.className || p.position || "-"}
                          </span>
                        </div>
                      </td>

                      {/* RFID */}
                      <td className="px-4 py-4">
                        {p.rfidUid ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-xs">
                            <Radio className="w-3 h-3 text-emerald-400" />
                            <span>{p.rfidUid}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            Belum terdaftar
                          </span>
                        )}
                      </td>

                      {/* Lembaga / Unit (fitur Yayasan) */}
                      <td className="px-4 py-4">
                        {p.institution?.name ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-blue-300 text-xs">
                            <Building2 className="w-3 h-3 text-blue-300" />
                            <span className="font-semibold">{p.institution.name}</span>
                            {p.institution.level && (
                              <span className="text-[10px] text-slate-400">
                                ({p.institution.level})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            Belum diatur
                          </span>
                        )}
                      </td>

                      {/* Kontak WA */}
                      <td className="px-4 py-4 text-xs font-mono text-slate-400">
                        {p.role === "SISWA" ? (
                          <div>
                            <div>Wali: {p.parentPhone || "-"}</div>
                            <div className="text-[11px] text-slate-500">Pribadi: {p.phone || "-"}</div>
                          </div>
                        ) : (
                          <div>{p.phone || "-"}</div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                            title="Edit Data"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPerson(p);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Halaman {page} dari {totalPages} ({total} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================
          MODAL TAMBAH / EDIT ORANG
          =================================================== */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {selectedPerson ? "Edit Data Orang" : "Tambah Data Orang Baru"}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
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

              {/* Kategori */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kategori *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="SISWA">Siswa</option>
                  <option value="GURU">Guru</option>
                  <option value="PEGAWAI">Pegawai & Staf</option>
                  <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
                </select>
              </div>

              {/* ID & Jenis Kelamin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ID *
                  </label>
                  <input
                    type="text"
                    value={formData.nisNip}
                    onChange={(e) =>
                      setFormData({ ...formData, nisNip: e.target.value })
                    }
                    placeholder="Nomor induk unik"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nama lengkap beserta gelar jika ada"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Lembaga / Unit (fitur Yayasan) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lembaga / Unit
                </label>
                <select
                  value={formData.institutionId || ""}
                  onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">— Tanpa Lembaga —</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.level})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">
                  Menentukan jadwal presensi mana yang berlaku untuk orang ini
                </span>
              </div>

              {/* Kelas (Khusus Siswa) atau Jabatan */}
              {formData.role === "SISWA" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kelas (Contoh: X-RPL-1, XI-TKJ-2)
                  </label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) =>
                      setFormData({ ...formData, className: e.target.value })
                    }
                    placeholder="Masukkan nama kelas"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jabatan / Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    placeholder="Contoh: Guru Produktif RPL / Staf Tata Usaha"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Kontak HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    No. HP Pribadi
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="0812xxxxxxxx"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                {formData.role === "SISWA" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      No. HP Orang Tua / Wali (WA)
                    </label>
                    <input
                      type="text"
                      value={formData.parentPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, parentPhone: e.target.value })
                      }
                      placeholder="0812xxxxxxxx"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Pendaftaran Kartu RFID */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>Kode Kartu RFID (UID)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsWaitingRfidTap(!isWaitingRfidTap)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${isWaitingRfidTap
                      ? "bg-amber-500 text-slate-950 animate-pulse"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                  >
                    <span>{isWaitingRfidTap ? "Mendengarkan Tap Kartu..." : "Daftarkan Lewat Tap"}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.rfidUid}
                  onChange={(e) =>
                    setFormData({ ...formData, rfidUid: e.target.value })
                  }
                  placeholder="Ketik manual atau klik tombol Daftarkan lalu tap kartu"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
                {isWaitingRfidTap && (
                  <p className="text-[11px] text-amber-300">
                    📡 Silakan tap kartu fisik pada scanner RFID sekarang. Nomor kartu akan otomatis terisi.
                  </p>
                )}
              </div>

              {/* Upload Foto Profil */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span>Foto Profil</span>
                </label>
                <div className="flex items-center gap-4">
                  {/* Preview Foto */}
                  <div className="w-20 h-24 rounded-xl overflow-hidden border border-slate-600 bg-slate-900 flex items-center justify-center shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <span className="text-[9px]">No Foto</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-500 cursor-pointer w-full"
                    />
                    {photoFile && (
                      <p className="text-[11px] text-emerald-400 font-semibold">
                        ✓ {photoFile.name} siap diunggah
                      </p>
                    )}
                    {selectedPerson?.photoUrl && !photoFile && (
                      <p className="text-[11px] text-slate-400">
                        Foto saat ini: <span className="text-slate-300">{selectedPerson.photoUrl.split("/").pop()}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL IMPORT EXCEL / CSV
          =================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                Import Massal Data Orang (Excel / CSV)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Unggah file <strong>.xlsx</strong> atau <strong>.csv</strong> sesuai template sistem. Validasi per-baris akan menampilkan baris mana saja yang gagal/duplikat tanpa menggagalkan baris lainnya.
              </p>

              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-slate-800/40">
                  <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  {importFile && (
                    <div className="mt-2 text-xs font-semibold text-emerald-400">
                      File dipilih: {importFile.name}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || isImporting}
                    className="px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-50"
                  >
                    {isImporting ? "Memproses Data..." : "Mulai Import"}
                  </button>
                </div>
              </form>

              {/* Hasil Import Laporan Per Baris */}
              {importResult && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800 flex items-center justify-between text-xs">
                    <div className="text-emerald-400 font-bold">
                      ✅ {importResult.successCount} Berhasil Diimport
                    </div>
                    <div className="text-rose-400 font-bold">
                      ❌ {importResult.failCount} Gagal
                    </div>
                  </div>

                  {importResult.failedRows && importResult.failedRows.length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      <p className="text-xs font-semibold text-rose-300">
                        Rincian Baris Gagal:
                      </p>
                      {importResult.failedRows.map((f: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-rose-950/50 border border-rose-900/60 text-[11px] text-rose-200"
                        >
                          <strong>Baris {f.rowNumber}:</strong> {f.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL KONFIRMASI HAPUS
          =================================================== */}
      {isDeleteModalOpen && selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Hapus Data Orang</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus data{" "}
              <strong className="text-white">{selectedPerson.name}</strong> ({selectedPerson.nisNip})? Riwayat kehadiran orang ini juga akan terhapus.
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

      {/* ===================================================
          MODAL UPLOAD FOTO MASSAL
          =================================================== */}
      {isBulkPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-400" />
                Upload Foto Massal
              </h3>
              <button
                onClick={() => setIsBulkPhotoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Unggah banyak foto sekaligus (file gambar langsung atau dalam format <strong className="text-white">ZIP</strong>). Nama file akan dicocokkan dengan{" "}
                <strong className="text-white">Nama</strong> atau <strong className="text-white">ID</strong> siswa/guru/staff secara otomatis.
              </p>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-white">📋 Contoh format nama file:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><code className="bg-slate-700 px-1.5 rounded">102401.jpg</code> → dicocokkan dengan ID</li>
                  <li><code className="bg-slate-700 px-1.5 rounded">Ahmad Zaki Pratama.jpg</code> → dicocokkan dengan nama</li>
                  <li><code className="bg-slate-700 px-1.5 rounded">Ahmad Zaki Pratama_102401.jpg</code> → dicocokkan dengan nama + ID</li>
                  <li><code className="bg-slate-700 px-1.5 rounded">Ahmad Zaki Pratama - 102401.jpg</code> → menggunakan strip</li>
                  <li><code className="bg-slate-700 px-1.5 rounded">foto_siswa.zip</code> → semua gambar di dalam ZIP akan diproses</li>
                </ul>
              </div>

              <form onSubmit={handleBulkPhotoUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-2xl p-6 text-center transition bg-slate-800/40">
                  <ImageIcon className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept="image/*,.zip"
                    multiple
                    onChange={(e) => setBulkPhotoFiles(e.target.files)}
                    className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-500 cursor-pointer"
                  />
                  {bulkPhotoFiles && bulkPhotoFiles.length > 0 && (
                    <div className="mt-2 text-xs font-semibold text-pink-400">
                      {bulkPhotoFiles.length} file dipilih siap diunggah
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkPhotoModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={!bulkPhotoFiles || bulkPhotoFiles.length === 0 || bulkPhotoUploading}
                    className="px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white disabled:opacity-50"
                  >
                    {bulkPhotoUploading ? "Mengunggah..." : "Mulai Upload"}
                  </button>
                </div>
              </form>

              {bulkPhotoResult && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800 flex items-center justify-between text-xs">
                    <div className="text-emerald-400 font-bold">
                      ✅ {bulkPhotoResult.successCount} Berhasil
                    </div>
                    <div className="text-rose-400 font-bold">
                      ❌ {bulkPhotoResult.failCount} Gagal
                    </div>
                  </div>

                  {bulkPhotoResult.results?.filter((r: any) => !r.ok).length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      <p className="text-xs font-semibold text-rose-300">
                        Rincian File Gagal:
                      </p>
                      {bulkPhotoResult.results.filter((r: any) => !r.ok).map((f: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-rose-950/50 border border-rose-900/60 text-[11px] text-rose-200"
                        >
                          <strong>{f.file}:</strong> {f.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}