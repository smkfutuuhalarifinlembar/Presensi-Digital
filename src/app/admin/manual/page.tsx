"use client";

import React, { useState, useEffect } from "react";
import {
  Edit3,
  Search,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Send,
  Users,
} from "lucide-react";
import { getTodayDateString, formatDateIndo } from "@/lib/date-utils";

export default function ManualAttendancePage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  // Bulk Attendance State
  const [bulkSelectedActivityId, setBulkSelectedActivityId] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("HADIR");
  const [bulkRemarks, setBulkRemarks] = useState<string>("");
  const [bulkDateString, setBulkDateString] = useState<string>(getTodayDateString());
  const [bulkSendWa, setBulkSendWa] = useState<boolean>(true);
  const [bulkInstitutionId, setBulkInstitutionId] = useState<string>("");
  const [bulkClassName, setBulkClassName] = useState<string>("");
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [bulkPeople, setBulkPeople] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [bulkMessage, setBulkMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [status, setStatus] = useState<string>("HADIR");
  const [remarks, setRemarks] = useState<string>("");
  const [dateString, setDateString] = useState<string>(getTodayDateString());
  const [sendWa, setSendWa] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch institutions for bulk attendance
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

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch("/api/activities");
        if (res.ok) {
          const json = await res.json();
          setActivities(json.activities || []);
          if (json.activities && json.activities.length > 0) {
            // Pilih yang sedang aktif atau kegiatan pertama
            const active = json.activities.find((a: any) => a.state === "ACTIVE");
            setSelectedActivityId(active ? active.id : json.activities[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat kegiatan:", err);
      }
    };
    fetchActivities();
  }, []);

  // Search people autocomplete (live: muncul otomatis saat >= 3 huruf, debounce 300ms)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/manual-attendance?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.people || []);
        }
      } catch (err) {
        console.error("Gagal mencari orang:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSelectedActivityId) {
      setBulkMessage({ type: "error", text: "Pilih kegiatan presensi." });
      return;
    }

    setBulkLoading(true);
    setBulkMessage(null);

    try {
      // Fetch people based on filters
      const params = new URLSearchParams();
      if (bulkInstitutionId) params.append("institutionId", bulkInstitutionId);
      if (bulkClassName) params.append("className", bulkClassName);

      const res = await fetch(`/api/people?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setBulkPeople(json.people || []);
      } else {
        setBulkMessage({ type: "error", text: "Gagal memuat data orang." });
        return;
      }
    } catch (err) {
      setBulkMessage({ type: "error", text: "Terjadi kesalahan saat memuat data orang." });
      return;
    }

    if (bulkPeople.length === 0) {
      setBulkMessage({ type: "error", text: "Tidak ada orang yang memenuhi filter." });
      return;
    }

    // Confirm with user
    const confirm = window.confirm(`
      Anda akan mencatat presensi ${bulkPeople.length} orang:
      ${bulkPeople.map((p: any) => p.name).join(", ")}
      
      Status: ${bulkStatus}
      Tanggal: ${bulkDateString}
      Keterangan: "${bulkRemarks || "-"}"
      
      Apakah Anda yakin?`);
    
    if (!confirm) return;

    // Submit bulk attendance
    try {
      const res = await fetch("/api/bulk-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personIds: bulkPeople.map((p: any) => p.id),
          activityId: bulkSelectedActivityId,
          status: bulkStatus,
          remarks: bulkRemarks.trim() || undefined,
          dateString: bulkDateString,
          sendWa: bulkSendWa,
          institutionId: bulkInstitutionId,
          className: bulkClassName,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setBulkMessage({
          type: "success",
          text: json.message || `Presensi masal ${bulkPeople.length} orang berhasil disimpan (${bulkStatus}).`,
        });
        // Reset bulk form
        setBulkPeople([]);
        setBulkInstitutionId("");
        setBulkClassName("");
      } else {
        setBulkMessage({
          type: "error",
          text: json.error || "Gagal menyimpan presensi masal.",
        });
      }
    } catch (err: any) {
      setBulkMessage({
        type: "error",
        text: "Terjadi kesalahan koneksi saat menyimpan.",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) {
      setMessage({ type: "error", text: "Silakan pilih orang yang akan diabsenkan." });
      return;
    }

    if (!selectedActivityId) {
      setMessage({ type: "error", text: "Pilih kegiatan presensi." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/manual-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: selectedPerson.id,
          activityId: selectedActivityId,
          status,
          remarks: remarks.trim() || undefined,
          dateString,
          sendWa,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: "success",
          text: json.message || "Presensi manual berhasil dicatat.",
        });
        // Reset pilihan
        setSelectedPerson(null);
        setSearchQuery("");
        setRemarks("");
      } else {
        setMessage({
          type: "error",
          text: json.error || "Gagal menyimpan presensi manual.",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: "Terjadi kesalahan koneksi saat menyimpan.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Input Presensi Manual
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Khusus admin untuk mencatatkan kehadiran siswa/guru yang tidak membawa kartu RFID atau berhalangan hadir (Sakit/Izin/Dinas Luar).
        </p>
      </div>

       {/* Alert Notifikasi Pesan */}
       {message && (
         <div
           className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 animate-in fade-in duration-200 ${message.type === "success"
               ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-200"
               : "bg-rose-950/80 border-rose-500/60 text-rose-200"
             }`}
         >
           {message.type === "success" ? (
             <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
           ) : (
             <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
           )}
           <span>{message.text}</span>
         </div>
       )}

       {/* Alert Notifikasi Pesan Bulk */}
       {bulkMessage && (
         <div
           className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 animate-in fade-in duration-200 ${bulkMessage.type === "success"
               ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-200"
               : "bg-rose-950/80 border-rose-500/60 text-rose-200"
             }`}
         >
           {bulkMessage.type === "success" ? (
             <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
           ) : (
             <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
           )}
           <span>{bulkMessage.text}</span>
         </div>
       )}

       {/* Bulk People Preview */}
       {bulkPeople.length > 0 && (
         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg mt-4">
           <div className="flex items-center justify-between mb-3">
             <h3 className="text-sm font-bold text-white flex items-center gap-2">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               Orang yang akan diabsenkan
             </h3>
             <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
               {bulkPeople.length} Orang
             </span>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
             {bulkPeople.slice(0, 10).map((person) => (
               <div
                 key={person.id}
                 className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-800"
               >
                 <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
                   <span className="font-bold text-[9px] text-blue-300">
                     {person.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                   </span>
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="text-[10px] font-bold text-white truncate">{person.name}</div>
                   <div className="text-[9px] text-slate-400 font-mono truncate">
                     {person.nisNip} • {person.className || person.position || person.role}
                   </div>
                 </div>
               </div>
             ))}
             {bulkPeople.length > 10 && (
               <div className="col-span-full text-center text-[10px] text-slate-500 py-2">
                 +{bulkPeople.length - 10} lainnya
               </div>
             )}
           </div>
         </div>
       )}

      {/* Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Langkah 1: Cari Orang */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              1. Cari Orang (Siswa / Guru / Pegawai) *
            </label>

            {selectedPerson ? (
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-blue-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-base">
                    {selectedPerson.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">
                      {selectedPerson.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      ID: {selectedPerson.nisNip} •{" "}
                      <span className="text-blue-300">
                        {selectedPerson.className || selectedPerson.position || selectedPerson.role}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPerson(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200"
                >
                  Ganti Orang
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Ketik minimal 2 huruf nama atau ID..."
                   className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />

                {/* Dropdown Hasil Pencarian */}
                {searchResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPerson(p);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        className="p-3.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <div className="font-bold text-sm text-white">{p.name}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {p.nisNip} • {p.className || p.position || p.role}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {p.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Langkah 2: Pilih Kegiatan & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                2. Sesi / Kegiatan Presensi *
              </label>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.startTime} - {a.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Tanggal Presensi
              </label>
              <input
                type="date"
                value={dateString}
                onChange={(e) => setDateString(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Langkah 3: Status Kehadiran */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              3. Status Kehadiran *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: "HADIR", label: "Hadir", desc: "Tepat Waktu", color: "hover:border-emerald-500" },
                { id: "TERLAMBAT", label: "Terlambat", desc: "Terlambat Masuk", color: "hover:border-amber-500" },
                { id: "IZIN", label: "Izin", desc: "Ada Keperluan", color: "hover:border-blue-500" },
                { id: "SAKIT", label: "Sakit", desc: "Surat Dokter", color: "hover:border-purple-500" },
                { id: "ALPA", label: "Alpa", desc: "Tanpa Keterangan", color: "hover:border-rose-500" },
                { id: "BOLOS", label: "Bolos", desc: "Meninggalkan Sesi", color: "hover:border-rose-600" },
                { id: "DINAS_LUAR", label: "Dinas Luar", desc: "Tugas Luar", color: "hover:border-indigo-500" },
              ].map((st) => {
                const isSelected = status === st.id;
                return (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setStatus(st.id)}
                    className={`p-3 rounded-2xl border text-left transition ${isSelected
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30"
                        : `bg-slate-800/80 border-slate-700 text-slate-300 ${st.color}`
                      }`}
                  >
                    <div className="font-bold text-sm">{st.label}</div>
                    <div className="text-[11px] opacity-75">{st.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Langkah 4: Keterangan Tambahan */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              4. Keterangan / Alasan Tambahan
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Contoh: Kartu RFID tertinggal di rumah / Izin ada acara keluarga"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Opsi Kirim WhatsApp Otomatis */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  Kirim Notifikasi WhatsApp Otomatis
                </div>
                <div className="text-xs text-slate-400">
                  Mengirimkan pesan WA ke orang tua / nomor terkait sesuai template status
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sendWa}
                onChange={(e) => setSendWa(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

           {/* Tombol Simpan */}
           <div className="pt-4 border-t border-slate-800 flex justify-end">
             <button
               type="submit"
               disabled={isLoading || !selectedPerson}
               className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center gap-2.5 transition transform active:scale-95 disabled:opacity-40"
             >
               <Send className="w-4 h-4" />
               <span>{isLoading ? "Menyimpan & Mengirim WA..." : "Simpan Presensi Manual"}</span>
             </button>
           </div>
         </form>
       </div>

       {/* ===================================================
           BULK ATTENDANCE SECTION
           =================================================== */}
       <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl mt-8">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
           <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
             Input Presensi Masal
           </h2>
           <p className="text-sm text-slate-400 sm:mt-1">
             Cepat catat presensi untuk beberapa orang sekaligus, misalnya ketika kelas pulang lebih awal atau ada kegiatan khusus.
           </p>
         </div>

         {/* Bulk Attendance Form */}
         <form className="space-y-6">
           {/* Langkah 1: Pilih Kegiatan & Tanggal */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                 1. Sesi / Kegiatan Presensi *
               </label>
               <select
                 value={bulkSelectedActivityId}
                 onChange={(e) => setBulkSelectedActivityId(e.target.value)}
                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                 required
               >
                 {activities.map((a) => (
                   <option key={a.id} value={a.id}>
                     {a.name} ({a.startTime} - {a.endTime})
                   </option>
                 ))}
               </select>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                 Tanggal Presensi
               </label>
               <input
                 type="date"
                 value={bulkDateString}
                 onChange={(e) => setBulkDateString(e.target.value)}
                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                 required
               />
             </div>
           </div>

           {/* Langkah 2: Filter Lembaga / Kelas */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                 Lembaga (opsional)
               </label>
               <select
                 value={bulkInstitutionId}
                 onChange={(e) => setBulkInstitutionId(e.target.value)}
                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
               >
                 <option value="">Semua Lembaga</option>
                 {institutions.map((inst) => (
                   <option key={inst.id} value={inst.id}>
                     {inst.name} ({inst.level})
                   </option>
                 ))}
               </select>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                 Kelas (opsional)
               </label>
               <input
                 type="text"
                 value={bulkClassName}
                 onChange={(e) => setBulkClassName(e.target.value)}
                 placeholder="Contoh: X-RPL-1, XI-TKJ-2"
                 className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
               />
             </div>
           </div>

           {/* Langkah 3: Status Kehadiran */}
           <div>
             <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
               3. Status Kehadiran *
             </label>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
               {[
                 { id: "HADIR", label: "Hadir", desc: "Tepat Waktu", color: "hover:border-emerald-500" },
                 { id: "TERLAMBAT", label: "Terlambat", desc: "Terlambat Masuk", color: "hover:border-amber-500" },
                 { id: "IZIN", label: "Izin", desc: "Ada Keperluan", color: "hover:border-blue-500" },
                 { id: "SAKIT", label: "Sakit", desc: "Surat Dokter", color: "hover:border-purple-500" },
                 { id: "ALPA", label: "Alpa", desc: "Tanpa Keterangan", color: "hover:border-rose-500" },
                 { id: "BOLOS", label: "Bolos", desc: "Meninggalkan Sesi", color: "hover:border-rose-600" },
                 { id: "DINAS_LUAR", label: "Dinas Luar", desc: "Tugas Luar", color: "hover:border-indigo-500" },
               ].map((st) => {
                 const isSelected = bulkStatus === st.id;
                 return (
                   <button
                     type="button"
                     key={st.id}
                     onClick={() => setBulkStatus(st.id)}
                     className={`p-3 rounded-2xl border text-left transition ${isSelected
                       ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30"
                       : `bg-slate-800/80 border-slate-700 text-slate-300 ${st.color}`
                     }`}
                   >
                     <div className="font-bold text-sm">{st.label}</div>
                     <div className="text-[11px] opacity-75">{st.desc}</div>
                   </button>
                 );
               })}
             </div>
           </div>

           {/* Langkah 4: Keterangan Tambahan */}
           <div>
             <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
               4. Keterangan / Alasan Tambahan
             </label>
             <textarea
               rows={2}
               value={bulkRemarks}
               onChange={(e) => setBulkRemarks(e.target.value)}
               placeholder="Contoh: Kartu RFID tertinggal di rumah / Izin ada acara keluarga"
               className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
             />
           </div>

           {/* Opsi Kirim WhatsApp Otomatis */}
           <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                 <MessageSquare className="w-5 h-5" />
               </div>
               <div>
                 <div className="text-sm font-bold text-white">
                   Kirim Notifikasi WhatsApp Otomatis
                 </div>
                 <div className="text-xs text-slate-400">
                   Mengirimkan pesan WA ke orang tua / nomor terkait sesuai template status
                 </div>
               </div>
             </div>

             <label className="relative inline-flex items-center cursor-pointer">
               <input
                 type="checkbox"
                 checked={bulkSendWa}
                 onChange={(e) => setBulkSendWa(e.target.checked)}
                 className="sr-only peer"
               />
               <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
             </label>
           </div>

           {/* Tombol Simpan Bulk */}
           <div className="pt-4 border-t border-slate-800 flex justify-end">
             <button
               type="button"
               onClick={handleBulkSubmit}
               disabled={bulkLoading || !bulkSelectedActivityId}
               className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center gap-2.5 transition transform active:scale-95 disabled:opacity-40"
             >
               <Send className="w-4 h-4" />
               <span>{bulkLoading ? "Menyimpan & Mengirim WA..." : "Simpan Presensi Masal"}</span>
             </button>
           </div>
         </form>
       </div>
     </div>
   );
}
