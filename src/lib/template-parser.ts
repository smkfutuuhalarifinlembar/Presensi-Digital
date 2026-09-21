export interface MessageVariables {
  nama: string;
  nis?: string;
  nip?: string;
  kelas?: string;
  jabatan?: string;
  waktu: string;
  tanggal: string;
  status: string;
  nama_kegiatan: string;
  nama_sekolah: string;
  [key: string]: string | undefined;
}

export function parseWaTemplate(template: string, vars: MessageVariables): string {
  let message = template;

  const replacements: Record<string, string> = {
    "{nama}": vars.nama || "",
    "{nis}": vars.nis || vars.nip || "-",
    "{nip}": vars.nip || vars.nis || "-",
    "{kelas}": vars.kelas || vars.jabatan || "-",
    "{jabatan}": vars.jabatan || vars.kelas || "-",
    "{waktu}": vars.waktu || "",
    "{tanggal}": vars.tanggal || "",
    "{status}": vars.status || "",
    "{nama_kegiatan}": vars.nama_kegiatan || "",
    "{nama_sekolah}": vars.nama_sekolah || "",
  };

  for (const [placeholder, val] of Object.entries(replacements)) {
    message = message.split(placeholder).join(val);
  }

  return message;
}
