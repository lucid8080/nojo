import "server-only";

export type DeviceAuthPayloadV2Params = {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce: string;
};

/**
 * OpenClaw device auth payload format (v2).
 *
 * NOTE: This must match OpenClaw gateway/server reconstruction exactly:
 * - `v2` scheme prefix
 * - `|` delimiter between fields
 * - scopes are a comma-joined string
 * - `token` becomes empty string when null/undefined
 */
export function buildDeviceAuthPayloadV2(params: DeviceAuthPayloadV2Params): string {
  const scopes = params.scopes.join(",");
  const token = params.token ?? "";

  return [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
    params.nonce,
  ].join("|");
}

