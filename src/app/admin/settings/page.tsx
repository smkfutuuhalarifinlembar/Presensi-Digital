"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Image,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Download,
  Building,
  User,
  CreditCard,
  Shield,
  FileText,
  Plus,
  Trash2,
  Building2,
} from "lucide-react";

export default function SchoolSettingsPage() {
  const [settings, setSettings] = useState<any>({
    name: "SMK Negeri 1 Nusantara",
    npsn: "20214567",
    address: "Jl. Pendidikan No. 45",
    phone: "(021) 789-0123",
    email: "info@smkn1nusantara.sch.id",
    website: "https://smkn1nusantara.sch.id",
    principalName: "Drs. H. Bambang Sudirman, M.Pd.",
    principalNip: "197103151998021003",
    logoUrl: "",
    kioskBackgroundUrl: "",
    kioskBackgroundColor: "#0b1329",
    kioskHeaderSubtitle: "Sistem Presensi Digital Terpadu & Terpercaya",
    cardValidity: "2026/2027",
    academicYear: "2026/2027",
    cardBackNotes: "",
     headerLogoLeftUrl: "",
    headerLogoRightUrl: "",
     headerLines: [],
     headerFont: "text-xs",
    headerTextColor: "#0f172a",
    yayasanEnabled: false,
    yayasanName: "Yayasan Pendidikan",
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Upload States
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isUploadingBg, setIsUploadingBg] = useState<boolean>(false);
  const [isUploadingHeaderLogo, setIsUploadingHeaderLogo] = useState<boolean>(false);

  const handleAddHeaderLine = () => {
    setSettings((prev: any) => ({
      ...prev,
      headerLines: [...(prev.headerLines || []), { text: "", fontSize: "text-lg" }],
    }));
  };

  const handleRemoveHeaderLine = (index: number) => {
    setSettings((prev: any) => ({
      ...prev,
      headerLines: (prev.headerLines || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleHeaderLineChange = (index: number, value: string) => {
    setSettings((prev: any) => {
      const lines = [...(prev.headerLines || [])];
      if (typeof lines[index] === "object") {
        lines[index] = { ...lines[index], text: value };
      } else {
        lines[index] = { text: value, fontSize: "text-lg" };
      }
      return { ...prev, headerLines: lines };
    });
  };

  const handleHeaderFontSizeChange = (index: number, fontSize: string) => {
    setSettings((prev: any) => {
      const lines = [...(prev.headerLines || [])];
      if (typeof lines[index] === "object") {
        lines[index] = { ...lines[index], fontSize };
      } else {
        lines[index] = { text: lines[index] || "", fontSize };
      }
      return { ...prev, headerLines: lines };
    });
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
        const s = json.settings;
        // Parse headerLines JSON string to array
        let parsedHeaderLines = [];
        if (s.headerLines) {
          try {
            const parsed = JSON.parse(s.headerLines);
            // Backward compat: array of strings → array of objects
            parsedHeaderLines = parsed.map((item: any) =>
              typeof item === "string" ? { text: item, fontSize: "text-lg" } : item
            );
          } catch {
            parsedHeaderLines = [];
          }
        }
        setSettings({
          ...s,
          headerLines: parsedHeaderLines,
        });
      }
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleFileUpload = async (file: File, type: "logo" | "background" | "header-left" | "header-right") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type === "header-left" || type === "header-right" ? "header_logo" : type);

    if (type === "logo") setIsUploadingLogo(true);
    else if (type === "background") setIsUploadingBg(true);
    else setIsUploadingHeaderLogo(true);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (type === "logo") {
          setSettings((prev: any) => ({ ...prev, logoUrl: json.url }));
        } else if (type === "background") {
          setSettings((prev: any) => ({ ...prev, kioskBackgroundUrl: json.url }));
        } else if (type === "header-left") {
          setSettings((prev: any) => ({ ...prev, headerLogoLeftUrl: json.url }));
        } else if (type === "header-right") {
          setSettings((prev: any) => ({ ...prev, headerLogoRightUrl: json.url }));
        }
      }
    } catch (err) {
      console.error("Gagal mengunggah gambar:", err);
    } finally {
      if (type === "logo") setIsUploadingLogo(false);
      else if (type === "background") setIsUploadingBg(false);
      else setIsUploadingHeaderLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          headerLines: JSON.stringify(settings.headerLines || []),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSaveMessage({ type: "success", text: "Pengaturan tampilan dan profil sekolah berhasil disimpan." });
      } else {
        setSaveMessage({ type: "error", text: json.error || "Gagal menyimpan pengaturan." });
      }
    } catch (err: any) {
      setSaveMessage({ type: "error", text: "Terjadi kesalahan saat menyimpan." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Pengaturan Tampilan & Sekolah
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kustomisasi logo, background halaman kiosk, profil sekolah, dan backup database
          </p>
        </div>

        {/* Tombol Backup Database Langsung */}
        <a
          href="/api/backup"
          download
          className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 self-start sm:self-auto transition"
          title="Unduh file database cadangan"
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Cadangkan Database (Backup)</span>
        </a>
      </div>

      {saveMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center gap-3 animate-in fade-in duration-200 ${
            saveMessage.type === "success"
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
              : "bg-rose-950/80 border-rose-500 text-rose-200"
          }`}
        >
          {saveMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{saveMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* ===================================================
            BAGIAN 1: LOGO & TAMPILAN KIOSK
            =================================================== */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-400" />
              <span>Logo & Background Halaman Presensi Kiosk</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Atur aset visual yang ditampilkan pada monitor kiosk presensi publik
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Upload Logo Sekolah */}
            <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Logo Resmi Sekolah
              </label>

              <div className="flex items-center gap-4">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="w-20 h-20 object-contain rounded-2xl bg-white/5 border border-slate-700 p-2"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-700/60 flex items-center justify-center font-bold text-slate-400 text-xs">
                    No Logo
                  </div>
                )}

                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "logo");
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  {isUploadingLogo && (
                    <span className="text-[11px] text-blue-400 mt-1 block">
                      Mengunggah logo...
                    </span>
                  )}
                  {settings.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logoUrl: "" })}
                      className="text-[11px] text-rose-400 hover:underline mt-1.5 block"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Background Kiosk (Gambar atau Warna) */}
            <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Background Layar Kiosk
              </label>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Warna Dasar:</span>
                  <input
                    type="color"
                    value={settings.kioskBackgroundColor || "#0b1329"}
                    onChange={(e) =>
                      setSettings({ ...settings, kioskBackgroundColor: e.target.value })
                    }
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                  />
                  <span className="text-xs font-mono text-slate-300">
                    {settings.kioskBackgroundColor}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 block">
                    Atau Unggah Gambar Latar Kustom:
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "background");
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  {isUploadingBg && (
                    <span className="text-[11px] text-blue-400 mt-1 block">
                      Mengunggah background...
                    </span>
                  )}
                  {settings.kioskBackgroundUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({ ...settings, kioskBackgroundUrl: "" })
                      }
                      className="text-[11px] text-rose-400 hover:underline mt-1 block"
                    >
                      Hapus Gambar Latar (Gunakan Warna Dasar)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

           <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Sub-judul Header Kiosk
            </label>
            <input
              type="text"
              value={settings.kioskHeaderSubtitle || ""}
              onChange={(e) =>
                setSettings({ ...settings, kioskHeaderSubtitle: e.target.value })
              }
              placeholder="Contoh: Sistem Presensi Digital Terpadu & Terpercaya"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Mode Yayasan */}
        <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Mode Yayasan (Multi-Lembaga)
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Aktifkan jika sekolah berada di bawah satu yayasan dengan beberapa lembaga
                (TK, SD, SMP, SMK). Setiap lembaga dapat memiliki jam presensi berbeda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, yayasanEnabled: !settings.yayasanEnabled })}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                settings.yayasanEnabled
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {settings.yayasanEnabled ? "Aktif" : "Nonaktif"}
            </button>
          </div>

          {settings.yayasanEnabled && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Yayasan
              </label>
              <input
                type="text"
                value={settings.yayasanName || ""}
                onChange={(e) => setSettings({ ...settings, yayasanName: e.target.value })}
                placeholder="Contoh: Yayasan Pendidikan Islam Al-Azhar"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Kelola daftar lembaga di menu <strong className="text-indigo-300">Yayasan &amp; Lembaga</strong>.
              </p>
            </div>
          )}
        </div>

        {/* ===================================================
            BAGIAN 2: IDENTITAS & PROFIL SEKOLAH
            =================================================== */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" />
              <span>Identitas & Informasi Kontak Sekolah</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Data ini tampil pada kop ID Card, laporan cetak, dan notifikasi pesan
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Resmi Sekolah *
              </label>
              <input
                type="text"
                value={settings.name || ""}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                NPSN
              </label>
              <input
                type="text"
                value={settings.npsn || ""}
                onChange={(e) => setSettings({ ...settings, npsn: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alamat Lengkap Sekolah
            </label>
            <input
              type="text"
              value={settings.address || ""}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                No. Telepon Sekolah
              </label>
              <input
                type="text"
                value={settings.phone || ""}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Sekolah
              </label>
              <input
                type="email"
                value={settings.email || ""}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Website Sekolah
              </label>
              <input
                type="text"
                value={settings.website || ""}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Data Kepala Sekolah */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Kepala Sekolah
              </label>
              <input
                type="text"
                value={settings.principalName || ""}
                onChange={(e) =>
                  setSettings({ ...settings, principalName: e.target.value })
                }
                placeholder="Lengkap dengan gelar"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={settings.principalNip || ""}
                onChange={(e) =>
                  setSettings({ ...settings, principalNip: e.target.value })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ===================================================
            BAGIAN 3: KONFIGURASI CETAK ID CARD
            =================================================== */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <span>Pengaturan Tambahan Kartu ID Card</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Keterangan yang tercetak di sisi belakang kartu
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tahun Ajaran (TA)
              </label>
              <input
                type="text"
                value={settings.academicYear || "2026/2027"}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                placeholder="Contoh: 2026/2027"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Masa Berlaku Kartu
              </label>
              <input
                type="text"
                value={settings.cardValidity || "2026/2027"}
                onChange={(e) => setSettings({ ...settings, cardValidity: e.target.value })}
                placeholder="Contoh: Selama menjadi Siswa"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
         </div>

        {/* ===================================================
            BAGIAN 4: KONFIGURASI KOP SURAT CETAK
            =================================================== */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>Konfigurasi Kop Surat untuk Cetak Laporan</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Atur logo kiri/kanan dan teks header yang tampil saat mencetak laporan presensi
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Logo Kiri */}
            <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Logo Kiri
              </label>
              <div className="flex items-center gap-4">
                {settings.headerLogoLeftUrl ? (
                  <img src={settings.headerLogoLeftUrl} alt="Logo Kiri" className="w-16 h-16 object-contain rounded-lg bg-white/5 border border-slate-700 p-1" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-400 text-xs">
                    No Logo
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "header-left");
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  {isUploadingHeaderLogo && (
                    <span className="text-[11px] text-blue-400 mt-1 block">Mengunggah...</span>
                  )}
                  {settings.headerLogoLeftUrl && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, headerLogoLeftUrl: "" })}
                      className="text-[11px] text-rose-400 hover:underline mt-1 block"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Kanan */}
            <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Logo Kanan
              </label>
              <div className="flex items-center gap-4">
                {settings.headerLogoRightUrl ? (
                  <img src={settings.headerLogoRightUrl} alt="Logo Kanan" className="w-16 h-16 object-contain rounded-lg bg-white/5 border border-slate-700 p-1" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-400 text-xs">
                    No Logo
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "header-right");
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  {isUploadingHeaderLogo && (
                    <span className="text-[11px] text-blue-400 mt-1 block">Mengunggah...</span>
                  )}
                  {settings.headerLogoRightUrl && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, headerLogoRightUrl: "" })}
                      className="text-[11px] text-rose-400 hover:underline mt-1 block"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Header Text Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300">
                Baris Teks Header (ditampilkan di tengah)
              </label>
              <button
                type="button"
                onClick={handleAddHeaderLine}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                Tambah Baris
              </button>
            </div>

            {(settings.headerLines || []).length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs">
                Belum ada baris teks header. Klik "Tambah Baris" untuk menambahkan.
              </div>
            ) : (
              <div className="space-y-2">
            {(settings.headerLines || []).map((line: any, index: number) => {
                  const lineObj = typeof line === "object" ? line : { text: line || "", fontSize: "text-lg" };
                  return (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lineObj.text || ""}
                      onChange={(e) => handleHeaderLineChange(index, e.target.value)}
                      placeholder={`Baris teks ke-${index + 1}`}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={lineObj.fontSize || "text-lg"}
                      onChange={(e) => handleHeaderFontSizeChange(index, e.target.value)}
                      className="w-40 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="text-xs">Extra Kecil (10px)</option>
                      <option value="text-sm">Kecil (12px)</option>
                      <option value="text-base">Sedang (14px)</option>
                      <option value="text-lg">Besar (16px)</option>
                      <option value="text-xl">Extra Besar (18px)</option>
                      <option value="text-2xl">XXL (20px)</option>
                      <option value="text-3xl">XXXL (24px)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveHeaderLine(index)}
                      className="p-1.5 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Header Styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Warna Teks Header
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.headerTextColor || "#0f172a"}
                  onChange={(e) => setSettings({ ...settings, headerTextColor: e.target.value })}
                  className="w-12 h-8 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400">
                  {settings.headerTextColor || "#0f172a"}
                </span>
              </div>
            </div>
            <div className="flex items-end">
              <div className="text-xs text-slate-400">
                Preview: Kop akan tampil di laporan cetak dengan logo kiri-kanan dan teks tengah
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center gap-2.5 transition transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Seluruh Pengaturan"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
