export const WA_PROVIDER_CODES = ["FONNTE", "SAUNGWA", "CUSTOM"] as const;
export type WaProviderCode = (typeof WA_PROVIDER_CODES)[number];

export interface WaGatewayConfigLike {
  provider?: string | null;
  isEnabled?: boolean | null;
  fonnteApiKey?: string | null;
  saungwaApiKey?: string | null;
  saungwaAuthKey?: string | null;
  customEndpointUrl?: string | null;
  customName?: string | null;
  updatedAt?: Date | string | null;
}

export function normalizeWaProvider(value?: string | null): string {
  const provider = String(value || "FONNTE").trim().toUpperCase();
  return provider || "FONNTE";
}

export function getWaProviderLabel(
  provider?: string | null,
  config?: Pick<WaGatewayConfigLike, "customName"> | null
): string {
  if (!provider) return "Belum ditentukan";
  const normalized = normalizeWaProvider(provider);
  if (normalized === "FONNTE") return "Fonnte";
  if (normalized === "SAUNGWA") return "SaungWA";
  if (normalized === "CUSTOM") return config?.customName?.trim() || "Custom Gateway";
  return normalized;
}

export function isWaProviderConfigured(config?: WaGatewayConfigLike | null): boolean {
  if (!config) return false;
  const provider = normalizeWaProvider(config.provider);
  if (provider === "FONNTE") return Boolean(config.fonnteApiKey?.trim());
  if (provider === "SAUNGWA") {
    return Boolean(config.saungwaApiKey?.trim() && config.saungwaAuthKey?.trim());
  }
  if (provider === "CUSTOM") return Boolean(config.customEndpointUrl?.trim());
  return false;
}

export function getWaGatewaySnapshot(config?: WaGatewayConfigLike | null) {
  return {
    provider: config ? normalizeWaProvider(config.provider) : null,
    label: config ? getWaProviderLabel(config.provider, config) : null,
    isEnabled: Boolean(config?.isEnabled),
    isConfigured: isWaProviderConfigured(config),
    updatedAt: config?.updatedAt || null,
  };
}

export function evaluateSaungWaResponse(httpStatus: number, payload: any) {
  const messageStatus = String(payload?.message_status ?? payload?.messageStatus ?? "").trim();
  const statusValue = String(payload?.status ?? payload?.code ?? "").trim();
  const dataStatusRaw = payload?.data?.status_code ?? payload?.status_code ?? payload?.statusCode;
  const dataStatus = dataStatusRaw === null || dataStatusRaw === undefined || dataStatusRaw === "" ? Number.NaN : Number(dataStatusRaw);
  const responseMessage = String(
    payload?.message || payload?.error || payload?.reason || payload?.data?.message || ""
  ).trim();
  const searchable = `${messageStatus} ${statusValue} ${responseMessage}`.toLowerCase();

  const explicitFailure =
    payload?.success === false ||
    payload?.data?.success === false ||
    ["false", "failed", "fail", "error", "gagal", "denied", "forbidden", "unauthorized", "invalid"].includes(
      messageStatus.toLowerCase()
    ) ||
    ["false", "failed", "fail", "error", "gagal"].includes(statusValue.toLowerCase()) ||
    (Number.isFinite(dataStatus) && (dataStatus < 200 || dataStatus >= 300)) ||
    /\b(gagal|error|failed|failure|denied|forbidden|unauthorized|invalid)\b/.test(searchable);

  const success = httpStatus >= 200 && httpStatus < 300 && !explicitFailure;
  const detail =
    responseMessage ||
    messageStatus ||
    statusValue ||
    (Number.isFinite(dataStatus) ? `status_code ${dataStatus}` : "");

  return { success, detail, httpStatus, dataStatus: Number.isFinite(dataStatus) ? dataStatus : null };
}