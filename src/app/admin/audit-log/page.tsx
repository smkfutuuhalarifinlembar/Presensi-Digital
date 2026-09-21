"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Clock, User, ShieldCheck, RefreshCw } from "lucide-react";
import { formatDateIndo } from "@/lib/date-utils";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/audit-log?page=${page}&limit=25`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error("Gagal memuat log audit:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Log Aktivitas & Jejak Audit
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Rekam jejak setiap perubahan data penting dan input presensi manual oleh admin/operator ({total} aktivitas)
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 self-start sm:self-auto transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Tabel Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <span>Memuat log aktivitas...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Belum ada log aktivitas yang tercatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Waktu</th>
                  <th className="px-4 py-3.5 font-bold">Admin Pengelola</th>
                  <th className="px-4 py-3.5 font-bold">Tindakan (Action)</th>
                  <th className="px-4 py-3.5 font-bold">Target</th>
                  <th className="px-5 py-3.5 font-bold">Detail Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-xs">
                {logs.map((log) => {
                  const isManual = log.action === "MANUAL_ATTENDANCE";
                  const isDelete = log.action.includes("DELETE");

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 whitespace-nowrap text-slate-400 font-sans">
                        <div className="font-semibold text-white">
                          {new Date(log.timestamp).toLocaleTimeString("id-ID")} WIB
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDateIndo(log.timestamp)}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap font-sans font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{log.adminName}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            isManual
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isDelete
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-sans font-semibold text-white">
                        {log.target}
                      </td>

                      <td className="px-5 py-4 font-sans text-slate-400 max-w-xs truncate">
                        {log.details || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Halaman {page} dari {totalPages}
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
    </div>
  );
}
