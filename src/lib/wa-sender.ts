import { prisma } from "./prisma";
import { parseWaTemplate } from "./template-parser";
import { formatDateIndo } from "./date-utils";

export function formatPhoneNumber(phone: string): string {
  // Bersihkan karakter non-digit
  let cleaned = phone.replace(/\D/g, "");
  // Jika diawali 0, ganti dengan 62
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

export interface SendResult {
  success: boolean;
  message: string;
  response?: any;
}

export interface AttendanceNotificationOptions {
  source?: "AUTOMATIC" | "MANUAL" | "RETRY" | "IZIN_ONLINE";
  retryOfId?: string;
}

export interface AttendanceNotificationResult extends SendResult {
  notificationLogId?: string;
}

export async function sendDirectWaMessage(
  targetPhone: string,
  messageContent: string,
  configOverride?: any
): Promise<SendResult> {
  const config =
    configOverride ||
    (await prisma.waGatewayConfig.findUnique({
      where: { id: "default" },
    }));

  if (!config || (!configOverride && !config.isEnabled)) {
    return {
      success: false,
      message: "Gateway WhatsApp tidak aktif atau belum dikonfigurasi.",
    };
  }

  const formattedTarget = formatPhoneNumber(targetPhone);

  try {
    if (config.provider === "FONNTE") {
      if (!config.fonnteApiKey) {
        return { success: false, message: "API Key Fonnte belum diisi." };
      }

      const res = await fetch(config.fonnteEndpointUrl || "https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: config.fonnteApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedTarget,
          message: messageContent,
          countryCode: "62",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && (json.status === true || json.status === "true")) {
        return { success: true, message: "Pesan WhatsApp terkirim via Fonnte", response: json };
      }
      return {
        success: false,
        message: json.reason || json.message || `Fonnte Error: HTTP ${res.status}`,
        response: json,
      };
    }

    if (config.provider === "SAUNGWA") {
      if (!config.saungwaApiKey) {
        return { success: false, message: "API Key SaungWA belum diisi." };
      }
      if (!config.saungwaAuthKey) {
        return { success: false, message: "Auth Key SaungWA belum diisi." };
      }

      // SaungWA menggunakan form-data dengan field: appkey, authkey, to, message
      const formData = new URLSearchParams();
      formData.append("appkey", config.saungwaApiKey);
      formData.append("authkey", config.saungwaAuthKey);
      formData.append("to", formattedTarget);
      formData.append("message", messageContent);
      if (config.saungwaSenderNumber) {
        formData.append("sender", config.saungwaSenderNumber);
      }

      const res = await fetch(
        config.saungwaEndpointUrl || "https://app.saungwa.com/api/create-message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      const json = await res.json().catch(() => ({}));
      
      // SaungWA mengembalikan object { status: true/false, message: "..." } 
      if (res.ok && json && (json.status === true || json.status === "true")) {
        return { success: true, message: "Pesan WhatsApp terkirim via SaungWA", response: json };
      }
      return {
        success: false,
        message: json?.message || json?.error || (json?.errors && typeof json.errors === "object" ? JSON.stringify(json.errors) : null) || `SaungWA Error: HTTP ${res.status}`,
        response: json,
      };
    }

    // Generic Custom Provider
    if (config.provider === "CUSTOM") {
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.customHeadersJson) {
        try {
          const parsedHeaders = JSON.parse(config.customHeadersJson);
          headers = { ...headers, ...parsedHeaders };
        } catch {}
      }

      let url = config.customEndpointUrl;
      const method = (config.customMethod || "POST").toUpperCase();

      if (method === "GET") {
        const u = new URL(url);
        u.searchParams.set("target", formattedTarget);
        u.searchParams.set("message", messageContent);
        if (config.customApiKey) u.searchParams.set("api_key", config.customApiKey);

        const res = await fetch(u.toString(), { method: "GET", headers });
        const text = await res.text();
        return {
          success: res.ok,
          message: res.ok ? "Pesan terkirim via Custom Gateway" : `Error HTTP ${res.status}`,
          response: text,
        };
      } else {
        let body: any = {
          target: formattedTarget,
          phone: formattedTarget,
          number: formattedTarget,
          message: messageContent,
        };

        if (config.customApiKey) body.api_key = config.customApiKey;

        if (config.customBodyMappingJson) {
          try {
            let replaced = config.customBodyMappingJson
              .replace(/\{target\}/g, formattedTarget)
              .replace(/\{phone\}/g, formattedTarget)
              .replace(/\{message\}/g, messageContent);
            body = JSON.parse(replaced);
          } catch {}
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const text = await res.text();
        return {
          success: res.ok,
          message: res.ok ? "Pesan terkirim via Custom Gateway" : `Error HTTP ${res.status}`,
          response: text,
        };
      }
    }

    return { success: false, message: `Provider ${config.provider} tidak dikenal.` };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal mengirim WhatsApp: ${err?.message || "Koneksi terputus"}`,
    };
  }
}

export async function processAutomaticAttendanceNotification(
  attendanceId: string,
  options: AttendanceNotificationOptions = {}
): Promise<AttendanceNotificationResult> {
  let notificationLogId: string | null = null;
  let result: SendResult = {
    success: false,
    message: "Notifikasi belum diproses.",
  };

  try {
    const [attendance, school, config] = await Promise.all([
      prisma.attendanceRecord.findUnique({
        where: { id: attendanceId },
        include: { person: true, activity: true },
      }),
      prisma.schoolSetting.findUnique({ where: { id: "default" } }),
      prisma.waGatewayConfig.findUnique({ where: { id: "default" } }),
    ]);

    if (!attendance) {
      return { success: false, message: "Data presensi tidak ditemukan." };
    }

    const targetPhone =
      attendance.person.role === "SISWA"
        ? attendance.person.parentPhone || attendance.person.phone
        : attendance.person.phone;

    let template = await prisma.waTemplate.findUnique({
      where: {
        role_status: {
          role: attendance.person.role,
          status: attendance.status,
        },
      },
    });

    if (!template) {
      template = await prisma.waTemplate.findUnique({
        where: {
          role_status: { role: "ALL", status: attendance.status },
        },
      });
    }

    const defaultTemplate =
      "Pemberitahuan: {nama} ({kelas}) tercatat {status} pada {nama_kegiatan} tanggal {tanggal} pukul {waktu} di {nama_sekolah}.";
    const messageText = parseWaTemplate(
      template?.contentTemplate || defaultTemplate,
      {
        nama: attendance.person.name,
        nis: attendance.person.nisNip,
        nip: attendance.person.nisNip,
        kelas: attendance.person.className || "",
        jabatan: attendance.person.position || attendance.person.role,
        waktu: attendance.timeString,
        tanggal: formatDateIndo(attendance.dateString),
        status: attendance.status,
        nama_kegiatan: attendance.activity.name,
        nama_sekolah: school?.name || "Sekolah",
      }
    );

    const latestAttempt = await prisma.notificationLog.aggregate({
      where: { attendanceId },
      _max: { attempt: true },
    });
    const notification = await prisma.notificationLog.create({
      data: {
        attendanceId,
        channel: "WHATSAPP",
        status: "PENDING",
        source: options.source || attendance.method,
        attempt: (latestAttempt._max.attempt || 0) + 1,
        provider: config?.provider,
        targetPhone,
        messageContent: messageText,
        retryOfId: options.retryOfId,
      },
    });
    notificationLogId = notification.id;

    await prisma.attendanceRecord.update({
      where: { id: attendanceId },
      data: {
        waNotificationSent: false,
        waNotificationStatus: "PENDING",
      },
    });

    if (!config || !config.isEnabled) {
      result = {
        success: false,
        message: "Gateway WhatsApp tidak aktif atau belum dikonfigurasi.",
      };
    } else if (!targetPhone) {
      result = {
        success: false,
        message: "Nomor WhatsApp tujuan tidak tersedia.",
      };
    } else {
      result = await sendDirectWaMessage(targetPhone, messageText, config);
    }
  } catch (error: any) {
    result = {
      success: false,
      message: `Gagal memproses notifikasi WhatsApp: ${error?.message || "koneksi terputus"}`,
    };
  }

  const completedAt = new Date();
  try {
    if (notificationLogId) {
      await prisma.$transaction([
        prisma.notificationLog.update({
          where: { id: notificationLogId },
          data: {
            status: result.success ? "SENT" : "FAILED",
            deliveryMessage: result.message,
            errorMessage: result.success ? null : result.message,
            sentAt: result.success ? completedAt : null,
            completedAt,
          },
        }),
        prisma.attendanceRecord.update({
          where: { id: attendanceId },
          data: {
            waNotificationSent: result.success,
            waNotificationStatus: result.success ? "SENT" : "FAILED",
          },
        }),
      ]);
    } else {
      await prisma.attendanceRecord.update({
        where: { id: attendanceId },
        data: {
          waNotificationSent: false,
          waNotificationStatus: "FAILED",
        },
      });
    }
  } catch (error: any) {
    console.error("Gagal menyimpan status notifikasi WhatsApp:", error);
    result = {
      ...result,
      message: `${result.message} Gagal menyimpan status riwayat: ${error?.message || "koneksi terputus"}`,
    };
  }

  return { ...result, notificationLogId: notificationLogId || undefined };
}
