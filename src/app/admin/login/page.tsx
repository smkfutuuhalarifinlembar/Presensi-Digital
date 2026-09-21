"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, User, ArrowLeft, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Username dan password wajib diisi.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        // TU/Operator langsung ke Menunggu Persetujuan, Super Admin ke Dashboard
        const role = json?.user?.role || json?.role || "";
        router.push(role === "ADMIN_OPERATOR" ? "/admin/leave-approval" : "/admin/dashboard");
      } else {
        setErrorMsg(json.error || "Login gagal.");
      }
    } catch {
      setErrorMsg("Gagal terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-between p-4 sm:p-8 text-white">
      {/* Top Bar Nav */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Presensi</span>
        </Link>
      </div>

      {/* Login Card */}
      <div className="max-w-md mx-auto w-full my-auto">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30 mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Login Pengelola
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Sistem Presensi Digital Terpadu Sekolah
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition transform active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Memverifikasi..." : "Masuk ke Panel Admin"}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400">
            <p className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-slate-500" />
              Butuh Bantuan?
            </p>
            <p className="text-slate-500">
              Hubungi administrator sistem sekolah untuk mendapatkan kredensial akses panel.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Sistem Presensi Digital Sekolah. All rights reserved.
      </div>
    </div>
  );
}
