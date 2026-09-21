"use client";

import React, { useState, useEffect } from "react";
import {
  UserCog,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  KeyRound,
} from "lucide-react";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deleteUser, setDeleteUser] = useState<any | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "ADMIN_OPERATOR",
  });
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const j = await meRes.json();
        setCurrentAdmin(j.user);
      }
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setForm({ username: "", password: "", name: "", role: "ADMIN_OPERATOR" });
    setEditingUser(null);
    setErr(null);
    setMsg(null);
    setIsAddModalOpen(true);
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({ username: u.username, password: "", name: u.name, role: u.role });
    setErr(null);
    setMsg(null);
    setIsAddModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body: any = { username: form.username, name: form.name, role: form.role };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setMsg(editingUser ? "Pengguna diperbarui." : "Pengguna baru dibuat.");
      setIsAddModalOpen(false);
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setDeleteUser(null);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <UserCog className="w-7 h-7 text-blue-400" />
            Kelola Pengguna & Hak Akses
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Atur siapa saja yang dapat login ke panel admin. Super Admin mengelola seluruh menu, TU/Operator hanya Rekap & Input Manual.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </button>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {msg}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <span>Memuat data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Nama Lengkap</th>
                  <th className="px-4 py-3.5 font-bold">Username</th>
                  <th className="px-4 py-3.5 font-bold">Hak Akses</th>
                  <th className="px-4 py-3.5 font-bold">Dibuat</th>
                  <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                          {u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{u.name}</div>
                          {currentAdmin?.adminId === u.id && (
                            <div className="text-[10px] text-emerald-400 font-bold">Sedang Login</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-300">{u.username}</td>
                    <td className="px-4 py-4">
                      {u.role === "SUPER_ADMIN" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3 h-3" />
                          SUPER ADMIN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
                          <Lock className="w-3 h-3" />
                          TU / OPERATOR
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[11px] text-slate-400 font-mono">
                      {new Date(u.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {currentAdmin?.adminId !== u.id && (
                          <button
                            onClick={() => setDeleteUser(u)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200">
        💡 <strong>Hak Akses:</strong> Super Admin memiliki akses penuh ke seluruh menu. TU/Operator hanya dapat mengakses Dashboard, Live Monitoring, Input Presensi Manual, dan Rekap & Laporan.
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {err && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {err}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username (untuk login) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                {editingUser && (
                  <p className="text-[10px] text-slate-500 mt-1">Username tidak dapat diubah.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password {editingUser ? "(kosongkan jika tidak diubah)" : "*"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingUser ? "Biarkan kosong untuk tidak mengubah" : "Minimal 6 karakter"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hak Akses (Role) *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ADMIN_OPERATOR">TU / Operator (Rekap & Input Manual saja)</option>
                  <option value="SUPER_ADMIN">Super Admin (Akses penuh)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Buat Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Hapus Pengguna</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus pengguna{" "}
              <strong className="text-white">{deleteUser.name}</strong> ({deleteUser.username})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
