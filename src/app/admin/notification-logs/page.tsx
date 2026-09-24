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
} from "lucide-react";
import { formatDateIndo } from "@/lib/date-utils";
import { useTheme } from "@/context/ThemeContext";

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

  const resetFilters = () => {
    setStatus("ALL");
    setSource("ALL");
    setFrom("");
    setTo("");
    setQuery("");
    setPage(1);
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
                        <div className="mt-1 text-[11px] text-slate-500">{log.attendance.activity.name} · {log.attendance.status} · {log.attendance.dateString} {log.attendance.timeString}</div>
                      </td>
                      <td className="px-4 py-4 align-top min-w-80 max-w-xl">
                        <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="text-left whitespace-pre-wrap text-slate-300 hover:text-white">
                          {log.messageContent}
                        </button>
                        {log.errorMessage && <div className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-rose-300">{log.errorMessage}</div>}
                        {expandedId === log.id && <div className={`mt-2 text-[11px] ${muted}`}>Provider: {log.provider || "-"} · Respons: {log.deliveryMessage || "-"}<br />Selesai: {log.completedAt ? `${formatDateIndo(log.completedAt)} ${timeWib(log.completedAt)} WIB` : "sedang diproses"}</div>}
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