"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2, AlertCircle, User, CalendarDays, Camera, MessageSquare } from "lucide-react";
import SignaturePad from "@/components/izin/SignaturePad";
const REASONS = [
  { id: "SAKIT", label: "Sakit" },
  { id: "IZIN", label: "Izin" },
  { id: "KEPERLUAN_KELUARGA", label: "Keperluan Keluarga" },
  { id: "DINAS", label: "Dinas" },
  { id: "LAINNYA", label: "Lainnya" },
];
function todayStr(){const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;}
function fileToDataUrl(file:File):Promise<string>{return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=rej;r.readAsDataURL(file);});}
export default function IzinPage(){
const [setting,setSetting]=useState<any>(null);
const [q,setQ]=useState("");const [results,setResults]=useState<any[]>([]);
const [selected,setSelected]=useState<any>(null);const [searching,setSearching]=useState(false);
const [reason,setReason]=useState("SAKIT");const [customReason,setCustomReason]=useState("");
const [dateString,setDateString]=useState(todayStr());
const [proofPrev,setProofPrev]=useState<string|null>(null);const [proofData,setProofData]=useState<string|null>(null);
const [parentPrev,setParentPrev]=useState<string|null>(null);const [parentData,setParentData]=useState<string|null>(null);
const [signature,setSignature]=useState<string|null>(null);const [message,setMessage]=useState("");
const [sending,setSending]=useState(false);const [result,setResult]=useState<{ok:boolean;text:string}|null>(null);
useEffect(()=>{fetch("/api/leave/settings",{cache:"no-store"}).then(async(r)=>{if(r.ok)setSetting((await r.json()).setting);});},[]);
useEffect(()=>{if(q.trim().length<3){setResults([]);return;}const t=setTimeout(async()=>{setSearching(true);try{const r=await fetch(`/api/leave/search?q=${encodeURIComponent(q)}`);if(r.ok)setResults((await r.json()).people||[]);}finally{setSearching(false);}},350);return()=>clearTimeout(t);},[q]);
const pickFile=async(f:File|undefined,kind:"bukti"|"ortu")=>{if(!f)return;const url=await fileToDataUrl(f);if(kind==="bukti"){setProofPrev(url);setProofData(url);}else{setParentPrev(url);setParentData(url);}};
const submit=async(e:React.FormEvent)=>{e.preventDefault();setResult(null);
if(!selected){setResult({ok:false,text:"Pilih nama dari daftar hasil pencarian."});return;}
if(reason==="LAINNYA"&&!customReason.trim()){setResult({ok:false,text:"Tulis keterangan manual untuk pilihan Lainnya."});return;}
if(setting?.requireProof&&!proofData){setResult({ok:false,text:"Foto/bukti surat izin wajib diunggah."});return;}
if(setting?.requireParentPhoto&&!parentData){setResult({ok:false,text:"Foto bersama orang tua wajib diunggah."});return;}
if(setting?.requireSignature&&!signature){setResult({ok:false,text:"Tanda tangan digital wajib diisi."});return;}
setSending(true);
try{const res=await fetch("/api/leave",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({personId:selected.id,reasonType:reason,customReason,dateString,proofImage:proofData,parentPhoto:parentData,signature,message})});
const j=await res.json();
if(res.ok){setResult({ok:true,text:j.message});setQ("");setSelected(null);setResults([]);setProofPrev(null);setProofData(null);setParentPrev(null);setParentData(null);setSignature(null);setMessage("");setCustomReason("");}
else setResult({ok:false,text:j.error||"Gagal mengirim."});}
catch{setResult({ok:false,text:"Gagal terhubung ke server."});}finally{setSending(false);}};
return (
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-4 sm:p-8">
<div className="max-w-2xl mx-auto">
<Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
<div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl">
<h1 className="text-xl font-black">{setting?.title || "Pengajuan Izin"}</h1>
<p className="text-sm text-slate-400 mt-1">{setting?.subtitle || "Isi formulir."}</p>
{result && (<div className="mt-4 p-3 rounded-xl border text-sm flex gap-2">{result.text}</div>)}
<form onSubmit={submit} className="mt-5 space-y-4">
<div><label className="text-xs font-bold">1. Nama *</label>
<div className="relative"><User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
<input value={selected ? selected.name : q} onChange={(e)=>{setSelected(null);setQ(e.target.value);}} placeholder="Ketik nama/NIS..." className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm" /></div>
{!selected && results.length>0 && (<div className="mt-2 border border-slate-700 rounded-xl divide-y divide-slate-800 max-h-52 overflow-y-auto">{results.map((p:any)=>(<button type="button" key={p.id} onClick={()=>{setSelected(p);setResults([]);}} className="w-full text-left px-4 py-2 text-sm bg-slate-800/60 hover:bg-slate-700"><b>{p.name}</b><div className="text-[11px] text-slate-400">{p.nisNip} - {p.className||p.position||p.role}</div></button>))}</div>)}
{selected && (<div className="text-xs mt-2 text-emerald-300">Terpilih: {selected.name} <button type="button" onClick={()=>{setSelected(null);setQ("");}} className="underline ml-2">ganti</button></div>)}
</div>
<div><label className="text-xs font-bold">2. Kelas (otomatis)</label>
<input value={selected?(selected.className||selected.position||""):""} readOnly placeholder="Otomatis" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm" /></div>
<div><label className="text-xs font-bold">3. Keterangan Izin *</label>
<div className="grid grid-cols-2 gap-2">{REASONS.map((o)=>(<button type="button" key={o.id} onClick={()=>setReason(o.id)} className={`px-3 py-2 rounded-xl border text-xs font-bold ${reason===o.id?"bg-blue-600 border-blue-400":"bg-slate-800 border-slate-700"}`}>{o.label}</button>))}</div>
{reason==="LAINNYA" && (<input value={customReason} onChange={(e)=>setCustomReason(e.target.value)} placeholder="Tulis manual..." className="mt-2 w-full bg-slate-800 border rounded-xl px-4 py-2 text-sm" />)}</div>
<div><label className="text-xs font-bold">4. Tanggal *</label>
<div className="relative"><CalendarDays className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
<input type="date" value={dateString} onChange={(e)=>setDateString(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm" /></div></div>
<div><label className="text-xs font-bold">5. Bukti Surat Izin *</label>
<label className="flex gap-3 p-4 rounded-xl border-2 border-dashed border-slate-700 cursor-pointer text-xs"><Camera className="w-5 h-5 text-blue-400" /> Pilih foto<input type="file" accept="image/*" className="hidden" onChange={(e)=>pickFile(e.target.files?.[0],"bukti")} /></label>
{proofPrev && (<img src={proofPrev} className="mt-2 rounded-xl max-h-44" alt="bukti" />)}</div>
<div><label className="text-xs font-bold">6. Foto Bersama Ortu *</label>
<label className="flex gap-3 p-4 rounded-xl border-2 border-dashed border-slate-700 cursor-pointer text-xs"><Camera className="w-5 h-5 text-emerald-400" /> Pilih foto<input type="file" accept="image/*" className="hidden" onChange={(e)=>pickFile(e.target.files?.[0],"ortu")} /></label>
{parentPrev && (<img src={parentPrev} className="mt-2 rounded-xl max-h-44" alt="ortu" />)}</div>
<div><label className="text-xs font-bold">7. Tanda Tangan *</label><SignaturePad onChange={setSignature} /></div>
<div><label className="text-xs font-bold">8. Pesan (opsional)</label>
<div className="relative"><MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
<textarea rows={3} value={message} onChange={(e)=>setMessage(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm" /></div></div>
<button type="submit" disabled={sending} className="w-full py-3 rounded-xl bg-blue-600 font-bold text-sm flex items-center justify-center gap-2"><Send className="w-4 h-4" />{sending?"Mengirim...":"Kirim Pengajuan"}</button>
</form>
</div>
</div>
</div>
);
}
