import "server-only";

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getPublicKeyAsync, signAsync, utils } from "@noble/ed25519";

import {
  resolveDefaultOpenClawDeviceIdentityPath,
  resolveDefaultOpenClawDeviceTokenPath,
} from "./openClawRuntimeRoot";

export type OpenClawDeviceIdentity = {
  deviceId: string;
  /** base64url-encoded Ed25519 public key bytes (no padding). */
  publicKey: string;
  /** base64url-encoded Ed25519 private key/seed bytes (no padding). */
  privateKey: string;
};

export type OpenClawDeviceIdentityLoadResult = {
  identity: OpenClawDeviceIdentity;
  loadedFromDisk: boolean;
  identityPath: string;
};

type PersistedIdentityV1 = {
  version: 1;
  deviceId: string;
  publicKey: string;
  privateKey: string;
  createdAtMs: number;
};

type PersistedDeviceTokenV1 = {
  version: 1;
  deviceId: string;
  tokens: Record<
    string,
    {
      token: string;
      scopes?: string[];
      storedAtMs: number;
    }
  >;
};

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed : undefined;
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return new Uint8Array(Buffer.from(padded, "base64"));
}

function fingerprintPublicKey(publicKeyBytes: Uint8Array): string {
  const hash = createHash("sha256").update(publicKeyBytes).digest();
  return Buffer.from(hash).toString("hex");
}

function resolveIdentityPath(): string {
  return getEnv("OPENCLAW_DEVICE_IDENTITY_PATH") ?? resolveDefaultOpenClawDeviceIdentityPath();
}

function resolveDeviceTokenPath(): string {
  return getEnv("OPENCLAW_DEVICE_TOKEN_PATH") ?? resolveDefaultOpenClawDeviceTokenPath();
}

export async function loadOrCreateOpenClawDeviceIdentity(): Promise<OpenClawDeviceIdentityLoadResult> {
  const identityPath = resolveIdentityPath();
  let loadedFromDisk = false;

  try {
    const raw = await fs.readFile(identityPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedIdentityV1>;
    if (
      parsed?.version === 1 &&
      typeof parsed.deviceId === "string" &&
      typeof parsed.publicKey === "string" &&
      typeof parsed.privateKey === "string" &&
      typeof parsed.createdAtMs === "number"
    ) {
      // Defensive: verify the derived fingerprint matches the stored deviceId.
      const derived = fingerprintPublicKey(base64UrlDecode(parsed.publicKey));
      if (derived !== parsed.deviceId) {
        // If the file was manually edited or inconsistent, regenerate rather than failing silently.
        // (Better a safe reconnect failure than signing with an identity the gateway rejects.)
        throw new Error("DeviceId fingerprint mismatch; regenerating identity.");
      }
      loadedFromDisk = true;
      return {
        identity: {
          deviceId: parsed.deviceId,
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey,
        },
        loadedFromDisk,
        identityPath,
      };
    }
  } catch {
    // Fall through to regeneration.
  }

  // Generate a new Ed25519 identity (persisted server-side only).
  // `@noble/ed25519` uses `randomPrivateKey()` (32-byte seed/secret key).
  const privateKeyBytes = utils.randomPrivateKey(); // seed
  const publicKeyBytes = await getPublicKeyAsync(privateKeyBytes);

  const deviceId = fingerprintPublicKey(publicKeyBytes);
  const publicKey = base64UrlEncode(publicKeyBytes);
  const privateKey = base64UrlEncode(privateKeyBytes);

  const persisted: PersistedIdentityV1 = {
    version: 1,
    deviceId,
    publicKey,
    privateKey,
    createdAtMs: Date.now(),
  };

  await fs.mkdir(path.dirname(identityPath), { recursive: true });
  await fs.writeFile(identityPath, JSON.stringify(persisted, null, 2), "utf8");

  return {
    identity: { deviceId, publicKey, privateKey },
    loadedFromDisk: false,
    identityPath,
  };
}

export async function loadOpenClawDeviceToken(params: {
  deviceId: string;
  role: string;
}): Promise<string | undefined> {
  const tokenPath = resolveDeviceTokenPath();
  try {
    const raw = await fs.readFile(tokenPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedDeviceTokenV1>;
    if (parsed?.version !== 1) return undefined;
    if (typeof parsed?.deviceId !== "string") return undefined;
    if (parsed.deviceId !== params.deviceId) return undefined;
    const entry = parsed.tokens?.[params.role];
    if (!entry || typeof entry.token !== "string" || entry.token.trim() === "") return undefined;
    return entry.token;
  } catch {
    return undefined;
  }
}

export async function storeOpenClawDeviceToken(params: {
  deviceId: string;
  role: string;
  token: string;
  scopes?: string[];
}): Promise<void> {
  const tokenPath = resolveDeviceTokenPath();
  const existing = await (async () => {
    try {
      const raw = await fs.readFile(tokenPath, "utf8");
      const parsed = JSON.parse(raw) as PersistedDeviceTokenV1;
      if (parsed?.version === 1 && parsed.deviceId === params.deviceId && parsed.tokens) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  })();

  const out: PersistedDeviceTokenV1 = {
    version: 1,
    deviceId: params.deviceId,
    tokens: {
      ...(existing?.tokens ?? {}),
      [params.role]: {
        token: params.token,
        scopes: params.scopes,
        storedAtMs: Date.now(),
      },
    },
  };

  await fs.mkdir(path.dirname(tokenPath), { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(out, null, 2), "utf8");
}

export async function signDevicePayload(privateKeyBase64Url: string, payload: string): Promise<string> {
  const privateKeyBytes = base64UrlDecode(privateKeyBase64Url);
  const data = new TextEncoder().encode(payload);

  // Signature returned as Uint8Array bytes, then encoded as base64url for the gateway.
  const signatureBytes = await signAsync(data, privateKeyBytes);
  return base64UrlEncode(signatureBytes);
}

