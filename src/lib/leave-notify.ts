import { prisma } from "./prisma";
import { sendDirectWaMessage } from "./wa-sender";
import { formatDateIndo } from "./date-utils";

export function reasonLabel(reasonType: string, custom?: string | null): string {
  switch (reasonType) {
    case "SAKIT":
      return "Sakit";
    case "IZIN":
      return "Izin";
    case "KEPERLUAN_KELUARGA":
      return "Keperluan Keluarga";
    case "DINAS":
      return "Dinas";
    case "LAINNYA":
      return custom?.trim() ? `Lainnya - ${custom.trim()}` : "Lainnya";
    default:
      return custom?.trim() || reasonType;
  }
}

function fillTemplate(
  tpl: string,
  vars: Record<string, string>
): string {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v ?? "");
  }
  return out;
}

// Variabel lengkap sesuai template baru (mendukung alias lama).
function leaveVars(leave: any, schoolName: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const abs = (u?: string | null) => {
    if (!u) return "-";
    if (/^https?:\/\//i.test(u)) return u;
    return baseUrl ? `${baseUrl}${u}` : u;
  };
  const ket = reasonLabel(leave.reasonType, leave.customReason);
  const tgl = formatDateIndo(leave.dateString);
  const kelas = leave.className || leave.position || "-";
  const pesan = leave.message || "-";
  const linkSurat = leave.proofDriveLink || abs(leave.proofImageUrl);
  const linkFoto = leave.parentPhotoDriveLink || abs(leave.parentPhotoUrl);
  return {
    // Template baru
    nama_siswa: leave.personName,
    kelas, keterangan: ket, tanggal: tgl, pesan,
    link_surat: linkSurat, link_foto: linkFoto,
    nama_sekolah: schoolName,
    // Alias lama (kompatibilitas)
    nama: leave.personName, nis: leave.nisNip,
    sekolah: schoolName,
    peninjau: leave.reviewedByAdminName || "TU/Operator",
    catatan: leave.reviewNote || "-",
  };
}

export async function getLeaveSetting() {
  let s = await prisma.leaveSetting.findUnique({ where: { id: "default" } });
  if (!s) s = await prisma.leaveSetting.create({ data: { id: "default" } });
  return s;
}

export async function notifyTuOnNewLeave(leaveId: string, opts?: { wait?: boolean }) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) return { success: false, message: "Data izin tidak ditemukan." };
  const setting = await getLeaveSetting();
  const school = await prisma.schoolSetting.findUnique({ where: { id: "default" } });

  const numbers = String(setting.tuWaNumbers || "")
    .split(/[,;\n]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  if (numbers.length === 0) {
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { waToTuStatus: "NO_TU_NUMBER" },
    });
    return { success: false, message: "Nomor WA TU/Operator belum diatur di Pengaturan Form Izin." };
  }

  const msg = fillTemplate(
    setting.templatePengajuan ||
      "Pengajuan izin baru: {nama} ({kelas}) - {keterangan} tgl {tanggal}.",
    leaveVars(leave, school?.name || "Sekolah")
  );

  const sendOne = (num: string) => sendDirectWaMessage(num, msg);
  // Mode manual: kirim SYNCHRONOUS (await) agar status tercatat benar sebelum respons,
  // sekaligus tetap didukung fire-and-forget bila dibutuhkan.
  const results: string[] = [];
  if (opts?.wait) {
    for (const num of numbers) {
      try {
        const r = await sendOne(num);
        results.push(`${num}:${r.success ? "OK" : "FAIL:" + r.message}`);
      } catch (e: any) {
        results.push(`${num}:FAIL:${e?.message || "error"}`);
      }
    }
  } else {
    const settled = await Promise.allSettled(numbers.map((num) => sendOne(num)));
    settled.forEach((s, i) => {
      if (s.status === "fulfilled") results.push(`${numbers[i]}:${s.value.success ? "OK" : "FAIL:" + s.value.message}`);
      else results.push(`${numbers[i]}:FAIL:${s.reason?.message || "error"}`);
    });
  }
  const allOk = results.length > 0 && results.every((r) => /:OK$/.test(r));
  const anyOk = results.some((r) => /:OK$/.test(r));
  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { waToTuStatus: allOk ? "SENT" : anyOk ? `PARTIAL:${results.join("|")}` : `FAILED:${results.join("|")}` },
  });
  return { success: allOk, message: results.join(", ") };
}

export async function notifyResultOnReview(leaveId: string) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) return { success: false, message: "Data izin tidak ditemukan." };
  const setting = await getLeaveSetting();
  const school = await prisma.schoolSetting.findUnique({ where: { id: "default" } });
  const vars = leaveVars(leave, school?.name || "Sekolah");

  const approved = leave.status === "APPROVED";
  // Template terpisah per penerima; fallback ke template lama bila kolom baru kosong.
  const tplOrtu = approved
    ? ((setting as any).templateSetujuOrtu || (setting as any).templateDisetujui || "Izin {nama} DISETUJUI. Catatan: {catatan}")
    : ((setting as any).templateTolakOrtu || (setting as any).templateDitolak || "Izin {nama} DITOLAK. Catatan: {catatan}");
  const tplWali = approved
    ? ((setting as any).templateSetujuWali || (setting as any).templateDisetujui || "Izin {nama} DISETUJUI. Catatan: {catatan}")
    : ((setting as any).templateTolakWali || (setting as any).templateDitolak || "Izin {nama} DITOLAK. Catatan: {catatan}");
  const msgOrtu = fillTemplate(tplOrtu, vars);
  const msgWali = fillTemplate(tplWali, vars);

  const targets: { phone: string; message: string }[] = [];
  // (A) WA WALI KELAS: snapshot saat pengajuan -> mapping kelas -> default.
  if (setting.notifyWaliKelas) {
    let w: string | null = (leave.waliKelasPhone || "").trim() || null;
    if (!w) {
      try {
        const map = JSON.parse(setting.waliKelasMapJson || "{}");
        w = ((leave.className && map[leave.className]) || "").trim() || (setting.waliKelasDefaultWa || "").trim() || null;
      } catch {
        w = (setting.waliKelasDefaultWa || "").trim() || null;
      }
    }
    if (w) targets.push({ phone: w, message: msgWali });
  }
  // (B) WA ORANG TUA: prioritas parentPhone; jika tidak ada fallback ke nomor pribadi.
  if (setting.notifyParent) {
    const parent = (leave.parentPhone || "").trim();
    if (parent) targets.push({ phone: parent, message: msgOrtu });
  }
  // (C) WA SISWA/PEMOHON ITU SENDIRI: pastikan pesan sampai ke siswa/guru/kepala
  // (untuk siswa: nomor pribadi; untuk guru/kepala: nomor sendiri karena memang tidak ada ortu).
  const self = (leave.personPhone || "").trim();
  if (self) targets.push({ phone: self, message: msgOrtu });

  const seen = new Set<string>();
  const unique = targets.filter((t) => {
    const k = t.phone.trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (unique.length === 0) {
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { waResultStatus: "NO_TARGET" },
    });
    return { success: false, message: "Nomor WA wali kelas/orangtua tidak tersedia." };
  }

  const results: string[] = [];
  for (const t of unique) {
    const r = await sendDirectWaMessage(t.phone, t.message);
    results.push(`${t.phone}:${r.success ? "OK" : "FAIL:" + r.message}`);
  }
  const allOk = results.every((r) => r.includes("OK") && !r.includes("FAIL"));
  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { waResultStatus: allOk ? "SENT" : `PARTIAL:${results.join("|")}` },
  });
  return { success: allOk, message: results.join(", ") };
}
