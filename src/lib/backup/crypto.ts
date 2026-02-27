/**
 * Backup crypto — key generation, hybrid encryption, decryption.
 * Pattern: Utility module (pure functions, no state).
 *
 * Encryption scheme:
 *   RSA-OAEP-4096 wraps a per-archive AES-256-GCM key.
 *   Output format: [4-byte LE key length][encrypted AES key][12-byte IV][ciphertext]
 *
 * Keys are hex-encoded for storage and CLI display.
 */

// ---- Hex helpers --------------------------------------------------------

export function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBuffer(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// ---- RSA-OAEP key params ------------------------------------------------

const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

// ---- Key generation & export --------------------------------------------

export interface HexKeyPair {
  publicKeyHex: string;
  privateKeyHex: string;
}

/** Generate a new RSA-OAEP-4096 key pair and export both keys as hex. */
export async function generateKeyPair(): Promise<HexKeyPair> {
  const keyPair = await crypto.subtle.generateKey(RSA_PARAMS, true, [
    "encrypt",
    "decrypt",
  ]);

  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKeyHex: bufferToHex(spki),
    privateKeyHex: bufferToHex(pkcs8),
  };
}

// ---- Key import ---------------------------------------------------------

async function importPublicKey(hex: string): Promise<CryptoKey> {
  const buf = hexToBuffer(hex);
  return crypto.subtle.importKey(
    "spki",
    buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

async function importPrivateKey(hex: string): Promise<CryptoKey> {
  const buf = hexToBuffer(hex);
  return crypto.subtle.importKey(
    "pkcs8",
    buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
}

// ---- Encryption ---------------------------------------------------------

/**
 * Encrypt `data` with a fresh AES-256-GCM key, then RSA-OAEP wrap that key.
 *
 * Output layout:
 *   Bytes 0-3:       uint32 LE — length of the encrypted AES key
 *   Bytes 4-N:       RSA-OAEP encrypted AES key
 *   Bytes N+1-N+12:  AES-GCM IV (12 bytes, random)
 *   Bytes N+13+:     AES-GCM ciphertext
 */
export async function encryptPayload(
  publicKeyHex: string,
  data: Uint8Array,
): Promise<Uint8Array> {
  const rsaPublicKey = await importPublicKey(publicKeyHex);

  // Generate ephemeral AES-256-GCM key
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  );
  const rawAes = await crypto.subtle.exportKey("raw", aesKey);

  // Encrypt AES key with RSA-OAEP
  const encryptedAesKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPublicKey,
    rawAes,
  );

  // Encrypt payload with AES-GCM
  // Copy data into a guaranteed ArrayBuffer-backed Uint8Array for Web Crypto compat
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dataCopy = new Uint8Array(data.length);
  dataCopy.set(data);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    dataCopy,
  );

  // Assemble output
  const encKeyBytes = new Uint8Array(encryptedAesKey);
  const keyLenBuf = new Uint8Array(4);
  new DataView(keyLenBuf.buffer).setUint32(0, encKeyBytes.length, true);

  const totalLen = 4 + encKeyBytes.length + 12 + ciphertext.byteLength;
  const out = new Uint8Array(totalLen);
  let offset = 0;
  out.set(keyLenBuf, offset);
  offset += 4;
  out.set(encKeyBytes, offset);
  offset += encKeyBytes.length;
  out.set(iv, offset);
  offset += 12;
  out.set(new Uint8Array(ciphertext), offset);

  return out;
}

// ---- Decryption ---------------------------------------------------------

/**
 * Decrypt data produced by `encryptPayload`.
 * Caller supplies the hex-encoded PKCS8 private key.
 */
export async function decryptPayload(
  privateKeyHex: string,
  data: Uint8Array,
): Promise<Uint8Array> {
  if (data.length < 4) throw new Error("Invalid encrypted payload");

  const rsaPrivateKey = await importPrivateKey(privateKeyHex);

  let offset = 0;
  const keyLen = new DataView(data.buffer, data.byteOffset).getUint32(
    offset,
    true,
  );
  offset += 4;

  if (data.length < 4 + keyLen + 12) throw new Error("Truncated payload");

  const encryptedAesKey = data.slice(offset, offset + keyLen);
  offset += keyLen;

  const iv = data.slice(offset, offset + 12);
  offset += 12;

  const ciphertext = data.slice(offset);

  // Decrypt AES key
  const rawAes = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    rsaPrivateKey,
    encryptedAesKey,
  );

  // Import AES key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Decrypt payload
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext,
  );

  return new Uint8Array(plaintext);
}
