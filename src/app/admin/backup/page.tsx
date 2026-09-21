"use client";

import React, { useState, useRef } from "react";
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Clock,
  FileDown,
} from "lucide-react";

export default function BackupRestorePage() {
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreResult, setRestoreResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Gagal mengunduh backup");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const nameMatch = /filename="?([^";]+)"?/.exec(disposition);
      a.download =
        nameMatch?.[1] || `Backup_Presensi_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("Gagal mengunduh backup: " + err.message);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setRestoreResult(null);
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (!confirm("Apakah Anda yakin ingin restore database? Data saat ini akan di-backup otomatis sebelum replace.")) {
      return;
    }

    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const fd = new FormData();
      fd.append("file", selectedFile);

      const res = await fetch("/api/restore", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setRestoreResult({ type: "success", text: json.message });
      } else {
        setRestoreResult({ type: "error", text: json.error || "Gagal restore database" });
      }
    } catch (err: any) {
      setRestoreResult({ type: "error", text: err.message || "Terjadi kesalahan saat restore" });
    } finally {
      setIsRestoring(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-400" />
            Backup & Restore Data
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cadangkan database atau pulihkan dari file backup sebelumnya (Super Admin only)
          </p>
        </div>
      </div>

      {restoreResult && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm ${
            restoreResult.type === "success"
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
              : "bg-rose-950/80 border-rose-500 text-rose-200"
          }`}
        >
          {restoreResult.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{restoreResult.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Backup Database</h2>
              <p className="text-xs text-slate-400">Unduh file backup database (.sql)</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Format file: PostgreSQL (.sql)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Semua data tersertakan (orang, presensi, pengaturan)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Backup dibuat: {new Date().toLocaleString("id-ID")}</span>
            </div>
          </div>

          <button
            onClick={handleBackup}
            className="w-full px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition transform active:scale-95"
          >
            <FileDown className="w-5 h-5" />
            <span>Unduh Backup Sekarang</span>
          </button>
        </div>

        {/* Restore Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Restore Database</h2>
              <p className="text-xs text-slate-400">Pulihkan dari file backup (.sql)</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Peringatan:</strong> Replace database akan menimpa data saat ini. 
              Sistem akan otomatis membuat backup sebelum replace.
            </span>
          </div>

          <form onSubmit={handleRestore} className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-6 text-center transition bg-slate-800/40">
              <Database className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql,.db,.sqlite,.sqlite3"
                onChange={handleFileSelect}
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
              />
              {selectedFile && (
                <div className="mt-3 text-xs font-semibold text-amber-400">
                  File dipilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!selectedFile || isRestoring}
              className="w-full px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-xl shadow-amber-600/20 flex items-center justify-center gap-2.5 transition transform active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              <span>{isRestoring ? "Memproses Restore..." : "Restore Database"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200 space-y-2">
        <p className="font-bold text-blue-100">💡 Tips Backup & Restore:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Lakukan backup secara berkala untuk keamanan data</li>
          <li>File backup berisi seluruh data: orang, presensi, pengaturan, dll</li>
          <li>Untuh restore, aplikasi perlu di-restart setelah proses selesai</li>
          <li>Backup otomatis dibuat di folder /backups sebelum setiap restore</li>
        </ul>
      </div>
    </div>
  );
}
