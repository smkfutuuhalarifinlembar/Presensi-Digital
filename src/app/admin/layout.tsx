"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Edit3,
  CreditCard,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Radio,
  ExternalLink,
  ShieldCheck,
  Activity,
  UserCog,
  Database,
  Trash2,
  Sun,
  Moon,
  Calendar,
  Building2,
  BellRing,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [currentAdmin, setCurrentAdmin] = useState<{
    name: string;
    role: string;
    username: string;
  } | null>(null);

  // Jika di halaman login, tidak perlu render admin sidebar
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentAdmin(data.user);
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      }
    };

    checkSession();
  }, [pathname, isLoginPage, router]);

  // Tutup drawer mobile saat pindah halaman
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  const navItems = [
    {
      label: "Menunggu Persetujuan Izin",
      href: "/admin/leave-approval",
      icon: ShieldCheck,
      roles: ["SUPER_ADMIN", "ADMIN_OPERATOR"],
    },
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "ADMIN_OPERATOR"],
    },
    {
      label: "Live Monitoring Presensi",
      href: "/admin/live",
      icon: Activity,
      roles: ["SUPER_ADMIN", "ADMIN_OPERATOR"],
    },
    {
      label: "Data Orang",
      href: "/admin/people",
      icon: Users,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Yayasan & Lembaga",
      href: "/admin/yayasan",
      icon: Building2,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Manajemen Jadwal & Jam Presensi",
      href: "/admin/activities",
      icon: CalendarDays,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Input Presensi Manual",
      href: "/admin/manual",
      icon: Edit3,
      roles: ["SUPER_ADMIN", "ADMIN_OPERATOR"],
    },
    {
      label: "Riwayat Notifikasi",
      href: "/admin/notification-logs",
      icon: BellRing,
      roles: ["SUPER_ADMIN", "ADMIN_OPERATOR"],
    },
    {
      label: "Cetak ID Card (KTP A4)",
      href: "/admin/id-card",
      icon: CreditCard,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Rekap & Laporan",
      href: "/admin/reports",
      icon: FileSpreadsheet,
      roles: ["SUPER_ADMIN", "ADMIN_OPERATOR"],
    },
    {
      label: "Pengaturan Form Izin",
      href: "/admin/leave-settings",
      icon: FileText,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "WhatsApp Gateway",
      href: "/admin/wa-gateway",
      icon: MessageSquare,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Pengaturan Tampilan",
      href: "/admin/settings",
      icon: Settings,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Hari Libur",
      href: "/admin/holidays",
      icon: Calendar,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Backup & Restore Data",
      href: "/admin/backup",
      icon: Database,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Hapus Data",
      href: "/admin/data-management",
      icon: Trash2,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Kelola Pengguna & Hak Akses",
      href: "/admin/users",
      icon: UserCog,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Log Aktivitas Audit",
      href: "/admin/audit-log",
      icon: ShieldAlert,
      roles: ["SUPER_ADMIN"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    currentAdmin ? item.roles.includes(currentAdmin.role) : false
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${theme === "dark" ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-800"}`}>
      {/* ===================================================
          SIDEBAR DESKTOP
          =================================================== */}
      <aside className={`hidden md:flex flex-col w-64 lg:w-72 shrink-0 no-print ${theme === "dark" ? "bg-slate-900 border-r border-slate-800" : "bg-white border-r border-gray-200"}`}>
        {/* Header Sidebar */}
        <div className={`p-6 border-b flex items-center gap-3 ${theme === "dark" ? "border-slate-800" : "border-gray-200"}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base leading-tight">
              Presensi Digital
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Panel Pengelolaan Sekolah
            </p>
          </div>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : theme === "dark"
                    ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle & User Info */}
        <div className={`p-4 border-t space-y-3 ${theme === "dark" ? "border-slate-800" : "border-gray-200"}`}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              theme === "dark"
                ? "bg-slate-800/80 hover:bg-slate-800 text-amber-400 border border-slate-700/60"
                : "bg-gray-100 hover:bg-gray-200 text-indigo-600 border border-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            </span>
            <span className={`w-8 h-4 rounded-full relative transition ${theme === "dark" ? "bg-slate-600" : "bg-blue-500"}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${theme === "dark" ? "left-0.5" : "left-4.5"}`} />
            </span>
          </button>

          {/* Quick link ke Kiosk */}
          <Link
            href="/"
            target="_blank"
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              theme === "dark"
                ? "bg-slate-800/80 hover:bg-slate-800 text-blue-400 border-slate-700/60"
                : "bg-gray-100 hover:bg-gray-200 text-blue-600 border-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Buka Layar Kiosk
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Admin Info */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                theme === "dark"
                  ? "bg-slate-800 text-slate-300 border-slate-700"
                  : "bg-slate-200 text-slate-700 border-slate-300"
              }`}>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                  {currentAdmin?.name || "Admin"}
                </div>
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  {currentAdmin?.role === "SUPER_ADMIN" ? "Super Admin" : "TU / Operator"}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg transition ${
                theme === "dark"
                  ? "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  : "text-slate-500 hover:text-rose-500 hover:bg-slate-100"
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===================================================
          APP BAR MOBILE & OFF-CANVAS DRAWER
          =================================================== */}
      <div className="md:hidden flex flex-col no-print">
        {/* Topbar Mobile */}
        <div className={`border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30 ${
          theme === "dark"
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-xl ${
                theme === "dark"
                  ? "bg-slate-800 text-slate-300 hover:text-slate-200"
                  : "bg-slate-100 text-slate-600 hover:text-slate-800"
              }`}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className={`font-bold text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Panel Admin</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Mobile */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg ${
                theme === "dark"
                  ? "text-amber-400 hover:bg-slate-800"
                  : "text-indigo-600 hover:bg-gray-100"
              }`}
              title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/"
              target="_blank"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                theme === "dark"
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                  : "bg-blue-100 text-blue-600 border border-blue-300"
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Kiosk</span>
            </Link>
            <button
              onClick={handleLogout}
              className={`p-1.5 rounded-lg ${
                theme === "dark"
                  ? "text-slate-400 hover:text-rose-400"
                  : "text-slate-500 hover:text-rose-500"
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Menu Mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex">
            <div className={`w-72 max-w-[85vw] h-full border-r flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-200"
            }`}>
              <div className={`flex items-center justify-between pb-4 border-b mb-4 ${
                theme === "dark" ? "border-slate-800" : "border-gray-200"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                    <Radio className="w-4 h-4" />
                  </div>
                  <span className={`font-bold text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Presensi Digital</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-1.5 rounded-lg ${
                    theme === "dark"
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-600 text-white font-bold"
                          : theme === "dark"
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className={`pt-4 border-t text-xs flex items-center justify-between ${
                theme === "dark"
                  ? "border-slate-800 text-slate-400"
                  : "border-gray-200 text-slate-500"
              }`}>
                <span>{currentAdmin?.name}</span>
                <button
                  onClick={handleLogout}
                  className={`font-semibold ${
                    theme === "dark" ? "text-rose-400" : "text-rose-600"
                  }`}
                >
                  Keluar
                </button>
              </div>
            </div>

            <div
              className="flex-1"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}
      </div>

      {/* ===================================================
          MAIN CONTENT AREA
          =================================================== */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto print-container">
          {children}
        </div>
      </main>
    </div>
  );
}
