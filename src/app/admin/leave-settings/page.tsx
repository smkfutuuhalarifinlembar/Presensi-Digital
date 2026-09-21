"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
export default function LeaveSettingsPage(){
const { theme } = useTheme();
const dark = theme === "dark";
const card = dark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800";
const input = dark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-800";
const lbl = dark ? "text-slate-300" : "text-slate-600";
const [s,setS]=useState<any>(null);const [loading,setLoading]=useState(true);
const [saving,setSaving]=useState(false);const [msg,setMsg]=useState("");
const [waliRows,setWaliRows]=useState<[string,string][]>([]);
useEffect(()=>{(async()=>{const r=await fetch("/api/leave/admin-settings");if(r.ok){const j=await r.json();setS(j.setting);
try{const m=JSON.parse(j.setting.waliKelasMapJson||"{}");setWaliRows(Object.entries(m) as any);}catch{}}setLoading(false);})();},[]);
const set=(k:string,v:any)=>setS((p:any)=>({...p,[k]:v}));
const save=async()=>{setSaving(true);setMsg("");
const payload={...s,waliKelasMapJson:JSON.stringify(Object.fromEntries(waliRows.filter(([a])=>a.trim())))};
const r=await fetch("/api/leave/admin-settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
const j=await r.json();setSaving(false);setMsg(r.ok?"Tersimpan.":"Gagal: "+j.error);if(r.ok)setS(j.setting);};
if(loading)return <p className="text-sm">Memuat...</p>;
if(!s)return <p>Gagal memuat.</p>;
return (<div className="space-y-5 max-w-3xl">
<h1 className={`text-2xl font-black ${dark ? "text-white" : "text-slate-800"}`}>Pengaturan Form Izin</h1>
{msg && (<div className={`p-3 rounded-xl text-sm ${dark ? "bg-slate-800 text-slate-200" : "bg-slate-500/10"}`}>{msg}</div>)}
<div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
<label className="flex gap-2 items-center text-sm font-bold"><input type="checkbox" checked={!!s.isEnabled} onChange={(e)=>set("isEnabled",e.target.checked)} /> Aktifkan form izin publik</label>
<div className={`rounded-2xl border p-4 space-y-1 ${dark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
<p className="text-sm font-black">Mode Persetujuan Izin</p>
<label className="flex gap-2 items-start text-sm cursor-pointer">
<input type="checkbox" className="mt-1" checked={!!s.autoApprove} onChange={(e)=>set("autoApprove",e.target.checked)} />
<span><b>{s.autoApprove ? "Otomatis: langsung disetujui" : "Manual: menunggu TU/Operator"}</b><br />
<span className="text-[11px] opacity-60">{s.autoApprove ? "Pengajuan langsung APPROVED, presensi tercatat & WA hasil terkirim (lewati antrean)." : "Pengajuan masuk Menunggu dan harus disetujui/ditolak manual oleh TU/Operator."}</span></span>
</label>
</div>
<div><label className={`text-xs font-bold ${lbl}`}>Judul Form</label><input value={s.title||""} onChange={(e)=>set("title",e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm ${input}`} /></div>
<div><label className={`text-xs font-bold ${lbl}`}>Subjudul</label><input value={s.subtitle||""} onChange={(e)=>set("subtitle",e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm ${input}`} /></div>
<div className="grid sm:grid-cols-3 gap-2 text-sm">
<label className="flex gap-2 items-center"><input type="checkbox" checked={!!s.requireProof} onChange={(e)=>set("requireProof",e.target.checked)} /> Wajib bukti</label>
<label className="flex gap-2 items-center"><input type="checkbox" checked={!!s.requireParentPhoto} onChange={(e)=>set("requireParentPhoto",e.target.checked)} /> Wajib foto ortu</label>
<label className="flex gap-2 items-center"><input type="checkbox" checked={!!s.requireSignature} onChange={(e)=>set("requireSignature",e.target.checked)} /> Wajib TTD</label>
<label className="flex gap-2 items-center"><input type="checkbox" checked={!!s.notifyParent} onChange={(e)=>set("notifyParent",e.target.checked)} /> WA ke ortu</label>
<label className="flex gap-2 items-center"><input type="checkbox" checked={!!s.notifyWaliKelas} onChange={(e)=>set("notifyWaliKelas",e.target.checked)} /> WA ke walas</label>
<label className="flex gap-2 items-center"><input type="checkbox" checked={!!s.autoCreateAttendance} onChange={(e)=>set("autoCreateAttendance",e.target.checked)} /> Auto presensi</label>
</div>
<div><label className={`text-xs font-bold ${lbl}`}>Nomor WA TU/Operator (pisahkan koma/baris)</label><textarea rows={2} value={s.tuWaNumbers||""} onChange={(e)=>set("tuWaNumbers",e.target.value)} placeholder="08xxxx, 08yyyy" className={`w-full border rounded-xl px-3 py-2 text-sm ${input}`} /></div>
<div><label className={`text-xs font-bold ${lbl}`}>WA Wali Kelas Default</label><input value={s.waliKelasDefaultWa||""} onChange={(e)=>set("waliKelasDefaultWa",e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm ${input}`} /></div>
<div><label className={`text-xs font-bold ${lbl}`}>Mapping WA per Kelas</label>
{waliRows.map(([k,v],i)=>(<div key={i} className="flex gap-2 mt-1"><input value={k} placeholder="X-1" onChange={(e)=>{const n=[...waliRows];n[i]=[e.target.value,v];setWaliRows(n as any);}} className={`flex-1 border rounded-xl px-3 py-2 text-sm ${input}`} /><input value={v} placeholder="08xxx" onChange={(e)=>{const n=[...waliRows];n[i]=[k,e.target.value];setWaliRows(n as any);}} className={`flex-1 border rounded-xl px-3 py-2 text-sm ${input}`} /><button onClick={()=>setWaliRows(waliRows.filter((_,j)=>j!==i))} className="px-3 rounded-xl bg-rose-100 text-rose-600 text-xs font-bold">x</button></div>))}
<button onClick={()=>setWaliRows([...waliRows,["",""]])} className={`mt-2 px-4 py-2 rounded-xl text-xs font-bold ${dark ? "bg-slate-800 text-slate-200" : "bg-slate-100"}`}>+ Tambah Kelas</button></div>
<div><label className={`text-xs font-bold ${lbl}`}>5. Template WA Pengajuan ke TU</label><textarea rows={6} value={s.templatePengajuan||""} onChange={(e)=>set("templatePengajuan",e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm font-mono ${input}`} /><p className="text-[11px] opacity-60">Variabel: {"{nama}"} {"{nis}"} {"{kelas}"} {"{keterangan}"} {"{tanggal}"} {"{pesan}"} {"{link_surat}"} {"{link_foto}"}</p></div>
<div><label className={`text-xs font-bold ${lbl}`}>1. Template Disetujui (Siswa/Orang Tua)</label><textarea rows={8} value={s.templateSetujuOrtu||s.templateDisetujui||""} onChange={(e)=>set("templateSetujuOrtu",e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm font-mono ${input}`} /></div>
<div><label className={`text-xs font-bold ${lbl}`}>2. Template Disetujui (Wali Kelas/Guru)</label><textarea rows={8} value={s.templateSetujuWali||""} onChange={(e)=>set("templateSetujuWali",e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm font-mono ${input}`} /></div>
<div><label className={`text-xs font-bold ${lbl}`}>3. Template Ditolak (Siswa/Orang Tua)</label><textarea rows={7} value={s.templateTolakOrtu||s.templateDitolak||""} onChange={(e)=>set("templateTolakOrtu",e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm font-mono ${input}`} /></div>
<div><label className={`text-xs font-bold ${lbl}`}>4. Template Ditolak (Wali Kelas/Guru)</label><textarea rows={7} value={s.templateTolakWali||""} onChange={(e)=>set("templateTolakWali",e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm font-mono ${input}`} /><p className="text-[11px] opacity-60">Variabel hasil: {"{nama_siswa}"} {"{kelas}"} {"{keterangan}"} {"{tanggal}"} {"{pesan}"} {"{link_surat}"} {"{link_foto}"} {"{nama_sekolah}"}</p></div>
<div className={`rounded-xl border p-3 space-y-2 ${dark ? "bg-slate-800/60 border-slate-700" : "bg-slate-50"}`}>
<p className="text-xs font-black">Google Drive (ID Drive / Folder ID)</p>
<p className="text-[11px] opacity-70">Semua foto & bukti otomatis tersimpan ke folder ID: <b className="font-mono">1kk1p30xrosFap-3emPsc2vAemIW3ISG5</b> (<a className="text-blue-500 underline" target="_blank" href="https://drive.google.com/drive/folders/1kk1p30xrosFap-3emPsc2vAemIW3ISG5">buka folder</a>). Salinan lokal tetap ada di /uploads/izin + link Drive per file di menu approval & template WA.</p>
<label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={!!s.driveEnabled} onChange={(e)=>set("driveEnabled",e.target.checked)} /> Simpan info Drive</label>
<div><label className={`text-xs font-bold ${lbl}`}>Drive Folder ID</label><input value={s.driveFolderId||"1kk1p30xrosFap-3emPsc2vAemIW3ISG5"} onChange={(e)=>set("driveFolderId",e.target.value)} placeholder="1kk1p30xrosFap-3emPsc2vAemIW3ISG5" className={`w-full border rounded-xl px-3 py-2 text-sm font-mono ${input}`} /></div>
<p className="text-[11px] opacity-60">Aktifkan upload Drive asli via env: GOOGLE_DRIVE_ENABLED=true, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_JSON. Link file Drive tersimpan per pengajuan + salinan lokal di /uploads/izin.</p>
</div>
</div>
<button onClick={save} disabled={saving} className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold flex gap-2 items-center"><Save className="w-4 h-4" />{saving?"Menyimpan...":"Simpan Pengaturan"}</button>
</div>);}
