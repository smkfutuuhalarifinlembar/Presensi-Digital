import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database...");

  // 1. Bersihkan database yang ada
  await prisma.attendanceRecord.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.person.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.schoolSetting.deleteMany();
  await prisma.waGatewayConfig.deleteMany();
  await prisma.waTemplate.deleteMany();

  // 2. Buat Pengaturan Sekolah Default
  const schoolSetting = await prisma.schoolSetting.create({
    data: {
      id: "default",
      name: "SMK Negeri 1 Nusantara",
      npsn: "20214567",
      address: "Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan 12180",
      phone: "(021) 789-0123",
      email: "info@smkn1nusantara.sch.id",
      website: "https://smkn1nusantara.sch.id",
      principalName: "Drs. H. Bambang Sudirman, M.Pd.",
      principalNip: "197103151998021003",
      kioskBackgroundColor: "#0b192e",
      kioskHeaderSubtitle: "Sistem Presensi Digital Terpadu & Terpercaya",
      cardValidity: "2026/2027",
      cardBackNotes:
        "1. Kartu ini merupakan identitas resmi di lingkungan SMK Negeri 1 Nusantara.\n2. Wajib dibawa setiap hari sekolah untuk presensi mandiri (RFID / QR Code).\n3. Dilarang merusak, memotong, atau meminjamkan kartu ini kepada orang lain.\n4. Apabila kartu hilang atau ditemukan, mohon hubungi bagian Tata Usaha sekolah.",
    },
  });
  console.log("✅ Pengaturan sekolah berhasil dibuat:", schoolSetting.name);

  // 3. Buat Akun Admin & Operator
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const operatorPasswordHash = await bcrypt.hash("operator123", 10);

  const superAdmin = await prisma.admin.create({
    data: {
      username: "admin",
      passwordHash: adminPasswordHash,
      name: "Super Administrator",
      role: "SUPER_ADMIN",
    },
  });

  const operator = await prisma.admin.create({
    data: {
      username: "operator",
      passwordHash: operatorPasswordHash,
      name: "Operator Tata Usaha",
      role: "ADMIN_OPERATOR",
    },
  });
  console.log("✅ Akun Admin berhasil dibuat (admin / admin123, operator / operator123)");

  // 4. Buat Jadwal Kegiatan Presensi
  const activityMasuk = await prisma.activity.create({
    data: {
      name: "Presensi Pagi Masuk",
      daysOfWeek: "ALL", // Aktif setiap hari untuk memudahkan uji coba langsung
      startTime: "06:00",
      endTime: "23:59", // Dibuat fleksibel hingga malam agar siap dicoba kapan saja
      lateCutoffTime: "07:00",
      gracePeriodMinutes: 15, // Hadir toleransi s.d 07:15, lewat dari itu Terlambat
      targetRoles: "ALL",
      isActive: true,
    },
  });

  const activityUpacara = await prisma.activity.create({
    data: {
      name: "Upacara Bendera Senin",
      daysOfWeek: "1", // Hanya hari Senin
      startTime: "06:45",
      endTime: "08:15",
      lateCutoffTime: "07:00",
      gracePeriodMinutes: 5,
      targetRoles: "ALL",
      isActive: true,
    },
  });

  const activityPulang = await prisma.activity.create({
    data: {
      name: "Presensi Pulang",
      daysOfWeek: "1,2,3,4,5",
      startTime: "15:00",
      endTime: "18:00",
      lateCutoffTime: "17:00",
      gracePeriodMinutes: 0,
      targetRoles: "ALL",
      isActive: true,
    },
  });
  console.log("✅ Jadwal kegiatan presensi berhasil dibuat");

  // 5. Template WhatsApp
  const statuses = ["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "ALPA", "BOLOS", "DINAS_LUAR"];
  const roles = ["ALL", "SISWA", "GURU", "PEGAWAI", "KEPALA_SEKOLAH"];
  
  // Variabel: {nama}, {nis}, {nip}, {kelas}, {jabatan}, {waktu}, {tanggal}, {status}, {nama_kegiatan}, {nama_sekolah}
  // Template sudah dibedakan: siswa pakai "Bapak/Ibu" & kelas, selain itu pakai "Bapak/Ibu" & jabatan
  for (const role of roles) {
    for (const status of statuses) {
      let content = "";
      
      if (role === "SISWA") {
        // Template siswa: sapaan "Bapak/Ibu", pakai variabel {kelas}, tidak pakai jabatan
        const statusLabel = {
          HADIR: "*HADIR* tepat waktu",
          TERLAMBAT: "*TERLAMBAT*",
          IZIN: "*IZIN*",
          SAKIT: "*SAKIT*",
          ALPA: "*ALPA* (Tanpa Keterangan)",
          BOLOS: "*BOLOS* / Meninggalkan kegiatan",
          DINAS_LUAR: "*DINAS LUAR*",
        }[status] || `*${status}*`;

        if (status === "HADIR") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu Orang tua/Wali dari ananda *{nama}* (kelas {kelas}),\n\nDengan ini kami memberitahukan bahwa ananda *{nama}* telah *HADIR* tepat waktu di *{nama_sekolah}* mengikuti kegiatan *{nama_kegiatan}* pada pukul *{waktu}*, tanggal {tanggal}.\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu. Selamat beraktivitas! 🙏`;
        } else if (status === "TERLAMBAT") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu Orang tua/Wali dari ananda *{nama}* (kelas {kelas}),\n\nMohon maaf, dengan ini kami informasikan bahwa ananda *{nama}* tercatat *TERLAMBAT* dalam kegiatan *{nama_kegiatan}* pada pukul *{waktu}*, tanggal {tanggal}.\n\nMohon bimbingan Bapak/Ibu agar ananda dapat lebih disiplin ke depannya. Terima kasih. 🙏`;
        } else if (status === "IZIN") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu Orang tua/Wali dari ananda *{nama}* (kelas {kelas}),\n\nKami informasikan bahwa ananda *{nama}* tercatat *IZIN* tidak mengikuti kegiatan *{nama_kegiatan}* pada tanggal {tanggal} (pukul {waktu}).\n\nTerima kasih atas perhatian Bapak/Ibu. 🙏`;
        } else if (status === "SAKIT") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu Orang tua/Wali dari ananda *{nama}* (kelas {kelas}),\n\nKami informasikan bahwa ananda *{nama}* tercatat *SAKIT* pada kegiatan *{nama_kegiatan}* tanggal {tanggal} (pukul {waktu}). Semoga ananda lekas diberi kesembuhan dan dapat kembali mengikuti kegiatan pembelajaran seperti sedia kala. Aamiin. 🤲`;
        } else if (status === "ALPA") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nPERINGATAN untuk Bapak/Ibu Orang tua/Wali dari ananda *{nama}* (kelas {kelas}),\n\nDengan ini kami memberitahukan bahwa ananda *{nama}* tercatat *ALPA (Tanpa Keterangan)* pada kegiatan *{nama_kegiatan}* tanggal {tanggal}.\n\nMohon Bapak/Ibu untuk segera mengonfirmasi ke pihak sekolah/wali kelas. Terima kasih. 🙏`;
        } else if (status === "BOLOS") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nPERINGATAN KHUSUS untuk Bapak/Ibu Orang tua/Wali dari ananda *{nama}* (kelas {kelas}),\n\nDengan ini kami memberitahukan bahwa ananda *{nama}* tercatat *BOLOS / Meninggalkan kegiatan* *{nama_kegiatan}* pada tanggal {tanggal}.\n\nMohon konfirmasi mendesak ke kantor Tata Usaha sekolah. Terima kasih. 🙏`;
        } else {
          content = `Yth. Bapak/Ibu Orang tua/Wali dari ananda *{nama}* (kelas {kelas}), menginformasikan bahwa ananda tercatat ${statusLabel} pada kegiatan *{nama_kegiatan}* tanggal {tanggal} (pukul {waktu}) di *{nama_sekolah}*.`;
        }
      } else if (role === "GURU") {
        if (status === "HADIR") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* telah berhasil dicatat *HADIR* tepat waktu di *{nama_sekolah}* pada pukul *{waktu}*, tanggal {tanggal}.\n\nSelamat bertugas dan terima kasih atas dedikasi Bapak/Ibu. 🙏`;
        } else if (status === "TERLAMBAT") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nMohon maaf, presensi Anda pada kegiatan *{nama_kegiatan}* tercatat *TERLAMBAT* di *{nama_sekolah}* pada pukul *{waktu}*, tanggal {tanggal}.\n\nMohon perhatian Bapak/Ibu untuk lebih disiplin dimasa mendatang. Terima kasih. 🙏`;
        } else if (status === "IZIN") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* tercatat *IZIN* di *{nama_sekolah}* pada tanggal {tanggal} (pukul {waktu}). Semoga aktivitas Bapak/Ibu berjalan lancar. 🙏`;
        } else if (status === "SAKIT") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* tercatat *SAKIT* di *{nama_sekolah}* pada tanggal {tanggal} (pukul {waktu}). Semoga lekas diberi kesembuhan. Aamiin. 🤲`;
        } else if (status === "DINAS_LUAR") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* tercatat *DINAS LUAR* di *{nama_sekolah}* pada tanggal {tanggal} (pukul {waktu}). Terima kasih atas tugas yang dijalankan. 🙏`;
        } else {
          content = `Yth. Bapak/Ibu *{nama}* ({jabatan}), presensi Anda pada kegiatan *{nama_kegiatan}* tercatat *${status}* di *{nama_sekolah}* tanggal {tanggal} (pukul {waktu}).`;
        }
      } else if (role === "PEGAWAI") {
        if (status === "HADIR") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* telah berhasil dicatat *HADIR* tepat waktu di *{nama_sekolah}* pada pukul *{waktu}*, tanggal {tanggal}.\n\nSelamat bertugas dan terima kasih atas dedikasi Bapak/Ibu. 🙏`;
        } else if (status === "TERLAMBAT") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nMohon maaf, presensi Anda pada kegiatan *{nama_kegiatan}* tercatat *TERLAMBAT* di *{nama_sekolah}* pada pukul *{waktu}*, tanggal {tanggal}.\n\nMohon perhatian Bapak/Ibu untuk lebih disiplin dimasa mendatang. Terima kasih. 🙏`;
        } else if (status === "IZIN") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* tercatat *IZIN* di *{nama_sekolah}* pada tanggal {tanggal} (pukul {waktu}). Semoga aktivitas Bapak/Ibu berjalan lancar. 🙏`;
        } else if (status === "SAKIT") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* tercatat *SAKIT* di *{nama_sekolah}* pada tanggal {tanggal} (pukul {waktu}). Semoga lekas diberi kesembuhan. Aamiin. 🤲`;
        } else if (status === "DINAS_LUAR") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. Bapak/Ibu *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* tercatat *DINAS LUAR* di *{nama_sekolah}* pada tanggal {tanggal} (pukul {waktu}). Terima kasih atas tugas yang dijalankan. 🙏`;
        } else {
          content = `Yth. Bapak/Ibu *{nama}* ({jabatan}), presensi Anda pada kegiatan *{nama_kegiatan}* tercatat *${status}* di *{nama_sekolah}* tanggal {tanggal} (pukul {waktu}).`;
        }
      } else if (role === "KEPALA_SEKOLAH") {
        if (status === "HADIR") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. *{nama}* ({jabatan}),\n\nPresensi Anda pada kegiatan *{nama_kegiatan}* telah berhasil dicatat *HADIR* tepat waktu di *{nama_sekolah}* pada pukul *{waktu}*, tanggal {tanggal}.\n\nSelamat memimpin dan bertugas, terima kasih atas dedikasi Bapak/Ibu. 🙏`;
        } else if (status === "TERLAMBAT") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nYth. *{nama}* ({jabatan}),\n\nMohon maaf, presensi Anda pada kegiatan *{nama_kegiatan}* tercatat *TERLAMBAT* di *{nama_sekolah}* pada pukul *{waktu}*, tanggal {tanggal}.\n\nMohon perhatian Bapak/Ibu untuk lebih disiplin dimasa mendatang. Terima kasih. 🙏`;
        } else {
          content = `Yth. *{nama}* ({jabatan}), presensi Anda pada kegiatan *{nama_kegiatan}* tercatat *${status}* di *{nama_sekolah}* tanggal {tanggal} (pukul {waktu}).`;
        }
      } else {
        if (status === "HADIR") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nPresensi *{nama}* ({kelas}) tercatat *HADIR* pada kegiatan *{nama_kegiatan}* pukul *{waktu}*, tanggal {tanggal} di *{nama_sekolah}*.`;
        } else if (status === "TERLAMBAT") {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nPresensi *{nama}* ({kelas}) tercatat *TERLAMBAT* pada kegiatan *{nama_kegiatan}* pukul *{waktu}*, tanggal {tanggal} di *{nama_sekolah}*.`;
        } else {
          content = `*Assalamu'alaikum Wr. Wb.*\n\nPresensi *{nama}* ({kelas}) tercatat *${status}* pada kegiatan *{nama_kegiatan}* tanggal {tanggal} di *{nama_sekolah}*.`;
        }
      }

      await prisma.waTemplate.upsert({
        where: { role_status: { role, status } },
        update: { contentTemplate: content },
        create: { role, status, contentTemplate: content }
      });
    }
  }
  console.log("✅ Template WhatsApp berhasil dikonfigurasi");


  // 6. Konfigurasi WA Gateway Default
  await prisma.waGatewayConfig.create({
    data: {
      id: "default",
      provider: "FONNTE",
      fonnteEndpointUrl: "https://api.fonnte.com/send",
      isEnabled: false,
    },
  });
  console.log("✅ Konfigurasi WA Gateway default berhasil dibuat");

  // 7. Data Master Orang (Kepala Sekolah, Guru, Pegawai, Siswa)
  const peopleData = [
    // Kepala Sekolah
    {
      nisNip: "197103151998021003",
      name: "Drs. H. Bambang Sudirman, M.Pd.",
      role: "KEPALA_SEKOLAH",
      position: "Kepala Sekolah",
      phone: "081234567890",
      parentPhone: null,
      rfidUid: "KS1001",
      qrCodeToken: "QR-KS-197103151998021003",
      gender: "L",
    },
    // Guru
    {
      nisNip: "198204122005012002",
      name: "Siti Rahmawati, S.Pd.",
      role: "GURU",
      position: "Guru Matematika & Wali Kelas X-RPL-1",
      phone: "081234567891",
      parentPhone: null,
      rfidUid: "GURU1001",
      qrCodeToken: "QR-GURU-198204122005012002",
      gender: "P",
    },
    {
      nisNip: "198807212010011005",
      name: "Hendra Kurniawan, S.Kom.",
      role: "GURU",
      position: "Guru Produktif Rekayasa Perangkat Lunak",
      phone: "081234567892",
      parentPhone: null,
      rfidUid: "GURU1002",
      qrCodeToken: "QR-GURU-198807212010011005",
      gender: "L",
    },
    {
      nisNip: "197509182000032001",
      name: "Dra. Sri Wahyuni, M.Hum.",
      role: "GURU",
      position: "Guru Bahasa Indonesia & Pembina OSIS",
      phone: "081234567893",
      parentPhone: null,
      rfidUid: "GURU1003",
      qrCodeToken: "QR-GURU-197509182000032001",
      gender: "P",
    },
    // Pegawai
    {
      nisNip: "198501102014021001",
      name: "Agus Prasetyo, S.Sos.",
      role: "PEGAWAI",
      position: "Kepala Tata Usaha",
      phone: "081234567894",
      parentPhone: null,
      rfidUid: "STAF1001",
      qrCodeToken: "QR-STAF-198501102014021001",
      gender: "L",
    },
    {
      nisNip: "199008252019031002",
      name: "Rahmat Hidayat",
      role: "PEGAWAI",
      position: "Teknisi Laboratorium Komputer",
      phone: "081234567895",
      parentPhone: null,
      rfidUid: "STAF1002",
      qrCodeToken: "QR-STAF-199008252019031002",
      gender: "L",
    },
    // Siswa Kelas X-RPL-1
    {
      nisNip: "102401",
      name: "Ahmad Zaki Pratama",
      role: "SISWA",
      className: "X-RPL-1",
      phone: "082100010001",
      parentPhone: "081299990001",
      rfidUid: "SISWA1001",
      qrCodeToken: "QR-SISWA-102401",
      gender: "L",
    },
    {
      nisNip: "102402",
      name: "Annisa Larasati",
      role: "SISWA",
      className: "X-RPL-1",
      phone: "082100010002",
      parentPhone: "081299990002",
      rfidUid: "SISWA1002",
      qrCodeToken: "QR-SISWA-102402",
      gender: "P",
    },
    {
      nisNip: "102403",
      name: "Bagas Surya Ramadhan",
      role: "SISWA",
      className: "X-RPL-1",
      phone: "082100010003",
      parentPhone: "081299990003",
      rfidUid: "SISWA1003",
      qrCodeToken: "QR-SISWA-102403",
      gender: "L",
    },
    {
      nisNip: "102404",
      name: "Cantika Putri Azzahra",
      role: "SISWA",
      className: "X-RPL-1",
      phone: "082100010004",
      parentPhone: "081299990004",
      rfidUid: "SISWA1004",
      qrCodeToken: "QR-SISWA-102404",
      gender: "P",
    },
    {
      nisNip: "102405",
      name: "Dimas Arya Wijaya",
      role: "SISWA",
      className: "X-RPL-1",
      phone: "082100010005",
      parentPhone: "081299990005",
      rfidUid: "SISWA1005",
      qrCodeToken: "QR-SISWA-102405",
      gender: "L",
    },
    // Siswa Kelas XI-TKJ-1
    {
      nisNip: "112301",
      name: "Fajar Nugraha",
      role: "SISWA",
      className: "XI-TKJ-1",
      phone: "082100010006",
      parentPhone: "081299990006",
      rfidUid: "SISWA2001",
      qrCodeToken: "QR-SISWA-112301",
      gender: "L",
    },
    {
      nisNip: "112302",
      name: "Gita Nuraini",
      role: "SISWA",
      className: "XI-TKJ-1",
      phone: "082100010007",
      parentPhone: "081299990007",
      rfidUid: "SISWA2002",
      qrCodeToken: "QR-SISWA-112302",
      gender: "P",
    },
    {
      nisNip: "112303",
      name: "Hafiz Maulana",
      role: "SISWA",
      className: "XI-TKJ-1",
      phone: "082100010008",
      parentPhone: "081299990008",
      rfidUid: "SISWA2003",
      qrCodeToken: "QR-SISWA-112303",
      gender: "L",
    },
    {
      nisNip: "112304",
      name: "Indah Permatasari",
      role: "SISWA",
      className: "XI-TKJ-1",
      phone: "082100010009",
      parentPhone: "081299990009",
      rfidUid: "SISWA2004",
      qrCodeToken: "QR-SISWA-112304",
      gender: "P",
    },
    // Siswa Kelas XII-RPL-2
    {
      nisNip: "122201",
      name: "Kevin Jonathan",
      role: "SISWA",
      className: "XII-RPL-2",
      phone: "082100010010",
      parentPhone: "081299990010",
      rfidUid: "SISWA3001",
      qrCodeToken: "QR-SISWA-122201",
      gender: "L",
    },
    {
      nisNip: "122202",
      name: "Melani Safitri",
      role: "SISWA",
      className: "XII-RPL-2",
      phone: "082100010011",
      parentPhone: "081299990011",
      rfidUid: "SISWA3002",
      qrCodeToken: "QR-SISWA-122202",
      gender: "P",
    },
    {
      nisNip: "122203",
      name: "Muhammad Rizky",
      role: "SISWA",
      className: "XII-RPL-2",
      phone: "082100010012",
      parentPhone: "081299990012",
      rfidUid: "SISWA3003",
      qrCodeToken: "QR-SISWA-122203",
      gender: "L",
    },
    {
      nisNip: "122204",
      name: "Nabila Ayu Wardani",
      role: "SISWA",
      className: "XII-RPL-2",
      phone: "082100010013",
      parentPhone: "081299990013",
      rfidUid: "SISWA3004",
      qrCodeToken: "QR-SISWA-122204",
      gender: "P",
    },
    {
      nisNip: "122205",
      name: "Rizky Dwi Saputra",
      role: "SISWA",
      className: "XII-RPL-2",
      phone: "082100010014",
      parentPhone: "081299990014",
      rfidUid: "SISWA3005",
      qrCodeToken: "QR-SISWA-122205",
      gender: "L",
    },
  ];

  const createdPeople = [];
  for (const person of peopleData) {
    const created = await prisma.person.create({ data: person });
    createdPeople.push(created);
  }
  console.log(`✅ ${createdPeople.length} Data Orang (Kepsek, Guru, Staf, Siswa) berhasil dibuat`);

  // 8. Buat Sample Data Presensi Hari Ini (agar Dashboard langsung informatif dan hidup)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const sampleAttendances = [
    // Hadir tepat waktu (RFID)
    {
      personId: createdPeople[0].id, // Kepsek
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "06:35:10",
      status: "HADIR",
      method: "RFID",
    },
    {
      personId: createdPeople[1].id, // Bu Siti (Guru)
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "06:42:15",
      status: "HADIR",
      method: "RFID",
    },
    {
      personId: createdPeople[2].id, // Pak Hendra (Guru)
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "06:55:40",
      status: "HADIR",
      method: "QR",
    },
    {
      personId: createdPeople[4].id, // Agus (Pegawai)
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "06:48:20",
      status: "HADIR",
      method: "RFID",
    },
    {
      personId: createdPeople[6].id, // Ahmad Zaki (Siswa)
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "06:40:05",
      status: "HADIR",
      method: "RFID",
    },
    {
      personId: createdPeople[7].id, // Annisa (Siswa)
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "06:45:30",
      status: "HADIR",
      method: "RFID",
    },
    {
      personId: createdPeople[8].id, // Bagas (Siswa) - Terlambat
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "07:22:15",
      status: "TERLAMBAT",
      method: "RFID",
      remarks: "Terlambat 7 menit dari batas toleransi",
    },
    {
      personId: createdPeople[9].id, // Cantika (Siswa) - Terlambat
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "07:28:40",
      status: "TERLAMBAT",
      method: "QR",
      remarks: "Kendala transportasi",
    },
    {
      personId: createdPeople[10].id, // Dimas (Siswa) - Izin via Manual Input
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "07:05:00",
      status: "IZIN",
      method: "MANUAL",
      remarks: "Izin mengikuti lomba sains tingkat kota",
      recordedByAdminId: superAdmin.id,
    },
    {
      personId: createdPeople[11].id, // Fajar (Siswa) - Sakit via Manual Input
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "07:10:00",
      status: "SAKIT",
      method: "MANUAL",
      remarks: "Surat dokter terlampir demam",
      recordedByAdminId: operator.id,
    },
    {
      personId: createdPeople[15].id, // Kevin (Siswa XII)
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "06:50:12",
      status: "HADIR",
      method: "RFID",
    },
    {
      personId: createdPeople[16].id, // Melani (Siswa XII)
      activityId: activityMasuk.id,
      dateString: todayStr,
      timeString: "06:52:45",
      status: "HADIR",
      method: "RFID",
    },
  ];

  for (const att of sampleAttendances) {
    await prisma.attendanceRecord.create({
      data: {
        ...att,
        waNotificationSent: true,
        waNotificationStatus: "SENT",
      },
    });
  }
  console.log(`✅ ${sampleAttendances.length} Contoh presensi hari ini (${todayStr}) berhasil dibuat`);

  // 9. Buat Contoh Audit Log
  await prisma.auditLog.create({
    data: {
      adminId: superAdmin.id,
      adminName: superAdmin.name,
      action: "SYSTEM_INITIALIZE",
      target: "SYSTEM",
      details: "Inisialisasi sistem presensi dan data awal sekolah",
    },
  });
  console.log("✅ Log audit awal berhasil dicatat");

  console.log("\n🎉 SEED DATABASE SELESAI!");
  console.log("==========================================");
  console.log("👤 Akun Super Admin: admin / admin123");
  console.log("👤 Akun Operator   : operator / operator123");
  console.log("💳 Contoh Kartu RFID Siap Tap:");
  console.log("   - SISWA1001 (Ahmad Zaki Pratama)");
  console.log("   - SISWA1002 (Annisa Larasati)");
  console.log("   - GURU1001  (Siti Rahmawati, S.Pd.)");
  console.log("   - KS1001    (Kepala Sekolah)");
  console.log("==========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
