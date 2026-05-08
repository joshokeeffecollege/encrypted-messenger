import {
  IdentityKeyPair,
  KEMKeyPair,
  KEMPublicKey,
  KyberPreKeyRecord,
  PreKeyBundle,
  PreKeyRecord,
  PublicKey,
  SignedPreKeyRecord,
} from "@signalapp/libsignal-client";
import {
  hasText,
  loadRecordBytes,
  loadText,
  saveRecord,
  saveText,
} from "../storage/local-files.mjs";
import {
  DEFAULT_DEVICE_ID,
  base64ToBytes,
  bytesToBase64,
} from "./signal-utils.mjs";

export async function userHasKeys(rootDir, userId) {
  return hasText(rootDir, userId, "identity", "private");
}

export async function getUserRegistrationId(rootDir, userId) {
  const value = await loadText(rootDir, userId, "identity", "registrationId");

  if (!value) {
    throw new Error("Missing local registration ID");
  }

  return Number(value);
}

export async function loadSavedKeyBundle(rootDir, userId) {
  const registrationId = await getUserRegistrationId(rootDir, userId);
  const identityPublicBytes = await loadRecordBytes(
    rootDir,
    userId,
    "identity",
    "public",
  );

  if (!identityPublicBytes) {
    throw new Error("Missing local identity public key");
  }

  const signedPreKeyBytes = await loadRecordBytes(
    rootDir,
    userId,
    "signed-prekeys",
    "1",
  );

  if (!signedPreKeyBytes) {
    throw new Error("Missing signed pre-key");
  }

  const signedPreKey = SignedPreKeyRecord.deserialize(signedPreKeyBytes);
  const kyberPreKeyBytes = await loadRecordBytes(
    rootDir,
    userId,
    "kyber-prekeys",
    "1",
  );

  if (!kyberPreKeyBytes) {
    throw new Error("Missing kyber pre-key");
  }

  const kyberPreKey = KyberPreKeyRecord.deserialize(kyberPreKeyBytes);
  const oneTimeKeys = [];

  for (let id = 1; id <= 10; id += 1) {
    const preKeyBytes = await loadRecordBytes(
      rootDir,
      userId,
      "prekeys",
      String(id),
    );

    if (!preKeyBytes) {
      continue;
    }

    const preKey = PreKeyRecord.deserialize(preKeyBytes);
    oneTimeKeys.push({
      id,
      publicKey: bytesToBase64(preKey.publicKey().serialize()),
    });
  }

  return {
    registrationId,
    identityKey: bytesToBase64(identityPublicBytes),
    signedPreKey: {
      id: signedPreKey.id(),
      publicKey: bytesToBase64(signedPreKey.publicKey().serialize()),
      signature: bytesToBase64(signedPreKey.signature()),
    },
    kyberPreKey: {
      id: kyberPreKey.id(),
      publicKey: bytesToBase64(kyberPreKey.publicKey().serialize()),
      signature: bytesToBase64(kyberPreKey.signature()),
    },
    preKeys: oneTimeKeys,
  };
}

export async function createAndSaveKeys(rootDir, userId) {
  if (await userHasKeys(rootDir, userId)) {
    throw new Error("Keys already exist for this user");
  }

  // these are the main keys for this user here
  const identityKeys = IdentityKeyPair.generate();
  const registrationId = Math.floor(Math.random() * 16383) + 1;

  await saveRecord(rootDir, userId, "identity", "private", identityKeys.privateKey);
  await saveRecord(rootDir, userId, "identity", "public", identityKeys.publicKey);
  await saveText(
    rootDir,
    userId,
    "identity",
    "registrationId",
    String(registrationId),
  );

  const signedKeyId = 1;
  const signedKeyPrivate = IdentityKeyPair.generate().privateKey;
  const signedKeyPublic = signedKeyPrivate.getPublicKey();
  const signedKeySignature = identityKeys.privateKey.sign(
    signedKeyPublic.serialize(),
  );

  const signedKey = SignedPreKeyRecord.new(
    signedKeyId,
    Date.now(),
    signedKeyPublic,
    signedKeyPrivate,
    signedKeySignature,
  );

  await saveRecord(rootDir, userId, "signed-prekeys", String(signedKeyId), signedKey);

  const kyberKeyId = 1;
  const kyberKeyPair = KEMKeyPair.generate();
  const kyberPublic = kyberKeyPair.getPublicKey();
  const kyberSignature = identityKeys.privateKey.sign(kyberPublic.serialize());

  const kyberKey = KyberPreKeyRecord.new(
    kyberKeyId,
    Date.now(),
    kyberKeyPair,
    kyberSignature,
  );

  await saveRecord(rootDir, userId, "kyber-prekeys", String(kyberKeyId), kyberKey);

  const oneTimeKeys = [];

  // these extra keys help start new chats
  for (let id = 1; id <= 10; id += 1) {
    const preKeyPrivate = IdentityKeyPair.generate().privateKey;
    const preKeyPublic = preKeyPrivate.getPublicKey();
    const preKey = PreKeyRecord.new(id, preKeyPublic, preKeyPrivate);

    await saveRecord(rootDir, userId, "prekeys", String(id), preKey);
    oneTimeKeys.push({
      id,
      publicKey: bytesToBase64(preKeyPublic.serialize()),
    });
  }

  return {
    registrationId,
    identityKey: bytesToBase64(identityKeys.publicKey.serialize()),
    signedPreKey: {
      id: signedKeyId,
      publicKey: bytesToBase64(signedKeyPublic.serialize()),
      signature: bytesToBase64(signedKeySignature),
    },
    kyberPreKey: {
      id: kyberKeyId,
      publicKey: bytesToBase64(kyberPublic.serialize()),
      signature: bytesToBase64(kyberSignature),
    },
    preKeys: oneTimeKeys,
  };
}

export async function getSavedOrNewKeys(rootDir, userId) {
  if (await userHasKeys(rootDir, userId)) {
    return loadSavedKeyBundle(rootDir, userId);
  }

  return createAndSaveKeys(rootDir, userId);
}

export function makePeerKeyBundle(peerBundle) {
  if (!peerBundle) {
    throw new Error("Missing remote key bundle for first message");
  }

  if (!peerBundle.kyberPreKey) {
    throw new Error(`Key bundle for @${peerBundle.username} is missing kyberPreKey`);
  }

  const oneTimeKey = peerBundle.preKeys[0];
  const kyberKey = peerBundle.kyberPreKey;

  return PreKeyBundle.new(
    peerBundle.registrationId,
    DEFAULT_DEVICE_ID,
    oneTimeKey?.id ?? null,
    oneTimeKey
      ? PublicKey.deserialize(base64ToBytes(oneTimeKey.publicKey))
      : null,
    peerBundle.signedPreKey.id,
    PublicKey.deserialize(base64ToBytes(peerBundle.signedPreKey.publicKey)),
    base64ToBytes(peerBundle.signedPreKey.signature),
    PublicKey.deserialize(base64ToBytes(peerBundle.identityKey)),
    kyberKey.id,
    KEMPublicKey.deserialize(base64ToBytes(kyberKey.publicKey)),
    base64ToBytes(kyberKey.signature),
  );
}
