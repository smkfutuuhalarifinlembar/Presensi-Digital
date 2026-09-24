"use client";

import React, { useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  AlertCircle,
  Clock3,
  RefreshCw,
  RotateCcw,
  Search,
  Filter,
  MessageSquare,
  Phone,
  Trash2,
  Save,
  Database,
} from "lucide-react";
import { formatDateIndo } from "@/lib/date-utils";
import { useTheme } from "@/context/ThemeContext";
import { getWaGatewaySnapshot, getWaProviderLabel } from "@/lib/wa-provider";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "SENT", label: "Sukses" },
  { value: "FAILED", label: "Gagal" },
];

const SOURCE_OPTIONS = [
  { value: "ALL", label: "Semua sumber" },
  { value: "AUTOMATIC", label: "Otomatis / RFID / QR" },
  { value: "MANUAL", label: "Manual" },
  { value: "RETRY", label: "Kirim ulang" },
  { value: "IZIN_ONLINE", label: "Presensi izin online" },
];

function timeWib(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sourceLabel(source: string) {
  if (source === "RFID" || source === "QR") return `Otomatis (${source})`;
  if (source === "IZIN_ONLINE") return "Izin online";
  if (source === "RETRY") return "Kirim ulang";
  if (source === "MANUAL") return "Manual";
  return "Otomatis";
}

export default function NotificationLogsPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [activeGateway, setActiveGateway] = useState(getWaGatewaySnapshot(null));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cleanupSetting, setCleanupSetting] = useState<any>({
    autoDeleteEnabled: false,
    intervalHours: 1,
    lastRunAt: null,
    lastDeletedCount: 0,
    lastTrigger: null,
    nextRunAt: null,
  });
  const [cleanupCount, setCleanupCount] = useState(0);
  const [canManageCleanup, setCanManageCleanup] = useState(false);
  const [savingCleanup, setSavingCleanup] = useState(false);
  const [deletingAllLogs, setDeletingAllLogs] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        status,
        source,
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/notification-logs?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat riwayat notifikasi.");
      setLogs(json.logs || []);
      setSummary(json.summary || { total: 0, sent: 0, failed: 0, pending: 0 });
      setActiveGateway(json.activeGateway || getWaGatewaySnapshot(null));
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (error: any) {
      setActionMessage({ type: "error", text: error?.message || "Gagal memuat riwayat notifikasi." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadLogs, 250);
    return () => clearTimeout(timer);
  }, [page, status, source, from, to, query]);

  useEffect(() => {
    loadCleanupSettings();
    const poll = setInterval(loadCleanupSettings, 60_000);
    return () => clearInterval(poll);
  }, []);

  const resetFilters = () => {
    setStatus("ALL");
    setSource("ALL");
    setFrom("");
    setTo("");
    setQuery("");
    setPage(1);
  };

  const loadCleanupSettings = async () => {
    try {
      const res = await fetch("/api/notification-log-settings", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat pengaturan hapus riwayat.");
      if (json.setting) setCleanupSetting(json.setting);
      setCleanupCount(json.currentCount || 0);
      setCanManageCleanup(Boolean(json.canManage));
    } catch (error: any) {
      setActionMessage({ type: "error", text: error?.message || "Gagal memuat pengaturan hapus riwayat." });
    }
  };

  const saveCleanupSettings = async () => {
    setSavingCleanup(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/notification-log-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoDeleteEnabled: cleanupSetting.autoDeleteEnabled,
          intervalHours: cleanupSetting.intervalHours,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan pengaturan.");
      setCleanupSetting(json.setting);
      setActionMessage({ type: "success", text: "Pengaturan hapus otomatis berhasil disimpan." });
      await loadCleanupSettings();
    } catch (error: any) {
      setActionMessage({ type: "error", text: error?.message || "Gagal menyimpan pengaturan." });
    } finally {
      setSavingCleanup(false);
    }
  };

  const deleteAllNotificationLogs = async () => {
    if (!window.confirm(`Hapus semua ${cleanupCount} riwayat notifikasi secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeletingAllLogs(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/notification-logs", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus riwayat.");
      setLogs([]);
      setSummary({ total: 0, sent: 0, failed: 0, pending: 0 });
      setTotal(0);
      setTotalPages(1);
      setPage(1);
      setActionMessage({ type: "success", text: json.message || "Riwayat notifikasi berhasil dihapus." });
      await loadCleanupSettings();
    } catch (error: any) {
      setActionMessage({ type: "error", text: error?.message || "Gagal menghapus riwayat." });
    } finally {
      setDeletingAllLogs(false);
    }
  };

  const retry = async (log: any) => {
    if (!window.confirm(`Kirim ulang notifikasi WhatsApp untuk ${log.attendance.person.name}?`)) return;
    setRetryingId(log.id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/notification-logs/${log.id}/retry`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim ulang notifikasi.");
      setActionMessage({ type: json.success ? "success" : "error", text: json.message });
      await loadLogs();
    } catch (error: any) {
      setActionMessage({ type: "error", text: error?.message || "Gagal mengirim ulang notifikasi." });
    } finally {
      setRetryingId(null);
    }
  };

  const card = dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const input = dark
    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
    : "bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500";
  const muted = dark ? "text-slate-400" : "text-gray-500";

  const cards = [
    { label: "Total", value: summary.total, icon: BellRing, color: "text-blue-400" },
    { label: "Sukses", value: summary.sent, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Gagal", value: summary.failed, icon: AlertCircle, color: "text-rose-400" },
    { label: "Diproses", value: summary.pending, icon: Clock3, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Riwayat Notifikasi WhatsApp</h1>
          <p className={`text-sm mt-1 ${muted}`}>Pantau setiap percobaan kirim, lihat error, dan kirim ulang notifikasi gagal.</p>
        </div>
        <button onClick={loadLogs} disabled={loading} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Segarkan
        </button>
      </div>

      <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${activeGateway.isConfigured && activeGateway.isEnabled ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10"}`}>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Provider WhatsApp aktif</div>
          <div className="mt-1 font-black text-white text-lg">
            {activeGateway.label || "Belum ada"} · {activeGateway.isEnabled ? "Aktif" : "Non-Aktif"}
          </div>
        </div>
        <div className={`text-xs font-semibold ${activeGateway.isConfigured ? "text-emerald-300" : "text-rose-300"}`}>
          {activeGateway.isConfigured
            ? "Credential aktif tersedia. Notifikasi baru memakai provider ini."
            : "Credential provider aktif belum lengkap. Periksa menu WhatsApp Gateway."}
        </div>
      </div>

      <div className={`rounded-3xl border p-5 shadow-sm ${card}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-white">Pengaturan Hapus Riwayat Otomatis</h2>
              <p className={`text-xs mt-1 ${muted}`}>
                Mode saat ini: {cleanupSetting.autoDeleteEnabled ? `Otomatis setiap ${cleanupSetting.intervalHours} jam` : "Manual"}.
                Semua status sukses, gagal, dan diproses akan dihapus bersama saat ada aktivitas setelah jadwal jatuh tempo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(cleanupSetting.autoDeleteEnabled)}
                disabled={!canManageCleanup}
                onChange={(e) => setCleanupSetting((value: any) => ({ ...value, autoDeleteEnabled: e.target.checked }))}
                className="w-4 h-4 rounded accent-blue-600"
              />
              Hapus otomatis
            </label>
            <label className={`text-xs ${muted}`}>
              Interval jam
              <input
                type="number"
                min={1}
                max={168}
                value={cleanupSetting.intervalHours || 1}
                disabled={!canManageCleanup || !cleanupSetting.autoDeleteEnabled}
                onChange={(e) => setCleanupSetting((value: any) => ({ ...value, intervalHours: Number(e.target.value) }))}
                className={`ml-2 w-20 rounded-lg border px-2 py-1.5 ${input}`}
              />
            </label>
            {canManageCleanup && (
              <button
                onClick={saveCleanupSettings}
                disabled={savingCleanup}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Simpan
              </button>
            )}
            <button
              onClick={deleteAllNotificationLogs}
              disabled={deletingAllLogs || cleanupCount === 0}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Manual
            </button>
          </div>
        </div>
        <div className={`mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] ${muted}`}>
          <span>Data saat ini: <b className="text-white">{cleanupCount}</b></span>
          <span>Terakhir dihapus: <b className="text-white">{cleanupSetting.lastRunAt ? `${formatDateIndo(cleanupSetting.lastRunAt)} ${timeWib(cleanupSetting.lastRunAt)} WIB` : "-"}</b></span>
          <span>Jadwal berikutnya: <b className="text-white">{cleanupSetting.nextRunAt ? `${formatDateIndo(cleanupSetting.nextRunAt)} ${timeWib(cleanupSetting.nextRunAt)} WIB` : "Nonaktif / manual"}</b></span>
        </div>
        {!canManageCleanup && <div className="mt-3 text-[11px] text-amber-300">Operator/TU dapat menghapus manual; pengaturan otomatis hanya dapat diubah Super Admin.</div>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`rounded-2xl border p-4 shadow-sm ${card}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${muted}`}>{item.label}</span>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="text-2xl font-black text-white mt-2">{item.value}</div>
            </div>
          );
        })}
      </div>

      <div className={`rounded-3xl border p-5 shadow-sm ${card}`}>
        <div className="flex items-center gap-2 mb-4 text-white font-bold"><Filter className="w-4 h-4 text-blue-400" /> Filter riwayat</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Nama, NIS/NIP, nomor, pesan, error..." className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm ${input}`} />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`rounded-xl border px-3 py-2.5 text-sm ${input}`}>
            {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className={`rounded-xl border px-3 py-2.5 text-sm ${input}`}>
            {SOURCE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button onClick={resetFilters} className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800">Reset</button>
          <label className={`text-xs ${muted}`}>Dari <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`mt-1 block rounded-xl border px-3 py-2.5 text-sm ${input}`} /></label>
          <label className={`text-xs ${muted}`}>Sampai <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`mt-1 block rounded-xl border px-3 py-2.5 text-sm ${input}`} /></label>
        </div>
      </div>

      {actionMessage && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${actionMessage.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
          {actionMessage.text}
        </div>
      )}

      <div className={`rounded-3xl border overflow-hidden shadow-xl ${card}`}>
        {loading ? (
          <div className={`p-12 text-center ${muted}`}><RefreshCw className="w-7 h-7 mx-auto mb-3 animate-spin text-blue-500" />Memuat riwayat...</div>
        ) : logs.length === 0 ? (
          <div className={`p-12 text-center ${muted}`}><MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />Belum ada riwayat sesuai filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className={`${dark ? "bg-slate-800/80 text-slate-400" : "bg-gray-50 text-gray-500"} border-b ${dark ? "border-slate-800" : "border-gray-200"}`}>
                <tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Penerima & Presensi</th><th className="px-4 py-3">Pesan / Error</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr>
              </thead>
              <tbody className={`divide-y ${dark ? "divide-slate-800" : "divide-gray-100"}`}>
                {logs.map((log) => {
                  const sent = log.status === "SENT";
                  const failed = log.status === "FAILED";
                  return (
                    <tr key={log.id} className={dark ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}>
                      <td className="px-4 py-4 whitespace-nowrap align-top">
                        <div className="font-bold text-white">{timeWib(log.createdAt)} WIB</div>
                        <div className={`text-[11px] ${muted}`}>{formatDateIndo(log.createdAt)}</div>
                        <div className="mt-1 text-[10px] text-slate-500">Percobaan #{log.attempt} · {sourceLabel(log.source)}</div>
                      </td>
                      <td className="px-4 py-4 align-top min-w-56">
                        <div className="font-bold text-white">{log.attendance.person.name}</div>
                        <div className={`text-xs ${muted}`}>{log.attendance.person.nisNip} · {log.attendance.person.className || log.attendance.person.role}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Phone className="w-3 h-3" />{log.targetPhone || "Nomor tidak tersedia"}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                            Dipakai: {getWaProviderLabel(log.provider)}
                          </span>
                          {log.provider !== activeGateway.provider && (
                            <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              Berbeda dari provider aktif
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">{log.attendance.activity.name} · {log.attendance.status} · {log.attendance.dateString} {log.attendance.timeString}</div>
                      </td>
                      <td className="px-4 py-4 align-top min-w-80 max-w-xl">
                        <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="text-left whitespace-pre-wrap text-slate-300 hover:text-white">
                          {log.messageContent}
                        </button>
                        {log.errorMessage && <div className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-rose-300">{log.errorMessage}</div>}
                        {expandedId === log.id && <div className={`mt-2 text-[11px] ${muted}`}>Provider: {getWaProviderLabel(log.provider)} · Respons: {log.deliveryMessage || "-"}<br />Selesai: {log.completedAt ? `${formatDateIndo(log.completedAt)} ${timeWib(log.completedAt)} WIB` : "sedang diproses"}</div>}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${sent ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : failed ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
                          {sent ? "Sukses" : failed ? "Gagal" : "Diproses"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right align-top">
                        {failed ? (
                          <button onClick={() => retry(log)} disabled={retryingId === log.id} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50">
                            <RotateCcw className={`w-3.5 h-3.5 ${retryingId === log.id ? "animate-spin" : ""}`} /> Kirim ulang
                          </button>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className={`p-4 border-t flex items-center justify-between text-xs ${muted} ${dark ? "border-slate-800 bg-slate-950/30" : "border-gray-200"}`}>
            <span>Halaman {page} dari {totalPages} ({total} data)</span>
            <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40">Sebelumnya</button><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40">Selanjutnya</button></div>
          </div>
        )}
      </div>
    </div>
  );
}