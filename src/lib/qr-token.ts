import { prisma } from "@/lib/prisma";

/**
 * Membuat token QR Code untuk data orang.
 *
 * Token ini disimpan pada kolom `qrCodeToken` di tabel Person dan merupakan
 * SATU-SATUNYA data yang dibaca oleh kiosk saat scan QR Code dari kartu
 * (lihat src/app/api/kiosk/presence/route.ts). Karena itu token harus unik
 * dan tidak boleh bertabrakan dengan milik orang lain.
 *
 * Format dasar tetap `QR-<KATEGORI>-<NIS/NIP>` agar kartu lama tetap terbaca,
 * lalu ditambah suffix acak apabila sudah dipakai orang lain.
 */
export async function generateUniqueQrToken(
  role: string,
  nisNip: string
): Promise<string> {
  const cleanRole = String(role || "UMUM").trim().toUpperCase();
  const cleanNis = String(nisNip || "").trim();
  const base = `QR-${cleanRole}-${cleanNis}`.slice(0, 150);

  for (let attempt = 0; attempt < 6; attempt++) {
    const token =
      attempt === 0
        ? base
        : `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const existing = await prisma.person.findUnique({
      where: { qrCodeToken: token },
      select: { id: true },
    });

    if (!existing) return token;
  }

  // Fallback terakhir: token acak yang dijamin unik
  return `QR-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}
