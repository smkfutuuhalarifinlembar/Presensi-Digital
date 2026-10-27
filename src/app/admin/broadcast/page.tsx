"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Send,
  RefreshCw,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Search,
  Filter,
  Building2,
  MessageSquare,
  Phone,
   RotateCcw,
   Users,
   Calendar,
   X,
   ChevronLeft,
   ChevronRight,
   BarChart3,
   Trash2,
} from "lucide-react";
import { formatDateIndo } from "@/lib/date-utils";
import { useTheme } from "@/context/ThemeContext";
import { getWaProviderLabel } from "@/lib/wa-provider";
import { confirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/context/ToastContext";

type Tab = "send" | "history";

interface Institution {
  id: string;
  code: string;
  name: string;
  level: string;
  isActive: boolean;
}

interface Batch {
  id: string;
  scope: string;
  institutionId: string | null;
  institutionName: string | null;
  institutionCode: string | null;
  targetRole: string | null;
  message: string;
  delaySeconds: number;
  totalTargets: number;
  withPhoneCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  status: string;
  createdByName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface BroadcastMessage {
  id: string;
  batchId: string;
  personId: string | null;
  personName: string | null;
  nisNip: string | null;
  className: string | null;
  targetPhone: string | null;
  messageContent: string;
  provider: string | null;
  status: string;
  deliveryMessage: string | null;
  errorMessage: string | null;
  attempt: number;
  sentAt: string | null;
  createdAt: string;
}

function timeWib(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const DELAY_OPTIONS = [0, 1, 2, 3, 5, 10];
const ROLE_OPTIONS = [
  { value: "SISWA", label: "Siswa" },
  { value: "GURU", label: "Guru" },
  { value: "PEGAWAI", label: "Pegawai" },
  { value: "ALL", label: "Semua Orang" },
];

export default function BroadcastPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const { toast } = useToast();
  const card = dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const input = dark
    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
    : "bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500";
  const muted = dark ? "text-slate-400" : "text-gray-500";
  const inputMuted = dark ? "text-slate-300" : "text-slate-700";

  const [tab, setTab] = useState<Tab>("send");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [form, setForm] = useState({
    institutionId: "ALL",
    targetRole: "SISWA",
    delaySeconds: 2,
    message: "",
    selectAllClasses: true,
    selectedClasses: [] as string[],
  });

  const [preview, setPreview] = useState<any>(null);
  const [createdBatch, setCreatedBatch] = useState<Batch | null>(null);
  const [activeGateway, setActiveGateway] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{
    sent: number;
    failed: number;
    skipped: number;
    morePending: boolean;
  } | null>(null);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyTotalPages, setHistoryPagesCount] = useState(1);
  const [historyLimit] = useState(20);
  const [historyStatus, setHistoryStatus] = useState("ALL");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const [detailBatch, setDetailBatch] = useState<Batch | null>(null);
  const [detailMessages, setDetailMessages] = useState<BroadcastMessage[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailPages, setDetailPages] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const [detailStatus, setDetailStatus] = useState("ALL");
  const [detailQuery, setDetailQuery] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  const loadInstitutions = useCallback(async () => {
    try {
      const res = await fetch("/api/institutions", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setInstitutions((json.institutions || []).filter((i: any) => i.isActive));
      }
    } catch {
      // ignore
    }
  }, []);

  const previewTargets = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        institutionId: form.institutionId,
        targetRole: form.targetRole,
      });
      const sendClasses =
        form.institutionId !== "ALL" && !form.selectAllClasses && form.selectedClasses.length > 0;
      if (sendClasses) {
        form.selectedClasses.forEach((c) => params.append("classNames", c));
      }
      const res = await fetch(`/api/broadcast/targets?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setPreview(json);
      } else {
        setPreview(null);
      }
    } catch {
      setPreview(null);
    }
  }, [form]);

  const createBatch = async () => {
    if (!form.message.trim()) {
      toast("Isi pesan wajib diisi.", "error");
      return;
    }
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: form.institutionId === "ALL" ? null : form.institutionId,
          targetRole: form.targetRole,
          message: form.message,
          delaySeconds: form.delaySeconds,
          classNames:
            form.institutionId === "ALL" || form.selectAllClasses
              ? []
              : form.selectedClasses,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error || "Gagal membuat batch.", "error");
        return;
      }
      setCreatedBatch(json.batch);
      setSendProgress(null);
      toast("Batch berhasil dibuat. Silakan kirim.", "success");
    } catch (err: any) {
      toast(err?.message || "Gagal membuat batch.", "error");
    }
  };

  const refreshBatch = async (id: string) => {
    try {
      const res = await fetch(`/api/broadcast/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setCreatedBatch(json.batch);
      return json;
    } catch {
      return null;
    }
  };

  const sendBatch = async () => {
    if (!createdBatch) return;
    setSending(true);
    setSendProgress(null);
    let attempts = 0;
    const maxAttempts = 90;
    try {
      while (attempts < maxAttempts) {
        const res = await fetch(`/api/broadcast/${createdBatch.id}/send`, { method: "POST" });
        const json = await res.json();
        if (!res.ok) {
          toast(json.error || "Gagal memulai pengiriman.", "error");
          break;
        }
        const detail = await refreshBatch(createdBatch.id);
        const b = detail?.batch || json.batch;
        setSendProgress({
          sent: b?.sentCount || 0,
          failed: b?.failedCount || 0,
          skipped: b?.skippedCount || 0,
          morePending: Boolean(json.morePending),
        });
        if (b?.status === "COMPLETED" || (!json.morePending && b?.status !== "RUNNING")) {
          toast(
            `Pengiriman selesai. Terkirim: ${b?.sentCount}, Gagal: ${b?.failedCount}, Dilewati: ${b?.skippedCount}.`,
            "success"
          );
          break;
        }
        attempts += 1;
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err: any) {
      toast(err?.message || "Gagal mengirim broadcast.", "error");
    } finally {
      setSending(false);
      await refreshBatch(createdBatch.id);
    }
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: String(historyLimit),
        status: historyStatus,
      });
      const res = await fetch(`/api/broadcast?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setBatches(json.batches || []);
        setHistoryTotal(json.total || 0);
        setHistoryPagesCount(json.totalPages || 1);
        setActiveGateway(json.activeGateway || null);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyLimit, historyStatus]);

  const openDetail = async (batch: Batch) => {
    setDetailBatch(batch);
    setDetailPage(1);
    setDetailStatus("ALL");
    setDetailQuery("");
  };

  const closeDetail = () => {
    setDetailBatch(null);
    setDetailMessages([]);
  };

  const loadDetail = useCallback(async () => {
    if (!detailBatch) return;
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(detailPage),
        limit: "25",
        status: detailStatus,
        ...(detailQuery.trim() ? { q: detailQuery.trim() } : {}),
      });
      const res = await fetch(`/api/broadcast/${detailBatch.id}?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setDetailMessages(json.messages || []);
        setDetailTotal(json.total || 0);
        setDetailPages(json.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }, [detailBatch, detailPage, detailStatus, detailQuery]);

  const retryMessage = async (msg: BroadcastMessage) => {
    const result = await confirmDialog.confirm({
      title: "Kirim Ulang Pesan",
      message: `Kirim ulang ke ${msg.targetPhone} (${msg.personName})?`,
      variant: "warning",
      confirmLabel: "Kirim",
    });
    if (!result.confirmed) return;
    try {
      const res = await fetch(`/api/broadcast-messages/${msg.id}/retry`, { method: "POST" });
      const json = await res.json();
      toast(json.message || "Gagal mengirim ulang.", json.success ? "success" : "error");
      await loadDetail();
      if (detailBatch) await refreshBatch(detailBatch.id);
    } catch (err: any) {
      toast(err?.message || "Gagal mengirim ulang.", "error");
    }
  };

  const resendAllFailed = async () => {
    if (!detailBatch) return;
    const failed = detailMessages.filter((m) => m.status === "FAILED");
    if (failed.length === 0) {
      toast("Tidak ada pesan gagal pada halaman ini.", "success");
      return;
    }
    const result = await confirmDialog.confirm({
      title: "Konfirmasi Kirim Ulang",
      message: `Kirim ulang pesan broadcast gagal pada batch ini?`,
      variant: "warning",
      confirmLabel: "Kirim Ulang",
    });
    if (!result.confirmed) return;
    setSending(true);
    try {
      const res = await fetch(`/api/broadcast/${detailBatch.id}/retry-failed`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim ulang.");
      toast(json.message, json.success ? "success" : "error");
      await loadDetail();
      await refreshBatch(detailBatch.id);
    } catch (err: any) {
      toast(err?.message || "Gagal mengirim ulang.", "error");
    } finally {
      setSending(false);
    }
  };

  const resendBatchFailed = async (batch: Batch) => {
    const result = await confirmDialog.confirm({
      title: "Kirim Ulang Gagal",
      message: `Kirim ulang semua pesan GAGAL pada batch ini (${batch.failedCount} pesan)?`,
      variant: "warning",
      confirmLabel: "Kirim Ulang Semua",
    });
    if (!result.confirmed) return;
    setActionLoadingId(batch.id);
    try {
      const res = await fetch(`/api/broadcast/${batch.id}/retry-failed`, { method: "POST" });
      const json = await res.json();
      toast(json.message, json.success ? "success" : "error");
      await loadHistory();
      if (detailBatch?.id === batch.id) await loadDetail();
    } catch (err: any) {
      toast(err?.message || "Gagal mengirim ulang.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteBatch = async (batch: Batch) => {
    if (batch.status === "RUNNING") {
      toast("Hentikan pengiriman sebelum menghapus batch yang sedang mengirim.", "warning");
      return;
    }
    const message = `Hapus riwayat broadcast ini? ${batch.sentCount + batch.failedCount + batch.skippedCount} pesan akan dihapus permanen.`;
    const result = await confirmDialog.confirm({
      title: "Hapus Batch",
      message,
      variant: "danger",
      confirmLabel: "Hapus",
    });
    if (!result.confirmed) return;
    setActionLoadingId(batch.id);
    try {
      const res = await fetch(`/api/broadcast/${batch.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus batch.");
      toast(json.message, "success");
      await loadHistory();
      if (detailBatch?.id === batch.id) closeDetail();
    } catch (err: any) {
      toast(err?.message || "Gagal menghapus batch.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const cleanupOldBatches = async () => {
    const result = await confirmDialog.confirm({
      title: "Bersihkan Riwayat Lama",
      message: "Hapus semua riwayat broadcast yang sudah lebih dari 24 jam?",
      variant: "warning",
      confirmLabel: "Bersihkan",
    });
    if (!result.confirmed) return;
    setCleanupLoading(true);
    try {
      const res = await fetch("/api/broadcast/cleanup", { method: "POST" });
      const json = await res.json();
      toast(json.message, json.success ? "success" : "error");
      await loadHistory();
    } catch (err: any) {
      toast(err?.message || "Gagal membersihkan riwayat.", "error");
    } finally {
      setCleanupLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  useEffect(() => {
    previewTargets();
  }, [form, previewTargets]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const availableClasses: string[] = preview?.classes || [];

  const selectedInstitution =
    form.institutionId === "ALL"
      ? "Semua Lembaga"
      : institutions.find((i) => i.id === form.institutionId)?.name || form.institutionId;

  const statusBadge = (status: string) => {
    const sent = status === "SENT";
    const failed = status === "FAILED";
    const skipped = status === "SKIPPED";
    const color = sent
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : failed
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : skipped
      ? "bg-slate-500/15 text-slate-400 border-slate-500/30"
      : "bg-amber-500/15 text-amber-300 border-amber-500/30";
    const label = sent ? "Sukses" : failed ? "Gagal" : skipped ? "Dilewati" : "Diproses";
    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${color}`}
      >
        {label}
      </span>
    );
  };

  const batchStatusBadge = (status: string) => {
    const color =
      status === "COMPLETED"
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
        : status === "RUNNING"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : status === "FAILED"
        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
        : "bg-slate-500/15 text-slate-400 border-slate-500/30";
    const label = status === "COMPLETED" ? "Selesai" : status === "RUNNING" ? "Mengirim" : status === "FAILED" ? "Gagal" : "Siap";
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${color}`}>
        {label}
      </span>
    );
  };

  const renderSendTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5 space-y-5">
        <div className={`rounded-3xl border p-5 shadow-sm ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Filter className="w-5 h-5" />
            </div>
            <h2 className="font-black text-white">Filter Sasaran</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${dark ? "text-slate-300" : "text-slate-600"}`}>
                Lembaga
              </label>
              <select
                value={form.institutionId}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    institutionId: v,
                    selectAllClasses: true,
                    selectedClasses: [],
                  }));
                }}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm ${input}`}
              >
                <option value="ALL">Semua Lembaga</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.code}] {i.name} ({i.level})
                  </option>
                ))}
              </select>
            </div>

            {form.institutionId !== "ALL" && (
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${dark ? "text-slate-300" : "text-slate-600"}`}>
                  Kelas {availableClasses.length > 0 ? "" : preview?.institution?.name && "(belum ada kelas)"}
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.selectAllClasses}
                      onChange={(e) => setForm((f) => ({ ...f, selectAllClasses: e.target.checked, selectedClasses: [] }))}
                      className="rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Pilih Semua Kelas</span>
                  </label>
                  {!form.selectAllClasses && availableClasses.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {availableClasses.map((c: string) => {
                        const checked = form.selectedClasses.includes(c);
                        return (
                          <label key={c} className="flex items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={checked || form.selectAllClasses}
                              onChange={(e) => {
                                const checkedNow = e.target.checked;
                                if (form.selectAllClasses && !checkedNow) {
                                  setForm((f) => ({
                                    ...f,
                                    selectAllClasses: false,
                                    selectedClasses: availableClasses.filter((x: string) => x !== c),
                                  }));
                                } else if (form.selectAllClasses && checkedNow) {
                                  setForm((f) => ({ ...f, selectAllClasses: true, selectedClasses: [] }));
                                } else if (checkedNow) {
                                  setForm((f) => ({
                                    ...f,
                                    selectedClasses: [...f.selectedClasses, c],
                                  }));
                                } else {
                                  setForm((f) => ({
                                    ...f,
                                    selectedClasses: f.selectedClasses.filter((x: string) => x !== c),
                                  }));
                                }
                              }}
                              className="rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{c}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                {!form.selectAllClasses && (
                  <p className={`mt-1 text-[11px] ${muted}`}>
                    Terpilih: {form.selectedClasses.length} kelas (kosongkan semua untuk tidak mengirim).
                  </p>
                )}
              </div>
            )}

            <div>
              <label className={`block text-xs font-bold mb-1.5 ${dark ? "text-slate-300" : "text-slate-600"}`}>
                Peran / Target
              </label>
              <select
                value={form.targetRole}
                onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm ${input}`}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className={`mt-1 text-[11px] ${muted}`}>
                Notifikasi dikirim ke kolom WhatsApp orang tua (parentPhone) yang terdaftar.
              </p>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1.5 ${dark ? "text-slate-300" : "text-slate-600"}`}>
                Atur Delay (detik) untuk anti-spam
              </label>
              <select
                value={form.delaySeconds}
                onChange={(e) => setForm((f) => ({ ...f, delaySeconds: Number(e.target.value) }))}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm ${input}`}
              >
                {DELAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === 0 ? "Tanpa jeda (tidak disarankan)" : `${d} detik`}
                  </option>
                ))}
              </select>
              <p className={`mt-1 text-[11px] ${muted}`}>
                Jeda antar-pesan. Disarankan ≥ 2 detik agar tidak terblokir oleh WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {activeGateway && (
          <div
            className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              activeGateway.isConfigured && activeGateway.isEnabled
                ? "border-emerald-500/25 bg-emerald-500/10"
                : "border-rose-500/25 bg-rose-500/10"
            }`}
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Provider WhatsApp aktif
              </div>
              <div className="mt-1 font-black text-white text-lg">
                {activeGateway.label || "Belum ada"} · {activeGateway.isEnabled ? "Aktif" : "Non-Aktif"}
              </div>
            </div>
            <div className={`text-xs font-semibold ${activeGateway.isConfigured ? "text-emerald-300" : "text-rose-300"}`}>
              {activeGateway.isConfigured && activeGateway.isEnabled
                ? "Gateway siap. Pastikan kredit/token cukup."
                : "Gateway belum aktif. Periksa menu WhatsApp Gateway."}
            </div>
          </div>
        )}
      </div>

      <div className="xl:col-span-7 space-y-5">
        <div className={`rounded-3xl border p-5 shadow-sm ${card}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="font-black text-white">Isi Pesan Notifikasi</h2>
          </div>
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Tulis pesan yang akan dikirim ke nomor WhatsApp orang tua..."
            className={`w-full min-h-[160px] rounded-xl border px-3 py-3 text-sm resize-y ${input}`}
          />
          <div className={`mt-2 text-xs ${muted}`}>
            Target: <b className="text-white">{selectedInstitution}</b> · Peran:{" "}
            <b className="text-white">{form.targetRole}</b> · Delay:{" "}
            <b className="text-white">{form.delaySeconds}s</b>
            {form.institutionId !== "ALL" && (
              <span>
                {" "}
                · Kelas:{" "}
                <b className="text-white">
                  {form.selectAllClasses ? "Semua" : `${form.selectedClasses.length} terpilih`}
                </b>
              </span>
            )}
          </div>
        </div>

        {preview && (
          <div className={`rounded-3xl border p-5 shadow-sm ${card}`}>
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h2 className="font-black text-white">Pratinjau Sasaran</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border p-3">
                <div className={`text-xs font-bold uppercase ${muted}`}>Total Orang</div>
                <div className="text-2xl font-black text-white mt-1">{preview.total}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className={`text-xs font-bold uppercase ${muted}`}>Ada Nomor WA</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{preview.withPhone}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className={`text-xs font-bold uppercase ${muted}`}>Tanpa Nomor WA</div>
                <div className="text-2xl font-black text-rose-400 mt-1">{preview.withoutPhone}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className={`text-xs font-bold uppercase ${muted}`}>Delay</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{form.delaySeconds}s</div>
              </div>
            </div>
            {preview.withoutPhone > 0 && (
              <p className={`mt-3 text-xs ${muted}`}>
                {preview.withoutPhone} orang tidak memiliki nomor WhatsApp dan tidak akan dikirimi pesan.
              </p>
            )}
            {preview.withPhone === 0 && (
              <p className={`mt-3 text-xs text-rose-300`}>
                Tidak ada sasaran dengan nomor WhatsApp. Periksa filter lembaga/peran/kelas, atau pastikan nomor WhatsApp (phone untuk guru/pegawai, parentPhone untuk siswa) sudah terisi.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {!createdBatch ? (
            <button
              onClick={createBatch}
              disabled={!form.message.trim() || !preview || preview.withPhone === 0}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Simpan & Pratinjau
            </button>
          ) : (
            <button
              onClick={sendBatch}
              disabled={sending || createdBatch.status === "COMPLETED"}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Mengirim..." : "Kirim Sekarang"}
            </button>
          )}
        </div>

        {createdBatch && (
          <div className={`rounded-3xl border p-5 shadow-sm ${card}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white">Status Pengiriman</h3>
              </div>
              {batchStatusBadge(createdBatch.status)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border p-3">
                <div className={`text-xs font-bold uppercase ${muted}`}>Terkirim</div>
                <div className="text-xl font-black text-emerald-400 mt-1">{createdBatch.sentCount}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className={`text-xs font-bold uppercase ${muted}`}>Gagal</div>
                <div className="text-xl font-black text-rose-400 mt-1">{createdBatch.failedCount}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className={`text-xs font-bold uppercase ${muted}`}>Dilewati</div>
                <div className="text-xl font-black text-slate-400 mt-1">{createdBatch.skippedCount}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className={`text-xs font-bold uppercase ${muted}`}>Total</div>
                <div className="text-xl font-black text-white mt-1">{createdBatch.totalTargets}</div>
              </div>
            </div>
            {sending && sendProgress && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${createdBatch.totalTargets
                        ? (createdBatch.sentCount + createdBatch.failedCount + createdBatch.skippedCount) /
                          createdBatch.totalTargets *
                          100
                        : 0}%`,
                    }}
                  />
                </div>
                <p className={`mt-1 text-xs ${muted}`}>
                  Mengirim dengan delay {createdBatch.delaySeconds}s antar-pesan...
                </p>
              </div>
            )}
            {createdBatch.status === "COMPLETED" && createdBatch.failedCount > 0 && (
              <button
                onClick={() => setDetailBatch(createdBatch)}
                className="mt-4 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Lihat & Kirim Ulang Gagal
              </button>
            )}
            {createdBatch.status === "COMPLETED" && createdBatch.failedCount === 0 && (
              <p className="mt-3 text-xs text-emerald-400">Semua pesan berhasil terkirim.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-black text-white">Riwayat Kiriman Broadcast</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={historyStatus}
            onChange={(e) => {
              setHistoryStatus(e.target.value);
              setHistoryPage(1);
            }}
            className={`rounded-xl border px-3 py-2 text-sm ${input} w-40`}
          >
            <option value="ALL">Semua status</option>
            <option value="PENDING">Siap / Proses</option>
            <option value="RUNNING">Mengirim</option>
            <option value="COMPLETED">Selesai</option>
            <option value="FAILED">Gagal</option>
          </select>
          <button
            onClick={cleanupOldBatches}
            disabled={cleanupLoading}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            title="Hapus riwayat broadcast yang sudah lebih dari 24 jam"
          >
            {cleanupLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Bersihkan &gt;24h
          </button>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${card} ${muted}`}>
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>Belum ada riwayat broadcast.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead
              className={`${dark ? "bg-slate-800/80 text-slate-400" : "bg-gray-50 text-gray-500"} border-b ${
                dark ? "border-slate-800" : "border-gray-200"
              }`}
            >
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Lembaga / Scope</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Terkirim</th>
                <th className="px-4 py-3">Gagal</th>
                <th className="px-4 py-3">Dilewati</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dark ? "divide-slate-800" : "divide-gray-100"}`}>
              {batches.map((b) => (
                <tr key={b.id} className={dark ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-bold text-white">{timeWib(b.createdAt)} WIB</div>
                    <div className={`text-[11px] ${muted}`}>{formatDateIndo(b.createdAt)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-white">{b.institutionName || "Semua Lembaga"}</div>
                    <div className={`text-xs ${muted}`}>{b.scope === "INSTITUTION" ? "Per-lembaga" : "Semua lembaga"} · {b.targetRole || "SISWA"}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{b.totalTargets}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-emerald-400 font-bold">{b.sentCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-rose-400 font-bold">{b.failedCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-slate-400 font-bold">{b.skippedCount}</td>
                  <td className="px-4 py-4 whitespace-nowrap">{batchStatusBadge(b.status)}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {b.failedCount > 0 && b.status === "COMPLETED" && (
                        <button
                          onClick={() => resendBatchFailed(b)}
                          disabled={actionLoadingId === b.id}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold"
                          title="Kirim ulang semua yang gagal"
                        >
                          {actionLoadingId === b.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Ulang
                        </button>
                      )}
                      <button
                        onClick={() => openDetail(b)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-semibold"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => deleteBatch(b)}
                        disabled={actionLoadingId === b.id || b.status === "RUNNING"}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold disabled:opacity-40"
                        title="Hapus batch ini"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyPages > 1 && (
        <div className={`p-4 border-t flex items-center justify-between text-xs ${muted} ${
          dark ? "border-slate-800 bg-slate-950/30" : "border-gray-200"
        }`}>
          <span>Halaman {historyPage} dari {historyPages} ({historyTotal} data)</span>
          <div className="flex gap-2">
            <button
              disabled={historyPage <= 1}
              onClick={() => setHistoryPage((v) => v - 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              disabled={historyPage >= historyPages}
              onClick={() => setHistoryPage((v) => v + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    if (!detailBatch) return null;
  const parsedClasses: string[] = (() => {
    try {
      const raw = (detailBatch as any).selectedClassesJson;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();
    const allCounts = {
      sent: detailBatch.sentCount,
      failed: detailBatch.failedCount,
      skipped: detailBatch.skippedCount,
    };
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end md:items-center justify-center">
        <div
          className={`w-full md:max-w-5xl md:rounded-3xl border m-0 md:m-4 shadow-2xl flex flex-col max-h-[90vh] ${
            dark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
          }`}
        >
          <div className={`p-4 border-b flex items-center justify-between ${
            dark ? "border-slate-800" : "border-gray-200"
          }`}>
          <div>
            <h3 className="font-black text-white">Detail Batch</h3>
            <p className={`text-xs ${muted}`}>
              {detailBatch.institutionName || "Semua Lembaga"} · {formatDateIndo(detailBatch.createdAt)}
              {parsedClasses.length > 0 && (
                <span className="ml-2">· Kelas: {parsedClasses.join(", ")}</span>
              )}
            </p>
          </div>
            <button
              onClick={closeDetail}
              className={`p-2 rounded-lg ${dark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div><span className={`text-xs ${muted}`}>Terkirim</span><div className="text-xl font-black text-emerald-400">{allCounts.sent}</div></div>
              <div><span className={`text-xs ${muted}`}>Gagal</span><div className="text-xl font-black text-rose-400">{allCounts.failed}</div></div>
              <div><span className={`text-xs ${muted}`}>Dilewati</span><div className="text-xl font-black text-slate-400">{allCounts.skipped}</div></div>
              <div><span className={`text-xs ${muted}`}>Total</span><div className="text-xl font-black text-white">{detailBatch.totalTargets}</div></div>
            </div>
          </div>

          <div className="p-4 border-b flex items-center gap-3 text-xs">
            <span className={muted}>Filter status:</span>
            <select
              value={detailStatus}
              onChange={(e) => { setDetailStatus(e.target.value); setDetailPage(1); }}
              className={`rounded-xl border px-2 py-1 ${input} w-36`}
            >
              <option value="ALL">Semua</option>
              <option value="SENT">Sukses</option>
              <option value="FAILED">Gagal</option>
              <option value="SKIPPED">Dilewati</option>
              <option value="PENDING">Diproses</option>
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={detailQuery}
                onChange={(e) => { setDetailQuery(e.target.value); }}
                placeholder="Nama, NIS, nomor, pesan..."
                className={`w-full rounded-xl border pl-7 pr-2 py-1.5 text-xs ${input}`}
              />
            </div>
            {allCounts.failed > 0 && (
              <button
                onClick={resendAllFailed}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Kirim Ulang Gagal
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className={`${dark ? "bg-slate-800 text-slate-400" : "bg-gray-50 text-gray-500"} border-b ${
                dark ? "border-slate-800" : "border-gray-200"
              }`}>
                <tr>
                  <th className="px-3 py-2">No</th>
                  <th className="px-3 py-2">Nama / NIS</th>
                  <th className="px-3 py-2">Nomor WA</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Error</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${dark ? "divide-slate-800" : "divide-gray-100"}`}>
                {detailMessages.map((m) => (
                  <tr key={m.id} className={dark ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}>
                    <td className="px-3 py-2">{(detailPage - 1) * 25 + detailMessages.indexOf(m) + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-white">{m.personName || "-"}</div>
                      <div className={`text-[10px] ${muted}`}>{m.nisNip || "-"} · {m.className || "-"}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{m.targetPhone || "-"}</td>
                    <td className="px-3 py-2">{statusBadge(m.status)}</td>
                    <td className="px-3 py-2 max-w-xs truncate text-rose-300" title={m.errorMessage || m.deliveryMessage || ""}>
                      {m.errorMessage || m.deliveryMessage || "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {m.status === "FAILED" ? (
                        <button
                          onClick={() => retryMessage(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                        >
                          <RotateCcw className="w-3 h-3" /> Kirim Ulang
                        </button>
                      ) : (
                        <span className={muted}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detailPages > 1 && (
            <div className={`p-3 border-t flex items-center justify-between text-xs ${muted} ${
              dark ? "border-slate-800" : "border-gray-200"
            }`}>
              <span>{detailPage} dari {detailPages} ({detailTotal})</span>
              <div className="flex gap-1">
                <ChevronLeft className="w-4 h-4" />
                <button
                  disabled={detailPage <= 1}
                  onClick={() => setDetailPage((v) => v - 1)}
                  className="px-2 py-1 rounded bg-slate-800 text-white disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={detailPage >= detailPages}
                  onClick={() => setDetailPage((v) => v + 1)}
                  className="px-2 py-1 rounded bg-slate-800 text-white disabled:opacity-40"
                >
                  Next
                </button>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Broadcast Notifikasi WhatsApp ke Orang Tua
          </h1>
          <p className={`text-sm mt-1 ${muted}`}>
            Kirim pesan massal ke nomor WhatsApp orang tua siswa. Dukung filter lembaga, delay anti-spam,
            riwayat, dan kirim ulang pesan gagal.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("send")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              tab === "send"
                ? "bg-blue-600 text-white"
                : dark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-slate-600"
            }`}
          >
            Formulir Kirim
          </button>
          <button
            onClick={() => { setTab("history"); loadHistory(); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              tab === "history"
                ? "bg-blue-600 text-white"
                : dark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-slate-600"
            }`}
          >
            Riwayat
          </button>
        </div>
      </div>

      {tab === "send" ? renderSendTab() : renderHistoryTab()}
      {renderDetail()}
    </div>
  );
}
