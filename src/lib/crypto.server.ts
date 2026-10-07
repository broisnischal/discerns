import "@tanstack/react-start/server-only";

// AES-256-GCM with a key from the ENCRYPTION_KEY secret (32 random bytes, base64).
// Stored format: base64(iv) + "." + base64(ciphertext)

const keys = new Map<string, Promise<CryptoKey>>();

function importKey(secret: string) {
  let key = keys.get(secret);
  if (!key) {
    const raw = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
    if (raw.byteLength !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64 encoded");
    key = crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
    keys.set(secret, key);
  }
  return key;
}

function toBase64(bytes: Uint8Array) {
  // Chunked so large payloads don't overflow the argument limit of fromCharCode.
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export async function encrypt(plaintext: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importKey(secret),
    new TextEncoder().encode(plaintext),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decrypt(stored: string, secret: string) {
  const [iv, ciphertext] = stored.split(".");
  if (!iv || !ciphertext) throw new Error("Malformed ciphertext");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    await importKey(secret),
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}
