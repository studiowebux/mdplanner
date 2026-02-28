/**
 * Symmetric AES-256-GCM secret encryption for integration tokens.
 * Pattern: Utility module (pure functions, no state).
 *
 * When MDPLANNER_SECRET_KEY is set (32-byte hex), secrets are stored as:
 *   enc:gcm:<base64-iv>:<base64-ciphertext>
 *
 * When the env var is not set, secrets are stored in plaintext.
 * Migration: re-save the token after setting the key.
 */

const SECRET_PREFIX = "enc:gcm:";
const KEY_ENV = "MDPLANNER_SECRET_KEY";

// ---- Helpers ------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function deriveKey(hexKey: string): Promise<CryptoKey> {
  const raw = hexToBytes(hexKey);
  if (raw.length !== 32) {
    throw new Error("MDPLANNER_SECRET_KEY must be 32 bytes (64 hex chars)");
  }
  return crypto.subtle.importKey(
    "raw",
    raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength,
    ) as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

// ---- Public API ---------------------------------------------------------

/**
 * Returns true when an encryption key is configured in the environment.
 */
export function isEncryptionEnabled(): boolean {
  const key = Deno.env.get(KEY_ENV);
  return !!key && key.length === 64;
}

/**
 * Generate a new random 32-byte hex key. Prints to stdout.
 * Used by the `keygen-secret` CLI subcommand.
 */
export function generateSecretKey(): string {
  const buf = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Encrypt a plaintext string.
 * Returns `enc:gcm:<base64-iv>:<base64-ct>` or the original value if no key is set.
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  const hexKey = Deno.env.get(KEY_ENV);
  if (!hexKey) return plaintext;

  const key = await deriveKey(hexKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded.buffer.slice(
      encoded.byteOffset,
      encoded.byteOffset + encoded.byteLength,
    ) as ArrayBuffer,
  );

  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ct)));
  return `${SECRET_PREFIX}${ivB64}:${ctB64}`;
}

/**
 * Decrypt a secret string.
 * Handles both encrypted (`enc:gcm:...`) and plaintext values transparently.
 * Returns null if decryption fails.
 */
export async function decryptSecret(stored: string): Promise<string | null> {
  if (!stored.startsWith(SECRET_PREFIX)) {
    // Plaintext — return as-is
    return stored;
  }

  const hexKey = Deno.env.get(KEY_ENV);
  if (!hexKey) {
    // Stored as encrypted but no key — cannot decrypt
    return null;
  }

  try {
    const rest = stored.slice(SECRET_PREFIX.length);
    const colonIdx = rest.indexOf(":");
    if (colonIdx === -1) return null;

    const ivB64 = rest.slice(0, colonIdx);
    const ctB64 = rest.slice(colonIdx + 1);

    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));

    const key = await deriveKey(hexKey);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ct.buffer.slice(
        ct.byteOffset,
        ct.byteOffset + ct.byteLength,
      ) as ArrayBuffer,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
