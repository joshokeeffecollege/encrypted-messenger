import {
  IdentityKeyPair,
  KEMKeyPair,
  KyberPreKeyRecord,
  PreKeyRecord,
  SignedPreKeyRecord,
} from "@signalapp/libsignal-client";

// Store keys in localStorage
const STORAGE_PREFIX = "signal";

function keyName(userId: string, name: string) {
  return `${STORAGE_PREFIX}:${userId}:${name}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export interface PublicKeyBundle {
  registrationId: number;
  identityKey: string;
  signedPreKey: {
    id: number;
    publicKey: string;
    signature: string;
  };
  kyberPreKey: {
    id: number;
    publicKey: string;
    signature: string;
  };
  preKeys: {
    id: number;
    publicKey: string;
  }[];
}

export function hasKeys(userId: string): boolean {
  return Boolean(localStorage.getItem(keyName(userId, "identityPrivate")));
}

export function getRegistrationId(userId: string): number {
  const value = localStorage.getItem(keyName(userId, "registrationId"));

  if (!value) {
    throw new Error("Missing registration ID for user");
  }

  return Number(value);
}

export async function generateAndStoreKeys(
  userId: string,
): Promise<PublicKeyBundle> {
  if (hasKeys(userId)) {
    throw new Error("Keys already exist for this user");
  }

  const identity = IdentityKeyPair.generate();
  const registrationId = Math.floor(Math.random() * 16383) + 1;

  localStorage.setItem(
    keyName(userId, "identityPrivate"),
    toBase64(identity.privateKey.serialize()),
  );
  localStorage.setItem(
    keyName(userId, "identityPublic"),
    toBase64(identity.publicKey.serialize()),
  );
  localStorage.setItem(
    keyName(userId, "registrationId"),
    registrationId.toString(),
  );

  const signedPreKeyId = 1;
  const signedPreKeyPrivate = IdentityKeyPair.generate().privateKey;
  const signedPreKeyPublic = signedPreKeyPrivate.getPublicKey();
  const signedPreKeySignature = identity.privateKey.sign(
    signedPreKeyPublic.serialize(),
  );

  const signedPreKeyRecord = SignedPreKeyRecord.new(
    signedPreKeyId,
    Date.now(),
    signedPreKeyPublic,
    signedPreKeyPrivate,
    signedPreKeySignature,
  );

  localStorage.setItem(
    keyName(userId, "signedPreKey"),
    toBase64(signedPreKeyRecord.serialize()),
  );

  const kyberPreKeyId = 1;
  const kyberKeyPair = KEMKeyPair.generate();
  const kyberPublic = kyberKeyPair.getPublicKey();
  const kyberSignature = identity.privateKey.sign(kyberPublic.serialize());

  const kyberPreKeyRecord = KyberPreKeyRecord.new(
    kyberPreKeyId,
    Date.now(),
    kyberKeyPair,
    kyberSignature,
  );

  localStorage.setItem(
    keyName(userId, "kyberPreKey"),
    toBase64(kyberPreKeyRecord.serialize()),
  );

  const preKeys: Array<{ id: number; publicKey: string }> = [];

  for (let id = 1; id <= 10; id += 1) {
    const preKeyPrivate = IdentityKeyPair.generate().privateKey;
    const preKeyPublic = preKeyPrivate.getPublicKey();
    const record = PreKeyRecord.new(id, preKeyPublic, preKeyPrivate);

    localStorage.setItem(
      keyName(userId, `preKey:${id}`),
      toBase64(record.serialize()),
    );

    preKeys.push({
      id,
      publicKey: toBase64(preKeyPublic.serialize()),
    });
  }

  return {
    registrationId,
    identityKey: toBase64(identity.publicKey.serialize()),
    signedPreKey: {
      id: signedPreKeyId,
      publicKey: toBase64(signedPreKeyPublic.serialize()),
      signature: toBase64(signedPreKeySignature),
    },
    kyberPreKey: {
      id: kyberPreKeyId,
      publicKey: toBase64(kyberPublic.serialize()),
      signature: toBase64(kyberSignature),
    },
    preKeys,
  };
}
