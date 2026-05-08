import {
  Direction,
  IdentityChange,
  IdentityKeyStore,
  KyberPreKeyRecord,
  KyberPreKeyStore,
  PreKeyRecord,
  PreKeyStore,
  PrivateKey,
  PublicKey,
  SessionRecord,
  SessionStore,
  SignedPreKeyRecord,
  SignedPreKeyStore,
} from "@signalapp/libsignal-client";
import {
  deleteText,
  loadRecordBytes,
  loadText,
  saveRecord,
  saveText,
} from "../storage/local-files.mjs";
import { bytesToBase64, makeAddressKey } from "./signal-utils.mjs";

export class SavedSessionStore extends SessionStore {
  constructor(rootDir, userId) {
    super();
    this.rootDir = rootDir;
    this.userId = userId;
  }

  async saveSession(address, record) {
    await saveRecord(
      this.rootDir,
      this.userId,
      "sessions",
      makeAddressKey(address),
      record,
    );
  }

  async getSession(address) {
    const bytes = await loadRecordBytes(
      this.rootDir,
      this.userId,
      "sessions",
      makeAddressKey(address),
    );

    return bytes ? SessionRecord.deserialize(bytes) : null;
  }

  async getExistingSessions(addresses) {
    const savedSessions = [];

    for (const address of addresses) {
      const savedSession = await this.getSession(address);
      if (savedSession) {
        savedSessions.push(savedSession);
      }
    }

    return savedSessions;
  }
}

export class SavedIdentityStore extends IdentityKeyStore {
  constructor(rootDir, userId) {
    super();
    this.rootDir = rootDir;
    this.userId = userId;
  }

  async getIdentityKey() {
    const bytes = await loadRecordBytes(
      this.rootDir,
      this.userId,
      "identity",
      "private",
    );

    if (!bytes) {
      throw new Error("Missing local identity private key");
    }

    return PrivateKey.deserialize(bytes);
  }

  async getLocalRegistrationId() {
    const value = await loadText(
      this.rootDir,
      this.userId,
      "identity",
      "registrationId",
    );

    if (!value) {
      throw new Error("Missing local registration ID");
    }

    return Number(value);
  }

  async saveIdentity(address, key) {
    const oldKey = await this.getIdentity(address);
    await saveRecord(
      this.rootDir,
      this.userId,
      "peer-identities",
      makeAddressKey(address),
      key,
    );

    if (oldKey && oldKey.compare(key) !== 0) {
      return IdentityChange.ReplacedExisting;
    }

    return IdentityChange.NewOrUnchanged;
  }

  async isTrustedIdentity(address, key, _direction = Direction.Sending) {
    const oldKey = await this.getIdentity(address);

    if (!oldKey) {
      return true;
    }

    return oldKey.compare(key) === 0;
  }

  async getIdentity(address) {
    const bytes = await loadRecordBytes(
      this.rootDir,
      this.userId,
      "peer-identities",
      makeAddressKey(address),
    );

    return bytes ? PublicKey.deserialize(bytes) : null;
  }
}

export class SavedPreKeyStore extends PreKeyStore {
  constructor(rootDir, userId) {
    super();
    this.rootDir = rootDir;
    this.userId = userId;
  }

  async savePreKey(id, record) {
    await saveRecord(this.rootDir, this.userId, "prekeys", String(id), record);
  }

  async getPreKey(id) {
    const bytes = await loadRecordBytes(
      this.rootDir,
      this.userId,
      "prekeys",
      String(id),
    );

    if (!bytes) {
      throw new Error(`Missing pre-key ${id}`);
    }

    return PreKeyRecord.deserialize(bytes);
  }

  async removePreKey(id) {
    await deleteText(this.rootDir, this.userId, "prekeys", String(id));
  }
}

export class SavedSignedPreKeyStore extends SignedPreKeyStore {
  constructor(rootDir, userId) {
    super();
    this.rootDir = rootDir;
    this.userId = userId;
  }

  async saveSignedPreKey(id, record) {
    await saveRecord(
      this.rootDir,
      this.userId,
      "signed-prekeys",
      String(id),
      record,
    );
  }

  async getSignedPreKey(id) {
    const bytes = await loadRecordBytes(
      this.rootDir,
      this.userId,
      "signed-prekeys",
      String(id),
    );

    if (!bytes) {
      throw new Error(`Missing signed pre-key ${id}`);
    }

    return SignedPreKeyRecord.deserialize(bytes);
  }
}

export class SavedKyberPreKeyStore extends KyberPreKeyStore {
  constructor(rootDir, userId) {
    super();
    this.rootDir = rootDir;
    this.userId = userId;
  }

  async saveKyberPreKey(id, record) {
    await saveRecord(
      this.rootDir,
      this.userId,
      "kyber-prekeys",
      String(id),
      record,
    );
  }

  async getKyberPreKey(id) {
    const bytes = await loadRecordBytes(
      this.rootDir,
      this.userId,
      "kyber-prekeys",
      String(id),
    );

    if (!bytes) {
      throw new Error(`Missing kyber pre-key ${id}`);
    }

    return KyberPreKeyRecord.deserialize(bytes);
  }

  async markKyberPreKeyUsed(kyberPreKeyId, signedPreKeyId, baseKey) {
    await saveText(
      this.rootDir,
      this.userId,
      "kyber-prekeys-used",
      String(kyberPreKeyId),
      JSON.stringify({
        signedPreKeyId,
        baseKey: bytesToBase64(baseKey.serialize()),
        usedAt: new Date().toISOString(),
      }),
    );
  }
}

export function getSavedStores(rootDir, userId) {
  // libsignal needs these small local stores
  return {
    sessionStore: new SavedSessionStore(rootDir, userId),
    identityStore: new SavedIdentityStore(rootDir, userId),
    preKeyStore: new SavedPreKeyStore(rootDir, userId),
    signedPreKeyStore: new SavedSignedPreKeyStore(rootDir, userId),
    kyberPreKeyStore: new SavedKyberPreKeyStore(rootDir, userId),
  };
}
