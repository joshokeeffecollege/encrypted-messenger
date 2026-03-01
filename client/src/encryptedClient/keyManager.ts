import {
  PrivateKey,
  SignedPreKeyRecord,
  PreKeyRecord,
} from "@signalapp/libsignal-client";

// Store keys in localStorage
const STORAGE_PREFIX = "signal";

// Convert keys to base64 for storage
function keyName(userId: string, name: string) {
  return `${STORAGE_PREFIX}:${userId}:${name}`;
}

// Convert Uint8Array to base64
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// Convert base64 to Uint8Array
export function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// Public key bundle returned to server
export interface PublicKeyBundle {
  registrationId: number;

  // Identity key (long-term)
  identityKey: string;

  // Signed pre-key (medium-term)
  signedPreKey: {
    id: number;
    publicKey: string;
    signature: string;
  };

  // Pre-keys (one-time)
  preKeys: {
    id: number;
    publicKey: string;
  }[];
}

// Checks if keys exist for a user
export function hasKeys(userId: string): boolean {
  return !!localStorage.getItem(keyName(userId, "identityPrivate"));
}

// Generate and store keys for a user
export async function generateAndStoreKeys(
  userId: string,
): Promise<PublicKeyBundle> {
  // Prevent regenerating keys if they already exist
  if (hasKeys(userId)) {
    throw new Error("Keys already exist for this user");
  }

  // Generate identity keys
  const identityPriv = PrivateKey.generate();
  const identityPub = identityPriv.getPublicKey();

  // Generate registration ID
  const registrationId = Math.floor(Math.random() * 16383) + 1;

  // Store private keys in localStorage
  localStorage.setItem(
    keyName(userId, "identityPrivate"),
    toBase64(identityPriv.serialize()),
  );

  localStorage.setItem(
    keyName(userId, "registrationId"),
    registrationId.toString(),
  );

  // Create signed prekeys
  const signedPreKeyId = 1;
  const signedPreKeyPriv = PrivateKey.generate();
  const signedPreKeyPub = signedPreKeyPriv.getPublicKey();

  const signature = identityPriv.sign(signedPreKeyPub.serialize());

  const signedPreKeyRecord = SignedPreKeyRecord.new(
    signedPreKeyId,
    Date.now(),
    signedPreKeyPub,
    signedPreKeyPriv,
    signature,
  );

  // Store signed prekey private record
  localStorage.setItem(
    keyName(userId, "signedPreKey"),
    toBase64(signedPreKeyRecord.serialize()),
  );

  // Create one-time prekeys
  const preKeys: {
    id: number;
    publicKey: string;
  }[] = [];

  for (let i = 1; i < 10; i++) {
    const preKeyPriv = PrivateKey.generate();
    const preKeyPub = preKeyPriv.getPublicKey();

    // Create libsignal PreKeyRecord for storage
    const record = PreKeyRecord.new(i, preKeyPub, preKeyPriv);

    // Store the prekey record in localStorage
    localStorage.setItem(
      keyName(userId, `preKey:${i}`),
      toBase64(record.serialize()),
    );

    // Add public part to the bundle
    preKeys.push({
      id: i,
      publicKey: toBase64(preKeyPub.serialize()),
    });
  }

  // Return public key bundle to send to server. Never private keys
  return {
    registrationId,
    identityKey: toBase64(identityPub.serialize()),
    signedPreKey: {
      id: signedPreKeyId,
      publicKey: toBase64(signedPreKeyPub.serialize()),
      signature: toBase64(signature),
    },
    preKeys,
  };
}
