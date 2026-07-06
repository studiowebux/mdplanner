/**
 * Unit tests for src/utils/secrets.ts — AES-256-GCM token encryption with
 * transparent plaintext fallback when MDPLANNER_SECRET_KEY is unset.
 *
 * Each test saves and restores the env var so global state never leaks between
 * tests or files. Requires --allow-env (the suite runs with it).
 */

import { assert, assertEquals } from "@std/assert";
import {
  decryptSecret,
  encryptSecret,
  getCookieSecret,
} from "../../src/utils/secrets.ts";

const KEY_ENV = "MDPLANNER_SECRET_KEY";
const HEX_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex = 32 bytes

/** Run `fn` with the env var forced to `value` (or deleted when null). */
async function withEnv(value: string | null, fn: () => Promise<void>) {
  const original = Deno.env.get(KEY_ENV);
  if (value === null) Deno.env.delete(KEY_ENV);
  else Deno.env.set(KEY_ENV, value);
  try {
    await fn();
  } finally {
    if (original === undefined) Deno.env.delete(KEY_ENV);
    else Deno.env.set(KEY_ENV, original);
  }
}

Deno.test("getCookieSecret — reflects the env var, empty when unset", async () => {
  await withEnv(null, () => {
    assertEquals(getCookieSecret(), "");
    return Promise.resolve();
  });
  await withEnv(HEX_KEY, () => {
    assertEquals(getCookieSecret(), HEX_KEY);
    return Promise.resolve();
  });
});

Deno.test("encrypt/decrypt — round-trips with a key set", async () => {
  await withEnv(HEX_KEY, async () => {
    const enc = await encryptSecret("super-secret-token");
    assert(enc.startsWith("enc:gcm:"));
    assert(enc !== "super-secret-token");
    assertEquals(await decryptSecret(enc), "super-secret-token");
  });
});

Deno.test("encrypt — random IV makes ciphertexts differ but both decrypt equal", async () => {
  await withEnv(HEX_KEY, async () => {
    const a = await encryptSecret("same");
    const b = await encryptSecret("same");
    assert(a !== b); // different IV → different ciphertext
    assertEquals(await decryptSecret(a), "same");
    assertEquals(await decryptSecret(b), "same");
  });
});

Deno.test("encrypt/decrypt — no key: transparent plaintext passthrough", async () => {
  await withEnv(null, async () => {
    const enc = await encryptSecret("plain");
    assertEquals(enc, "plain"); // not encrypted
    assertEquals(await decryptSecret("plain"), "plain");
  });
});

Deno.test("decryptSecret — corrupted ciphertext returns null", async () => {
  await withEnv(HEX_KEY, async () => {
    assertEquals(await decryptSecret("enc:gcm:bad:dGFtcGVyZWQ="), null);
    assertEquals(await decryptSecret("enc:gcm:missingcolon"), null);
  });
});

Deno.test("decryptSecret — encrypted value with no key yields null", async () => {
  // Encrypt with the key, then attempt decryption with the key removed.
  let enc = "";
  await withEnv(HEX_KEY, async () => {
    enc = await encryptSecret("secret");
  });
  await withEnv(null, async () => {
    assertEquals(await decryptSecret(enc), null);
  });
});

Deno.test("decryptSecret — non-prefixed string is treated as plaintext", async () => {
  await withEnv(HEX_KEY, async () => {
    assertEquals(await decryptSecret("just-plaintext"), "just-plaintext");
  });
});
