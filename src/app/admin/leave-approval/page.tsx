"use client";
import React, { useEffect, useState } from "react";
import { Eye, Search, CheckCircle2, XCircle } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
function lbl(r:string,c?:string|null){if(r==="SAKIT")return "Sakit";if(r==="IZIN")return "Izin";if(r==="KEPERLUAN_KELUARGA")return "Keperluan Keluarga";if(r==="DINAS")return "Dinas";return c||"Lainnya";}
function tglIndo(ds:string){try{const [y,m,d]=ds.split("-").map(Number);const B=["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];const dt=new Date(y,m-1,d);const H=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];return `${H[dt.getDay()]}, ${d} ${B[m]} ${y}`;}catch{return ds;}}
export default function LeaveApprovalPage(){
const { theme } = useTheme();
const dark = theme === "dark";
const [items,setItems]=useState<any[]>([]);const [loading,setLoading]=useState(true);
const [fStatus,setFStatus]=useState("PENDING");const [fQ,setFQ]=useState("");
const [detail,setDetail]=useState<any>(null);const [note,setNote]=useState("");
const [acting,setActing]=useState(false);const [msg,setMsg]=useState<any>(null);
const load=async()=>{setLoading(true);
try{const r=await fetch(`/api/leave?status=${fStatus}&q=${encodeURIComponent(fQ)}`);
if(r.ok)setItems((await r.json()).items||[]);}finally{setLoading(false);}};
useEffect(()=>{load();},[fStatus]);
const decide=async(d:string)=>{if(!detail)return;setActing(true);
try{const r=await fetch(`/api/leave/${detail.id}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision:d,note})});
const j=await r.json();
if(r.ok){setMsg({ok:true,t:(d==="APPROVED"?"Disetujui & rekap IZIN/SAKIT/DINAS. ":"Ditolak & rekap ALPA. ")+`WA hasil: ${j.waResult?.status||"-"}`+(j.waResult?.success?" ✅":" ⚠️ periksa nomor/gateway")});setDetail(null);setNote("");load();}
else setMsg({ok:false,t:j.error});}finally{setActing(false);}};
return (<div className="space-y-5">
<h1 className={`text-2xl font-black ${dark ? "text-white" : "text-slate-800"}`}>Menunggu Persetujuan Izin</h1>
<p className={`text-sm -mt-3 ${dark ? "text-slate-400" : "text-slate-500"}`}>TU/Operator meninjau izin. Hasil otomatis ke WA wali kelas + ortu.</p>
{msg && (<div className={`p-3 rounded-xl text-sm ${dark ? "bg-slate-800 text-slate-200 border border-slate-700" : "bg-slate-500/10"}`}>{msg.t}</div>)}
<div className="flex flex-wrap gap-2">
{[["PENDING","Menunggu"],["APPROVED","Disetujui"],["REJECTED","Ditolak"],["ALL","Semua"]].map(([v,l])=>(<button key={v} onClick={()=>setFStatus(v)} className={`px-4 py-2 rounded-xl text-xs font-bold border ${fStatus===v?"bg-blue-600 text-white border-blue-500": dark ? "border-slate-700 text-slate-300 bg-slate-900" : ""}`}>{l}</button>))}
<div className="flex gap-2 ml-auto"><input value={fQ} onChange={(e)=>setFQ(e.target.value)} placeholder="Cari nama..." className={`px-3 py-2 rounded-xl border text-sm ${dark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}`} /><button onClick={load} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">Cari</button></div>
</div>
<div className={`rounded-2xl border divide-y ${dark ? "bg-slate-900 border-slate-800 divide-slate-800" : "bg-white divide-slate-100"}`}>
{loading?<p className={`p-6 text-sm ${dark ? "text-slate-400" : ""}`}>Memuat...</p>:items.length===0?<p className={`p-6 text-sm ${dark ? "text-slate-400" : ""}`}>Tidak ada data.</p>:items.map((it:any)=>(
<div key={it.id} className="p-4 flex gap-3 items-center flex-wrap">
<div className="flex-1 min-w-[200px]"><div className={`font-bold text-sm ${dark ? "text-slate-100" : ""}`}>{it.personName} ({it.nisNip})</div>
<div className={`text-xs ${dark ? "text-slate-400" : "opacity-70"}`}>{it.className||"-"} - {lbl(it.reasonType,it.customReason)} - {it.dateString} - {it.status}</div></div>
<button onClick={()=>{setDetail(it);setNote(it.reviewNote||"");}} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">Detail</button>
</div>))}
</div>
{detail && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setDetail(null)}>
<div className={`max-w-2xl w-full rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto border ${dark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`} onClick={(e)=>e.stopPropagation()}>
<div className="flex items-start justify-between gap-3">
<div><h2 className={`font-black text-lg ${dark ? "text-white" : ""}`}>Detail Pengajuan Izin</h2>
<p className={`text-xs ${dark ? "text-slate-400" : "opacity-70"}`}>Periksa lengkap sebelum Setujui / Tolak</p></div>
<span className={`text-[11px] font-black px-3 py-1 rounded-full ${detail.status==="PENDING" ? "bg-amber-500/15 text-amber-400" : detail.status==="APPROVED" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{detail.status==="PENDING" ? "MENUNGGU" : detail.status==="APPROVED" ? "DISETUJUI" : "DITOLAK"}</span>
</div>
<div className={`mt-4 rounded-2xl border overflow-hidden ${dark ? "border-slate-700" : "border-slate-200"}`}>
{[["Nama", detail.personName],["NIS/NIP", detail.nisNip],["Peran", detail.role],["Kelas / Jabatan", detail.className || detail.position || "-"],["Keterangan", lbl(detail.reasonType, detail.customReason)],...(detail.customReason ? [["Keterangan manual", detail.customReason]] : []),["Tanggal", `${detail.dateString} (${tglIndo(detail.dateString)})`],["No. Ortu/Siswa", detail.parentPhone || detail.personPhone || "-"],["No. Wali Kelas", detail.waliKelasPhone || "-"],["Waktu pengajuan", detail.submittedAt ? new Date(detail.submittedAt).toLocaleString("id-ID") : "-"],["Pesan tambahan", detail.message || "-"]].map(([a,b]:any)=>(
<div key={a} className={`grid grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr] gap-2 px-4 py-2 text-sm border-b last:border-0 ${dark ? "border-slate-800" : "border-slate-100"}`}>
<span className={`text-xs font-bold ${dark ? "text-slate-400" : "text-slate-500"}`}>{a}</span>
<span className={`text-sm ${dark ? "text-slate-100" : "text-slate-800"}`}>{b}</span>
</div>))}
</div>
<div className="grid sm:grid-cols-2 gap-3 mt-4">
{detail.proofImageUrl && (<div className={`rounded-2xl border p-3 ${dark ? "border-slate-700" : ""}`}><p className={`text-xs font-black mb-1 ${dark ? "text-slate-200" : ""}`}>Bukti Surat {detail.proofDriveLink && (<a className="text-blue-500 underline ml-1" target="_blank" href={detail.proofDriveLink}>Buka Drive</a>)}</p><a href={detail.proofDriveLink || detail.proofImageUrl} target="_blank"><img src={detail.proofImageUrl} className={`rounded-xl max-h-56 w-full object-cover border ${dark ? "border-slate-700" : ""}`} alt="bukti" /></a>{detail.proofDriveId && (<p className={`text-[10px] mt-1 font-mono ${dark ? "text-slate-500" : "opacity-60"}`}>Drive ID: {detail.proofDriveId}</p>)}</div>)}
{detail.parentPhotoUrl && (<div className={`rounded-2xl border p-3 ${dark ? "border-slate-700" : ""}`}><p className={`text-xs font-black mb-1 ${dark ? "text-slate-200" : ""}`}>Foto Bersama Ortu {detail.parentPhotoDriveLink && (<a className="text-blue-500 underline ml-1" target="_blank" href={detail.parentPhotoDriveLink}>Buka Drive</a>)}</p><a href={detail.parentPhotoDriveLink || detail.parentPhotoUrl} target="_blank"><img src={detail.parentPhotoUrl} className={`rounded-xl max-h-56 w-full object-cover border ${dark ? "border-slate-700" : ""}`} alt="ortu" /></a>{detail.parentPhotoDriveId && (<p className={`text-[10px] mt-1 font-mono ${dark ? "text-slate-500" : "opacity-60"}`}>Drive ID: {detail.parentPhotoDriveId}</p>)}</div>)}
</div>
{detail.signatureDataUrl && (<div className={`mt-3 rounded-2xl border p-3 ${dark ? "border-slate-700" : ""}`}><p className={`text-xs font-black mb-1 ${dark ? "text-slate-200" : ""}`}>Tanda Tangan Digital</p><img src={detail.signatureDataUrl} className="rounded-xl max-h-28 border bg-white" alt="ttd" /></div>)}
<div className={`mt-3 rounded-2xl border p-3 text-xs space-y-1 ${dark ? "border-slate-700 bg-slate-800/50 text-slate-300" : "bg-slate-50"}`}>
<p className="font-black">Status Notifikasi WA</p>
<p>Ke TU/Operator: <b>{detail.waToTuStatus || "-"}</b></p>
<p>Hasil ke walas+ortu: <b>{detail.waResultStatus || "-"}</b></p>
{detail.status!=="PENDING" && (<p>Diproses oleh <b>{detail.reviewedByAdminName || "-"}</b>{detail.reviewedAt ? ` • ${new Date(detail.reviewedAt).toLocaleString("id-ID")}` : ""} • Catatan: {detail.reviewNote || "-"}</p>)}
</div>
{detail.status==="PENDING" ? (<div className="mt-4 space-y-2">
<p className={`text-xs font-black ${dark ? "text-slate-200" : ""}`}>Aksi Persetujuan</p>
<textarea rows={2} value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Catatan persetujuan / penolakan (ikut terkirim di rekap presensi)..." className={`w-full border rounded-xl p-2.5 text-sm ${dark ? "bg-slate-800 border-slate-700 text-slate-100" : ""}`} />
<div className="flex gap-2">
<button disabled={acting} onClick={()=>decide("APPROVED")} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />{acting ? "Memproses..." : "Setujui + WA + Rekap"}</button>
<button disabled={acting} onClick={()=>decide("REJECTED")} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"><XCircle className="w-4 h-4" />{acting ? "Memproses..." : "Tolak (Alpa) + WA"}</button>
</div>
<p className={`text-[11px] ${dark ? "text-slate-500" : "opacity-60"}`}>Disetujui → tercatat SAKIT/IZIN/DINAS di Rekap & Laporan. Ditolak → tercatat ALPA. Hasil WA otomatis ke wali kelas + ortu.</p>
</div>) : (<div className={`mt-4 p-3 rounded-xl text-sm ${dark ? "bg-slate-800 text-slate-200" : "bg-slate-50"}`}>Sudah diproses — {detail.status==="APPROVED" ? "telah masuk rekap sebagai IZIN/SAKIT/DINAS." : "telah masuk rekap sebagai ALPA."}</div>)}
<button onClick={()=>setDetail(null)} className={`text-xs underline mt-4 ${dark ? "text-slate-400" : ""}`}>Tutup</button>
</div></div>)}
</div>);}
