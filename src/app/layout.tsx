import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";

export const metadata: Metadata = {
  title: "Sistem Presensi Digital Sekolah",
  description:
    "Aplikasi sistem presensi digital sekolah siap pakai dengan integrasi kartu RFID, QR Code scanner, notifikasi otomatis WhatsApp Gateway, dan cetak ID Card standar KTP Indonesia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased selection:bg-blue-500 selection:text-white">
        <ThemeProvider>
          <ToastProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
