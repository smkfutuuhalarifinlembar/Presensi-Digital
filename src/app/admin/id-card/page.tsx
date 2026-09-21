"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Printer,
  Filter,
  Users,
  Search,
  CheckSquare,
  Square,
  Shield,
  QrCode as QrIcon,
  Download,
  Palette,
  Image as ImageIcon,
  Save,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Trash2,
  AlertCircle,
} from "lucide-react";

export default function IdCardPrintPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Background Style Setting
  const [isBgModalOpen, setIsBgModalOpen] = useState<boolean>(false);
  const [bgForm, setBgForm] = useState<any>({
    cardBackgroundMode: "KIOSK",
    cardSolidColor: "#1e3a8a",
    cardGradientFrom: "#1e40af",
    cardGradientTo: "#3730a3",
    cardBackgroundImageUrl: "",
    cardSiswaColor: "#1e3a8a",
    cardGuruColor: "#065f46",
    cardPegawaiColor: "#7c2d12",
    cardKepsekColor: "#581c87",
    useSameBackBg: false,
    cardBackBackgroundMode: "SOLID",
    cardBackBackgroundImageUrl: "",
    cardBackSolidColor: "#ffffff",
  });
  const [isSavingBg, setIsSavingBg] = useState<boolean>(false);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgBackImageFile, setBgBackImageFile] = useState<File | null>(null);

  // Preview pagination (hanya untuk tampilan layar; cetak tetap semua)
  const [previewPage, setPreviewPage] = useState<number>(0);

  const fetchCards = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        role: roleFilter,
        className: classFilter,
      });

      const res = await fetch(`/api/id-card?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setCards(json.cards || []);
        setSchool(json.school || {});
        // Default: semua kartu dipilih
        setSelectedIds((json.cards || []).map((c: any) => c.id));

        // Ambil daftar kelas unik
        const uniqueClasses = Array.from(
          new Set(
            (json.cards || [])
              .map((c: any) => c.className)
              .filter(Boolean)
          )
        ) as string[];
        setClasses(uniqueClasses);
      }
    } catch (err) {
      console.error("Gagal memuat kartu:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [roleFilter, classFilter]);

  useEffect(() => {
    if (school) {
      setBgForm({
        cardBackgroundMode: school.cardBackgroundMode || "KIOSK",
        cardSolidColor: school.cardSolidColor || "#1e3a8a",
        cardGradientFrom: school.cardGradientFrom || "#1e40af",
        cardGradientTo: school.cardGradientTo || "#3730a3",
        cardBackgroundImageUrl: school.cardBackgroundImageUrl || "",
         cardSiswaColor: school.cardSiswaColor || "#1e3a8a",
         cardGuruColor: school.cardGuruColor || "#065f46",
         cardPegawaiColor: school.cardPegawaiColor || "#7c2d12",
         cardKepsekColor: school.cardKepsekColor || "#581c87",
         useSameBackBg: school.useSameBackBg || false,
         cardBackBackgroundMode: school.cardBackBackgroundMode || "SOLID",
         cardBackBackgroundImageUrl: school.cardBackBackgroundImageUrl || "",
         cardBackSolidColor: school.cardBackSolidColor || "#ffffff",
      });
    }
  }, [school]);

  const toggleSelectAll = () => {
    if (selectedIds.length === cards.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cards.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter kartu yang dicentang
  const printableCards = cards.filter((c) => selectedIds.includes(c.id));

  // Chunk kartu ke dalam halaman A4: 4 pasang kartu per halaman A4 agar pas dengan margin potong
  const CARDS_PER_PAGE = 4;
  const cardPages: any[][] = [];
  for (let i = 0; i < printableCards.length; i += CARDS_PER_PAGE) {
    cardPages.push(printableCards.slice(i, i + CARDS_PER_PAGE));
  }

  // Reset preview page saat data berubah
  useEffect(() => {
    setPreviewPage(0);
  }, [roleFilter, classFilter, selectedIds.length]);

  // Helper: tentukan style background kartu depan sesuai mode & role
  // print-color-adjust: exact memaksa browser mencetak warna background
  // tanpa perlu mengaktifkan opsi "Background graphics" saat print
  const getCardFrontStyle = (card: any): { containerStyle: React.CSSProperties; backgroundLayer?: React.ReactNode; roleColor: string } => {
    const mode = school?.cardBackgroundMode || "KIOSK";
    const roleKey = card.role;
    let perRoleColor = school?.cardSiswaColor || "#1e3a8a";
    if (roleKey === "GURU") perRoleColor = school?.cardGuruColor || "#065f46";
    else if (roleKey === "PEGAWAI") perRoleColor = school?.cardPegawaiColor || "#7c2d12";
    else if (roleKey === "KEPALA_SEKOLAH") perRoleColor = school?.cardKepsekColor || "#581c87";

    const printExact: React.CSSProperties = {
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    } as React.CSSProperties;

    const baseStyle: React.CSSProperties = { ...printExact };
    
    if (mode === "KIOSK") {
      const c = school?.kioskBackgroundColor || "#0f172a";
      if (school?.kioskBackgroundUrl) {
        return {
          containerStyle: { ...baseStyle, backgroundColor: c },
          backgroundLayer: (
            <div className="absolute inset-0 z-0 overflow-hidden">
                <img src={school.kioskBackgroundUrl} className="w-full h-full object-cover scale-110" style={{ filter: "blur(3px)" }} alt="" />
                <div className="absolute inset-0" style={{ backgroundColor: perRoleColor, opacity: 0.5 }} />
            </div>
          ),
          roleColor: perRoleColor,
        };
      }
      return {
        containerStyle: {
          ...baseStyle,
          backgroundImage: `linear-gradient(135deg, ${perRoleColor} 0%, ${c} 100%)`,
        },
        roleColor: perRoleColor,
      };
    }
    if (mode === "SOLID") {
      return { containerStyle: { ...baseStyle, backgroundColor: school?.cardSolidColor || perRoleColor }, roleColor: perRoleColor };
    }
    if (mode === "GRADIENT") {
      return {
        containerStyle: {
          ...baseStyle,
          backgroundImage: `linear-gradient(135deg, ${school?.cardGradientFrom || "#1e40af"} 0%, ${school?.cardGradientTo || "#3730a3"} 100%)`,
        },
        roleColor: perRoleColor,
      };
    }
    if (mode === "IMAGE" && school?.cardBackgroundImageUrl) {
      return {
        containerStyle: { ...baseStyle, backgroundColor: perRoleColor },
        backgroundLayer: (
            <div className="absolute inset-0 z-0 overflow-hidden">
                <img src={school.cardBackgroundImageUrl} className="w-full h-full object-cover scale-110" style={{ filter: "blur(3px)" }} alt="" />
                <div className="absolute inset-0" style={{ backgroundColor: perRoleColor, opacity: 0.5 }} />
            </div>
          ),
        roleColor: perRoleColor,
      };
    }
    // fallback per-role color
    return { containerStyle: { ...baseStyle, backgroundColor: perRoleColor }, roleColor: perRoleColor };
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman (Disembunyikan saat cetak) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Cetak ID Card Standar KTP Indonesia
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ukuran KTP (3,37" x 2,12"), layout cetak A4 berpasangan sisi Depan-Belakang sejajar dengan garis potong
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsBgModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
          >
            <Palette className="w-4 h-4 text-purple-400" />
            <span>Background Kartu</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={printableCards.length === 0}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 flex items-center gap-2.5 transition transform active:scale-95 disabled:opacity-40"
          >
            <Printer className="w-5 h-5" />
            <span>Cetak / Simpan ke PDF ({printableCards.length} Kartu)</span>
          </button>
        </div>
      </div>

      {/* Filter & Selection Bar (Disembunyikan saat cetak) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filter Kategori */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Kategori:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="SISWA">Siswa</option>
              <option value="GURU">Guru</option>
              <option value="PEGAWAI">Pegawai & Staf</option>
            </select>
          </div>

          {/* Filter Kelas */}
          {classes.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Kelas:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Check All Button */}
          <button
            onClick={toggleSelectAll}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            {selectedIds.length === cards.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Pilih Semua ({cards.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Terpilih: <strong className="text-white">{selectedIds.length}</strong> dari {cards.length} orang
        </div>
      </div>

      {/* ===================================================
          PANEL PEMILIHAN KARTU INDIVIDUAL (CHECKBOX PER ORANG)
          Klik kartu untuk memilih/membatalkan pilihan 1, 2, 3, dst.
          =================================================== */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-400" />
            <span>Pilih Kartu yang Akan Dicetak</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              {selectedIds.length} dipilih
            </span>
          </h3>

          <button
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 hover:border-rose-500/40 disabled:opacity-40 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Kosongkan Pilihan
          </button>
        </div>

        {/* Grid Checkbox Per Orang — klik untuk pilih/batal */}
        <div className="p-4 max-h-72 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {cards.map((card) => {
              const isSelected = selectedIds.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggleSelectOne(card.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition ${isSelected
                    ? "bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-900/20"
                    : "bg-slate-800/50 border-slate-700/60 hover:border-slate-500"
                    }`}
                >
                  {/* Checkbox visual */}
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${isSelected
                      ? "bg-emerald-500 border-emerald-400"
                      : "border-slate-500 bg-transparent"
                      }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Avatar kecil */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-black text-slate-300 shrink-0">
                    {card.photoUrl ? (
                      <img src={card.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      card.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                    )}
                  </div>

                  {/* Nama & ID */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {card.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {card.nisNip} • {card.role}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedIds.length === 0 && (
          <div className="px-5 py-3 bg-rose-950/40 border-t border-rose-500/30 text-[11px] text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Belum ada kartu yang dipilih. Klik kartu di atas untuk memilih satu per satu, atau tekan "Pilih Semua".
          </div>
        )}
      </div>

      {/* Info Petunjuk Cetak (Disembunyikan saat cetak) */}
      <div className="no-print p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">
            📄 Petunjuk Cetak Kertas A4:
          </p>
          <p>
            Sisi kiri berisi <strong>Desain Depan</strong>, sisi kanan berisi <strong>Desain Belakang</strong> kartu yang sejajar. Setelah dipotong mengikuti garis crop mark, lipat ke belakang atau rekatkan kedua sisi untuk laminasi bolak-balik.
          </p>
        </div>
        <div className="text-emerald-400 font-mono text-[11px] bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 whitespace-nowrap">
          Ukuran: 85.6mm x 53.98mm (3.37" x 2.12")
        </div>
      </div>

      {/* ===================================================
          LAYOUT CETAK A4 (TAMPIL DI LAYAR & PRINT)
          Di layar: hanya 1 lembar ditampilkan (bisa next/prev).
          Saat cetak: semua lembar ikut tercetak.
          =================================================== */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <span>Menyiapkan kartu presensi...</span>
        </div>
      ) : printableCards.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-3xl border border-slate-800">
          Tidak ada kartu yang dipilih untuk dicetak.
        </div>
      ) : (
        <div className="space-y-4 print:space-y-0">
          {/* Kontrol Navigasi Preview (Disembunyikan saat cetak) */}
          {cardPages.length > 1 && (
            <div className="no-print flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
              <button
                onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                disabled={previewPage === 0}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>

              <div className="text-center">
                <div className="text-xs font-bold text-white">
                  Lembar {previewPage + 1} dari {cardPages.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Total {printableCards.length} kartu • Saat cetak, semua lembar akan tercetak
                </div>
              </div>

              <button
                onClick={() => setPreviewPage((p) => Math.min(cardPages.length - 1, p + 1))}
                disabled={previewPage >= cardPages.length - 1}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Lembar A4 — hanya lembar aktif yang tampil di layar; saat print semua tampil */}
          {cardPages.map((pageCards, pageIndex) => (
            <div
              key={pageIndex}
              className={`a4-page bg-white text-slate-900 rounded-3xl print:rounded-none shadow-2xl p-6 sm:p-8 print:p-0 mx-auto max-w-[210mm] border border-slate-200 print:border-none ${pageIndex === previewPage ? "block" : "hidden print:block"
                }`}
            >
              {/* Header Lembar A4 (Hanya tampil di preview layar) */}
              <div className="no-print mb-4 pb-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  Lembar Cetak A4 ke-{pageIndex + 1} dari {cardPages.length}
                </span>
                <span>{pageCards.length} Pasang Kartu di lembar ini</span>
              </div>

              {/* Grid 4 Pasang Kartu (Kiri Depan, Kanan Belakang) */}
              <div className="space-y-4 print:space-y-3">
                {pageCards.map((card) => {
                  return (
                    <div
                      key={card.id}
                      className="flex items-center justify-center gap-4 sm:gap-6 print:gap-3"
                    >
                      {/* ===================================================
                          SISI DEPAN (FRONT) - EXACT KTP SIZE
                          3.37in x 2.12in (85.6mm x 53.98mm)
                          =================================================== */}
                      {(() => {
                        const { containerStyle, backgroundLayer, roleColor } = getCardFrontStyle(card);
                        return (
                          <div
                            className="relative rounded-xl overflow-hidden border border-slate-300 print:border-dashed print:border-slate-400 text-white flex flex-col justify-between p-3 shadow-md shrink-0 select-none"
                              style={{
                                width: "85.6mm",
                                height: "53.98mm",
                                boxSizing: "border-box",
                                ...containerStyle,
                                borderTopColor: roleColor,
                                borderBottomColor: roleColor,
                                borderLeftColor: roleColor,
                                borderRightColor: roleColor,
                              }}
                          >
                            {backgroundLayer}
                            
                            {/* Crop mark corner indicator */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40 pointer-events-none z-10" />
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/40 pointer-events-none z-10" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/40 pointer-events-none z-10" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40 pointer-events-none z-10" />

                            {/* Header Depan */}
                            <div className="flex items-center gap-2 border-b border-white/20 pb-1.5 relative z-10 bg-black/40 rounded-md p-1 -m-1">
                          {school?.logoUrl ? (
                            <img
                              src={school.logoUrl}
                              alt="Logo"
                              className="w-8 h-8 object-contain rounded bg-white/10 p-0.5"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center font-black text-xs">
                              <Shield className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[10px] font-black tracking-tight uppercase leading-tight truncate">
                              {school?.name || "SMK NEGERI 1 NUSANTARA"}
                            </h4>
                            <p className="text-[7.5px] font-semibold tracking-wider uppercase" style={{ color: roleColor + "CC" }}>
                              {card.role === "SISWA" ? "KARTU IDENTITAS SISWA" : 
                               card.role === "GURU" ? "KARTU IDENTITAS GURU" :
                               card.role === "KEPALA_SEKOLAH" ? "KARTU IDENTITAS KEPALA SEKOLAH" :
                               card.role === "PEGAWAI" ? "KARTU IDENTITAS PEGAWAI" : "KARTU IDENTITAS"}
                            </p>
                          </div>
                        </div>

                        {/* Body Depan */}
                        <div className="flex items-center gap-2.5 my-auto py-1 relative z-10">
                          {/* Foto Profil */}
                          {card.photoUrl ? (
                            <img
                              src={card.photoUrl}
                              alt={card.name}
                              className="w-16 h-20 rounded-md object-cover border border-white/30 bg-slate-800 shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-20 rounded-md border border-white/30 bg-blue-900/60 flex flex-col items-center justify-center font-bold text-lg text-white/80 shrink-0">
                              <span>
                                {card.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </span>
                              <span className="text-[7px] text-blue-200 mt-1 uppercase font-semibold">
                                {card.role}
                              </span>
                            </div>
                          )}

                          {/* Detail Identitas */}
                          <div className="flex-1 min-w-0 space-y-0.5 text-left bg-black/40 rounded-md p-1 -m-1">
                            <div className="text-[12px] font-black text-white leading-tight line-clamp-2">
                              {card.name}
                            </div>
                            <div className="text-[9px] text-blue-200 font-mono font-bold">
                              {card.role === "SISWA" ? "NIS" : "NIP"}: {card.nisNip}
                            </div>
                            {/* Kelas tidak ditampilkan untuk SISWA; jabatan ditampilkan untuk GURU/PEGAWAI/KEPSEK */}
                            {card.role !== "SISWA" && card.position && (
                              <div className="text-[8.5px] text-amber-300 font-bold uppercase truncate">
                                {card.position}
                              </div>
                            )}
                            <div className="inline-block px-1.5 py-0.2 rounded text-[7px] font-semibold text-white uppercase tracking-wider" style={{ backgroundColor: roleColor }}>
                              {card.role}
                            </div>
                          </div>
                        </div>

                         {/* Footer Depan */}
                         <div className="flex items-center justify-between border-t border-white/20 pt-1 text-[7.5px] text-blue-200 relative z-10 bg-black/40 rounded-md p-1 -m-1">
                          <span className="font-mono">RFID: {card.rfidUid || "-"}</span>
                          <span className="font-semibold">TA {school?.academicYear || "2026/2027"}</span>
                         </div>
                       </div>
                     );
                   })()}

                       {(() => {
                         // Jika "Sama seperti depan" dicentang, gunakan pengaturan background depan
                         const useSame = school?.useSameBackBg;
                         const frontMode = school?.cardBackgroundMode || "KIOSK";
                         
                         // Per-role color for back card (same logic as front)
                         const roleKey = card.role;
                         let perRoleColor = school?.cardSiswaColor || "#1e3a8a";
                         if (roleKey === "GURU") perRoleColor = school?.cardGuruColor || "#065f46";
                         else if (roleKey === "PEGAWAI") perRoleColor = school?.cardPegawaiColor || "#7c2d12";
                         else if (roleKey === "KEPALA_SEKOLAH") perRoleColor = school?.cardKepsekColor || "#581c87";

                         let backMode = school?.cardBackBackgroundMode || "SOLID";
                         let backSolidColor = school?.cardBackSolidColor || "#ffffff";
                         let backImageUrl = school?.cardBackBackgroundImageUrl || "";
                         
                         if (useSame) {
                           if (frontMode === "IMAGE") {
                             backMode = "IMAGE";
                             backImageUrl = school?.cardBackgroundImageUrl || "";
                           } else if (frontMode === "GRADIENT") {
                             backMode = "GRADIENT";
                             backSolidColor = "#ffffff";
                           } else if (frontMode === "SOLID") {
                             backMode = "SOLID";
                             backSolidColor = school?.cardSolidColor || "#1e3a8a";
                           } else if (frontMode === "KIOSK" && school?.kioskBackgroundUrl) {
                             backMode = "IMAGE";
                             backImageUrl = school?.kioskBackgroundUrl || "";
                           } else {
                             backMode = "SOLID";
                             backSolidColor = "#ffffff";
                           }
                         }
                         
                         return (
                            <div
                              className="relative rounded-xl overflow-hidden border border-slate-300 print:border-dashed print:border-slate-400 bg-white text-slate-800 flex flex-col justify-between p-3 shadow-md shrink-0 select-none"
                              style={{
                                width: "85.6mm",
                                height: "53.98mm",
                                boxSizing: "border-box",
                                WebkitPrintColorAdjust: "exact",
                                printColorAdjust: "exact",
                                ...(backMode === "IMAGE" && backImageUrl ? {
                                  backgroundColor: backSolidColor,
                                } : backMode === "GRADIENT" ? {
                                  backgroundImage: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                                } : {
                                  backgroundColor: backSolidColor,
                                }),
                              } as React.CSSProperties}
                            >
                              {(backMode === "IMAGE" && backImageUrl) && (
                                <div className="absolute inset-0 z-0 overflow-hidden">
                                  <img src={backImageUrl} className="w-full h-full object-cover scale-110" style={{ filter: "blur(3px)" }} alt="" />
                                  <div className="absolute inset-0" style={{ backgroundColor: perRoleColor, opacity: 0.3 }} />
                                </div>
                              )}
                             {/* Crop marks */}
                             <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-slate-400 pointer-events-none z-10" />
                             <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-slate-400 pointer-events-none z-10" />
                             <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-slate-400 pointer-events-none z-10" />
                             <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-400 pointer-events-none z-10" />

                            {/* Header Belakang */}
                            <div className="text-center border-b border-slate-200 pb-1 relative z-10 bg-white/80 rounded-md p-1 -m-1">
                              <h5 className="text-[8.5px] font-black text-slate-800 uppercase leading-tight">
                                TATA TERTIB PENGGUNAAN KARTU
                              </h5>
                              <p className="text-[6.5px] text-slate-500">
                                {school?.address || "Jl. Pendidikan No. 45"} • Telp: {school?.phone || "-"}
                              </p>
                            </div>

                            {/* Body Belakang (QR Code & Tata Tertib) */}
                            <div className="flex items-center gap-2 py-1 my-auto relative z-10">
                              {/* High-res QR Code */}
                              <div className="flex flex-col items-center shrink-0">
                                {card.qrDataUrl ? (
                                  <img
                                    src={card.qrDataUrl}
                                    alt="QR Code"
                                    className="w-16 h-16 object-contain border border-slate-200 rounded p-0.5 bg-white/80"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    <QrIcon className="w-8 h-8 text-slate-400" />
                                  </div>
                                )}
                                <span className="text-[6.5px] font-mono text-slate-500 font-bold mt-0.5">
                                  SCAN PRESENSI
                                </span>
                              </div>

                              {/* Catatan / Tata tertib singkat */}
                              <div className="flex-1 text-[7px] text-slate-600 space-y-0.5 leading-tight bg-white/80 rounded-md p-1 -m-1">
                                <p>1. Kartu ini wajib dibawa saat menghadiri kegiatan sekolah.</p>
                                <p>2. Gunakan sisi belakang untuk scan QR atau tap RFID.</p>
                                <p>3. Dilarang merusak, meminjamkan, atau menggandakan kartu ini.</p>
                                <p>4. Jika kartu hilang, segera laporkan ke bagian Tata Usaha.</p>
                              </div>
                            </div>

                            {/* Footer Belakang: Kepala Sekolah */}
                            <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-[6.5px] text-slate-600 relative z-10 bg-white/80 rounded-md p-1 -m-1">
                              <div>
                                <span>Masa Berlaku: </span>
                                <strong className="text-slate-800">{school?.cardValidity || "Selamanya"}</strong>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-slate-800">
                                  {school?.principalName || "Kepala Sekolah"}
                                </div>
                                <div className="font-mono text-slate-500">
                                  NIP: {school?.principalNip || "-"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================
          MODAL PENGATURAN BACKGROUND KARTU
          =================================================== */}
      {isBgModalOpen && (
         <BgModal
           bgForm={bgForm}
           setBgForm={setBgForm}
           bgImageFile={bgImageFile}
           setBgImageFile={setBgImageFile}
           bgBackImageFile={bgBackImageFile}
           setBgBackImageFile={setBgBackImageFile}
           isSaving={isSavingBg}
           setIsSaving={setIsSavingBg}
           school={school}
           onClose={() => setIsBgModalOpen(false)}
           onSaved={(updated) => {
             setSchool(updated);
             fetchCards();
           }}
         />
      )}
    </div>
  );
}

function BgModal({
  bgForm,
  setBgForm,
  bgImageFile,
  setBgImageFile,
  bgBackImageFile,
  setBgBackImageFile,
  isSaving,
  setIsSaving,
  school,
  onClose,
  onSaved,
}: {
  bgForm: any;
  setBgForm: any;
  bgImageFile: File | null;
  setBgImageFile: (f: File | null) => void;
  bgBackImageFile: File | null;
  setBgBackImageFile: (f: File | null) => void;
  isSaving: boolean;
  setIsSaving: (b: boolean) => void;
  school: any;
  onClose: () => void;
  onSaved: (s: any) => void;
}) {
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setErr(null);
    try {
      let imageUrl = bgForm.cardBackgroundImageUrl;
      if (bgImageFile) {
        const fd = new FormData();
        fd.append("file", bgImageFile);
        fd.append("type", "card_bg");
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const upJson = await upRes.json();
        if (!upRes.ok) throw new Error(upJson.error || "Upload gagal");
        imageUrl = upJson.url;
      }

      let backImageUrl = bgForm.cardBackBackgroundImageUrl;
      if (bgBackImageFile) {
        const fd = new FormData();
        fd.append("file", bgBackImageFile);
        fd.append("type", "card_bg");
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const upJson = await upRes.json();
        if (!upRes.ok) throw new Error(upJson.error || "Upload gagal");
        backImageUrl = upJson.url;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bgForm,
          cardBackgroundImageUrl: imageUrl,
          cardBackBackgroundImageUrl: backImageUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      onSaved(json.settings);
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            Pengaturan Background Kartu ID
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <Square className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {err && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs">
              {err}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Mode Background</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "KIOSK", label: "Sama Hal. Presensi", icon: Shield },
                { id: "SOLID", label: "Warna Solid", icon: Palette },
                { id: "GRADIENT", label: "Gradient", icon: Palette },
                { id: "IMAGE", label: "Gambar Kustom", icon: ImageIcon },
              ].map((m) => {
                const Icon = m.icon;
                const isSel = bgForm.cardBackgroundMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setBgForm({ ...bgForm, cardBackgroundMode: m.id })}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${isSel
                      ? "bg-blue-600 border-blue-400 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {bgForm.cardBackgroundMode === "KIOSK" &&
                "Mengikuti warna & gambar background halaman presensi (kiosk) yang diatur di Pengaturan Tampilan. Gambar akan blur otomatis agar teks tetap terbaca."}
              {bgForm.cardBackgroundMode === "SOLID" &&
                "Gunakan satu warna solid yang sama untuk semua kategori."}
              {bgForm.cardBackgroundMode === "GRADIENT" &&
                "Gunakan dua warna gradient untuk semua kartu."}
              {bgForm.cardBackgroundMode === "IMAGE" &&
                "Gunakan gambar background yang diunggah (akan blur otomatis agar teks tetap terbaca), dipakai untuk semua kartu."}
            </p>
          </div>

          {bgForm.cardBackgroundMode === "SOLID" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Warna Solid</label>
              <input
                type="color"
                value={bgForm.cardSolidColor}
                onChange={(e) => setBgForm({ ...bgForm, cardSolidColor: e.target.value })}
                className="w-20 h-10 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {bgForm.cardBackgroundMode === "GRADIENT" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Warna Awal</label>
                <input
                  type="color"
                  value={bgForm.cardGradientFrom}
                  onChange={(e) => setBgForm({ ...bgForm, cardGradientFrom: e.target.value })}
                  className="w-20 h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Warna Akhir</label>
                <input
                  type="color"
                  value={bgForm.cardGradientTo}
                  onChange={(e) => setBgForm({ ...bgForm, cardGradientTo: e.target.value })}
                  className="w-20 h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {bgForm.cardBackgroundMode === "IMAGE" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Upload Gambar Background</label>
              {bgForm.cardBackgroundImageUrl && (
                <img src={bgForm.cardBackgroundImageUrl} className="w-32 h-20 object-cover rounded-lg mb-2 border border-slate-700" alt="" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBgImageFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />
            </div>
          )}

          {/* Per-kategori warna (selalu tampil agar bisa diatur per kategori) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Warna per Kategori:
              {bgForm.cardBackgroundMode === "KIOSK" && " (dipakai sebagai overlay di atas background kiosk)"}
              {bgForm.cardBackgroundMode === "IMAGE" && " (dipakai sebagai fallback jika gambar tidak tampil)"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "cardSiswaColor", label: "Siswa" },
                { key: "cardGuruColor", label: "Guru" },
                { key: "cardPegawaiColor", label: "Pegawai" },
                { key: "cardKepsekColor", label: "Kepsek" },
              ].map((c) => (
                <div key={c.key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgForm[c.key]}
                    onChange={(e) => setBgForm({ ...bgForm, [c.key]: e.target.value })}
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ===================== BACK CARD BACKGROUND ===================== */}
          <div className="border-t border-slate-700 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Background Kartu Belakang</span>
              </h4>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bgForm.useSameBackBg as boolean}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      setBgForm({
                        ...bgForm,
                        useSameBackBg: true,
                        cardBackBackgroundMode: bgForm.cardBackgroundMode === "KIOSK" ? "SOLID" : bgForm.cardBackgroundMode,
                        cardBackBackgroundImageUrl: bgForm.cardBackgroundImageUrl,
                        cardBackSolidColor: bgForm.cardBackgroundMode === "SOLID" ? bgForm.cardSolidColor : "#ffffff",
                      });
                    } else {
                      setBgForm({ ...bgForm, useSameBackBg: false });
                    }
                  }}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span>Sama seperti depan</span>
              </label>
            </div>

            {!bgForm.useSameBackBg && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Mode Background Belakang</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "SOLID", label: "Warna Solid", icon: Palette },
                    { id: "GRADIENT", label: "Gradient", icon: Palette },
                    { id: "IMAGE", label: "Gambar Kustom", icon: ImageIcon },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSel = bgForm.cardBackBackgroundMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setBgForm({ ...bgForm, cardBackBackgroundMode: m.id, cardBackBackgroundImageUrl: "" })}
                        className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${isSel
                          ? "bg-blue-600 border-blue-400 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!bgForm.useSameBackBg && bgForm.cardBackBackgroundMode === "SOLID" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Warna Solid Belakang</label>
                <input
                  type="color"
                  value={bgForm.cardBackSolidColor}
                  onChange={(e) => setBgForm({ ...bgForm, cardBackSolidColor: e.target.value })}
                  className="w-20 h-10 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {!bgForm.useSameBackBg && bgForm.cardBackBackgroundMode === "IMAGE" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Upload Gambar Background Belakang</label>
                {bgForm.cardBackBackgroundImageUrl && (
                  <img src={bgForm.cardBackBackgroundImageUrl} className="w-32 h-20 object-cover rounded-lg mb-2 border border-slate-700" alt="" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setBgBackImageFile(file);
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setBgForm({ ...bgForm, cardBackBackgroundImageUrl: url });
                    }
                  }}
                  className="text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Menyimpan..." : "Simpan Background"}
          </button>
        </div>
      </div>
    </div>
  );
}
