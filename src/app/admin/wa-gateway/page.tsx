"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Key,
  Globe,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sliders,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export default function WaGatewayPage() {
  const [config, setConfig] = useState<any>({
    provider: "FONNTE",
    isEnabled: false,
    
    fonnteApiKey: "",
    fonnteEndpointUrl: "https://api.fonnte.com/send",
    
    saungwaApiKey: "",
    saungwaAuthKey: "",
    saungwaEndpointUrl: "https://app.saungwa.com/api/create-message",
    saungwaSenderNumber: "",
    
    customName: "",
    customEndpointUrl: "",
    customApiKey: "",
    customMethod: "POST",
    customHeadersJson: '{"Authorization": "Bearer TOKEN_ANDA"}',
    customBodyMappingJson: '{"target": "{target}", "message": "{message}"}',
  });

  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const STATUSES = [
    { id: "HADIR", label: "Hadir Tepat Waktu" },
    { id: "TERLAMBAT", label: "Terlambat" },
    { id: "IZIN", label: "Izin" },
    { id: "SAKIT", label: "Sakit" },
    { id: "ALPA", label: "Alpa (Tanpa Keterangan)" },
    { id: "BOLOS", label: "Bolos / Meninggalkan Sekolah" },
    { id: "DINAS_LUAR", label: "Dinas Luar" },
  ];

  const ROLES = [
    { id: "ALL", label: "Umum (Semua)" },
    { id: "SISWA", label: "Siswa" },
    { id: "GURU", label: "Guru" },
    { id: "PEGAWAI", label: "Pegawai" },
    { id: "KEPALA_SEKOLAH", label: "Kepala Sekolah" },
  ];

  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [testPhone, setTestPhone] = useState<string>("");
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/wa-gateway");
      if (res.ok) {
        const json = await res.json();
        if (json.config) setConfig(json.config);
        
        // Pastikan semua status ada untuk setiap role di state lokal
        const existingTemplates = json.templates || [];
        const initializedTemplates: any[] = [];

        ROLES.forEach(role => {
          STATUSES.forEach(status => {
            const match = existingTemplates.find((t: any) => t.role === role.id && t.status === status.id);
            if (match) {
              initializedTemplates.push(match);
            } else {
              // Jika belum ada di DB, buat template kosong di state
              initializedTemplates.push({
                role: role.id,
                status: status.id,
                contentTemplate: ""
              });
            }
          });
        });

        setTemplates(initializedTemplates);
      }
    } catch (err) {
      console.error("Gagal memuat konfigurasi WhatsApp:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleProviderChange = (newProvider: string) => {
    setConfig((prev: any) => ({
      ...prev,
      provider: newProvider,
    }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/wa-gateway", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          templates,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSaveMessage({ type: "success", text: "Konfigurasi WhatsApp dan template pesan berhasil disimpan." });
      } else {
        setSaveMessage({ type: "error", text: json.error || "Gagal menyimpan konfigurasi." });
      }
    } catch (err: any) {
      setSaveMessage({ type: "error", text: "Terjadi kesalahan saat menyimpan." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhone) {
      setTestResult({ success: false, message: "Nomor WhatsApp tujuan uji coba wajib diisi." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/wa-gateway/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPhone: testPhone,
          config,
        }),
      });

      const json = await res.json();
      setTestResult({
        success: res.ok && (json.success ?? false),
        message: json.message || json.error || (res.ok ? "Koneksi berhasil terhubung!" : "Koneksi gagal."),
      });
    } catch (err: any) {
      setTestResult({ success: false, message: "Gagal menghubungi server gateway." });
    } finally {
      setIsTesting(false);
    }
  };

  const filteredTemplates = templates.filter(t => t.role === selectedRole);

  const updateTemplateContent = (status: string, newContent: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.status === status && t.role === selectedRole ? { ...t, contentTemplate: newContent } : t))
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Pengaturan WhatsApp Gateway & Template Pesan
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Kirim notifikasi pesan otomatis ke wali siswa, guru, dan pegawai saat presensi tercatat
        </p>
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

      <form onSubmit={handleSaveConfig} className="space-y-8">
        {/* BAGIAN 1: PENGATURAN PROVIDER WA */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-bold text-white text-lg flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <span>Pilih Provider WhatsApp Gateway</span>
              </h2>
              <p className="text-xs text-slate-400">
                Pilih layanan gateway yang Anda gunakan atau buat custom endpoint
              </p>
            </div>

            {/* Toggle Status Aktif */}
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
              <span className="text-xs font-bold text-white">Status Gateway:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span
                className={`text-xs font-bold uppercase ${
                  config.isEnabled ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {config.isEnabled ? "Aktif" : "Non-Aktif"}
              </span>
            </div>
          </div>

          {/* Tombol Pilihan Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "FONNTE", name: "Fonnte", desc: "api.fonnte.com" },
              { id: "SAUNGWA", name: "SaungWA", desc: "app.saungwa.com" },
              { id: "CUSTOM", name: "Custom Gateway", desc: "API Endpoint Kustom" },
            ].map((p) => {
              const isSelected = config.provider === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-4 rounded-2xl border text-left transition ${
                    isSelected
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-xs opacity-75 font-mono">{p.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Form Input Sesuai Provider */}
          <div className="space-y-4 pt-2">
            {/* Fonnte Fields */}
            {config.provider === "FONNTE" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Fonnte API Key (Token) *
                  </label>
                  <input
                    type="text"
                    value={config.fonnteApiKey || ""}
                    onChange={(e) => setConfig({ ...config, fonnteApiKey: e.target.value })}
                    placeholder="Masukkan token API Fonnte Anda"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Dapatkan token dari dashboard Fonnte Anda (menu Device).
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Fonnte Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={config.fonnteEndpointUrl || "https://api.fonnte.com/send"}
                    onChange={(e) => setConfig({ ...config, fonnteEndpointUrl: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* SaungWA Fields */}
            {config.provider === "SAUNGWA" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      SaungWA API Key *
                    </label>
                    <input
                      type="text"
                      value={config.saungwaApiKey || ""}
                      onChange={(e) => setConfig({ ...config, saungwaApiKey: e.target.value })}
                      placeholder="Masukkan API Key SaungWA"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      SaungWA Auth Key *
                    </label>
                    <input
                      type="text"
                      value={config.saungwaAuthKey || ""}
                      onChange={(e) => setConfig({ ...config, saungwaAuthKey: e.target.value })}
                      placeholder="Masukkan Auth Key SaungWA"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    SaungWA Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={config.saungwaEndpointUrl || "https://app.saungwa.com/api/create-message"}
                    onChange={(e) => setConfig({ ...config, saungwaEndpointUrl: e.target.value })}
                    placeholder="https://app.saungwa.com/api/create-message"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    SaungWA Nomor Pengirim (Opsional)
                  </label>
                  <input
                    type="text"
                    value={config.saungwaSenderNumber || ""}
                    onChange={(e) => setConfig({ ...config, saungwaSenderNumber: e.target.value })}
                    placeholder="Contoh: 6281234567890"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Custom Provider Fields */}
            {config.provider === "CUSTOM" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nama Provider Custom
                  </label>
                  <input
                    type="text"
                    value={config.customName || ""}
                    onChange={(e) => setConfig({ ...config, customName: e.target.value })}
                    placeholder="Contoh: WA-MySchool"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Custom Endpoint URL *
                    </label>
                    <input
                      type="text"
                      value={config.customEndpointUrl || ""}
                      onChange={(e) => setConfig({ ...config, customEndpointUrl: e.target.value })}
                      placeholder="https://api.gateway-anda.com/v1/send"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      HTTP Method
                    </label>
                    <select
                      value={config.customMethod || "POST"}
                      onChange={(e) => setConfig({ ...config, customMethod: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Custom API Key (Opsional)
                  </label>
                  <input
                    type="text"
                    value={config.customApiKey || ""}
                    onChange={(e) => setConfig({ ...config, customApiKey: e.target.value })}
                    placeholder="Masukkan API Key untuk Custom Gateway"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Custom Headers (Format JSON)
                  </label>
                  <textarea
                    rows={2}
                    value={config.customHeadersJson || ""}
                    onChange={(e) => setConfig({ ...config, customHeadersJson: e.target.value })}
                    placeholder='{"Authorization": "Bearer TOKEN_ANDA", "Content-Type": "application/json"}'
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Custom Body Payload Mapping (Format JSON)
                  </label>
                  <textarea
                    rows={2}
                    value={config.customBodyMappingJson || ""}
                    onChange={(e) =>
                      setConfig({ ...config, customBodyMappingJson: e.target.value })
                    }
                    placeholder='{"target": "{target}", "message": "{message}"}'
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Gunakan placeholder <code>&#123;target&#125;</code> untuk nomor tujuan dan <code>&#123;message&#125;</code> untuk teks pesan.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Test Koneksi Bar */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto flex-1 flex items-center gap-2">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Nomor WA tes (0812xxxxxxxx)"
                className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-650 text-white text-xs font-bold transition whitespace-nowrap disabled:opacity-50"
              >
                {isTesting ? "Menguji..." : "Test Koneksi"}
              </button>
            </div>

            {testResult && (
              <span
                className={`text-xs font-semibold ${
                  testResult.success ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        {/* BAGIAN 2: TEMPLATE PESAN WHATSAPP PER STATUS & PER ROLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <span>Template Pesan WhatsApp Otomatis</span>
            </h2>
            
            {/* Role Switcher */}
            <div className="flex flex-wrap gap-2 mt-4 items-center">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    selectedRole === role.id
                      ? "bg-blue-600 border-blue-400 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Sesuaikan kata-kata pesan notifikasi untuk setiap status kehadiran & peran. Variabel yang tersedia:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                "{nama}",
                "{nis}",
                "{kelas}",
                "{jabatan}",
                "{waktu}",
                "{tanggal}",
                "{status}",
                "{nama_kegiatan}",
                "{nama_sekolah}",
              ].map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-blue-300 font-mono text-[11px]"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredTemplates.map((tpl) => (
              <div
                key={`${tpl.role}-${tpl.status}`}
                className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-white">
                    Status: <span className="text-blue-400">
                      {STATUSES.find(s => s.id === tpl.status)?.label || tpl.status}
                    </span>
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={tpl.contentTemplate}
                  onChange={(e) => updateTemplateContent(tpl.status, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tombol Simpan Konfigurasi */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center gap-2.5 transition transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSaving ? "Menyimpan Konfigurasi..." : "Simpan Pengaturan & Template"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
