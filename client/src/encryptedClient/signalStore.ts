import {
  Direction,
  IdentityChange,
  IdentityKeyStore,
  KyberPreKeyRecord,
  KyberPreKeyStore,
  PreKeyRecord,
  PreKeyStore,
  PrivateKey,
  ProtocolAddress,
  PublicKey,
  SessionRecord,
  SessionStore,
  SignedPreKeyRecord,
  SignedPreKeyStore,
} from "@signalapp/libsignal-client";

const STORAGE_PREFIX = "signal";

type SerializableRecord =
  | PreKeyRecord
  | SignedPreKeyRecord
  | KyberPreKeyRecord
  | SessionRecord
  | PublicKey
  | PrivateKey;

interface SignalStores {
  identityStore: BrowserIdentityKeyStore;
  sessionStore: BrowserSessionStore;
  preKeyStore: BrowserPreKeyStore;
  signedPreKeyStore: BrowserSignedPreKeyStore;
  kyberPreKeyStore: BrowserKyberPreKeyStore;
}

function storageKey(userId: string, section: string, id: string): string {
  return `${STORAGE_PREFIX}:${userId}:${section}:${id}`;
}

function addressKey(address: ProtocolAddress): string {
  return `${address.name()}:${address.deviceId()}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
}

function saveSerialized(
  userId: string,
  section: string,
  id: string,
  record: SerializableRecord,
): void {
  localStorage.setItem(
    storageKey(userId, section, id),
    toBase64(record.serialize()),
  );
}

function loadSerialized(
  userId: string,
  section: string,
  id: string,
): Uint8Array | null {
  const value = localStorage.getItem(storageKey(userId, section, id));
  return value ? fromBase64(value) : null;
}

function removeSerialized(userId: string, section: string, id: string): void {
  localStorage.removeItem(storageKey(userId, section, id));
}

function listSectionKeys(userId: string, section: string): string[] {
  const prefix = `${STORAGE_PREFIX}:${userId}:${section}:`;
  const keys: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix)) {
      keys.push(key.slice(prefix.length));
    }
  }

  return keys;
}

function requireRecord(bytes: Uint8Array | null, message: string): Uint8Array {
  if (!bytes) {
    throw new Error(message);
  }
  return bytes;
}

function parsePreKeyRecord(bytes: Uint8Array | null, id: number): PreKeyRecord {
  return PreKeyRecord.deserialize(
    requireRecord(bytes, `Missing pre-key record ${id}`),
  );
}

function parseSignedPreKeyRecord(
  bytes: Uint8Array | null,
  id: number,
): SignedPreKeyRecord {
  return SignedPreKeyRecord.deserialize(
    requireRecord(bytes, `Missing signed pre-key record ${id}`),
  );
}

function parseKyberPreKeyRecord(
  bytes: Uint8Array | null,
  id: number,
): KyberPreKeyRecord {
  return KyberPreKeyRecord.deserialize(
    requireRecord(bytes, `Missing kyber pre-key record ${id}`),
  );
}

function parseSessionRecord(bytes: Uint8Array | null): SessionRecord | null {
  if (!bytes) {
    return null;
  }
  return SessionRecord.deserialize(bytes);
}

function parsePublicKey(bytes: Uint8Array | null): PublicKey | null {
  if (!bytes) {
    return null;
  }
  return PublicKey.deserialize(bytes);
}

function parsePrivateKey(bytes: Uint8Array | null): PrivateKey {
  return PrivateKey.deserialize(
    requireRecord(bytes, "Missing local identity private key"),
  );
}

export class BrowserSessionStore extends SessionStore {
  private readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  async saveSession(
    name: ProtocolAddress,
    record: SessionRecord,
  ): Promise<void> {
    saveSerialized(this.userId, "sessions", addressKey(name), record);
  }

  async getSession(name: ProtocolAddress): Promise<SessionRecord | null> {
    return parseSessionRecord(
      loadSerialized(this.userId, "sessions", addressKey(name)),
    );
  }

  async getExistingSessions(
    addresses: ProtocolAddress[],
  ): Promise<SessionRecord[]> {
    const sessions: SessionRecord[] = [];

    for (const address of addresses) {
      const session = await this.getSession(address);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }
}

export class BrowserIdentityKeyStore extends IdentityKeyStore {
  private readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  async getIdentityKey(): Promise<PrivateKey> {
    return parsePrivateKey(loadSerialized(this.userId, "identity", "private"));
  }

  async getLocalRegistrationId(): Promise<number> {
    const value = localStorage.getItem(
      storageKey(this.userId, "identity", "registrationId"),
    );

    if (!value) {
      throw new Error("Missing local registration ID");
    }

    return Number(value);
  }

  async saveIdentity(
    name: ProtocolAddress,
    key: PublicKey,
  ): Promise<IdentityChange> {
    const existing = await this.getIdentity(name);
    saveSerialized(this.userId, "peer-identities", addressKey(name), key);

    if (existing && existing.compare(key) !== 0) {
      return IdentityChange.ReplacedExisting;
    }

    return IdentityChange.NewOrUnchanged;
  }

  async isTrustedIdentity(
    name: ProtocolAddress,
    key: PublicKey,
    _direction: Direction,
  ): Promise<boolean> {
    const existing = await this.getIdentity(name);

    if (!existing) {
      return true;
    }

    return existing.compare(key) === 0;
  }

  async getIdentity(name: ProtocolAddress): Promise<PublicKey | null> {
    return parsePublicKey(
      loadSerialized(this.userId, "peer-identities", addressKey(name)),
    );
  }
}

export class BrowserPreKeyStore extends PreKeyStore {
  private readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  async savePreKey(id: number, record: PreKeyRecord): Promise<void> {
    saveSerialized(this.userId, "prekeys", String(id), record);
  }

  async getPreKey(id: number): Promise<PreKeyRecord> {
    return parsePreKeyRecord(
      loadSerialized(this.userId, "prekeys", String(id)),
      id,
    );
  }

  async removePreKey(id: number): Promise<void> {
    removeSerialized(this.userId, "prekeys", String(id));
  }
}

export class BrowserSignedPreKeyStore extends SignedPreKeyStore {
  private readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  async saveSignedPreKey(
    id: number,
    record: SignedPreKeyRecord,
  ): Promise<void> {
    saveSerialized(this.userId, "signed-prekeys", String(id), record);
  }

  async getSignedPreKey(id: number): Promise<SignedPreKeyRecord> {
    return parseSignedPreKeyRecord(
      loadSerialized(this.userId, "signed-prekeys", String(id)),
      id,
    );
  }
}

export class BrowserKyberPreKeyStore extends KyberPreKeyStore {
  private readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  async saveKyberPreKey(id: number, record: KyberPreKeyRecord): Promise<void> {
    saveSerialized(this.userId, "kyber-prekeys", String(id), record);
  }

  async getKyberPreKey(id: number): Promise<KyberPreKeyRecord> {
    return parseKyberPreKeyRecord(
      loadSerialized(this.userId, "kyber-prekeys", String(id)),
      id,
    );
  }

  async markKyberPreKeyUsed(
    kyberPreKeyId: number,
    signedPreKeyId: number,
    baseKey: PublicKey,
  ): Promise<void> {
    localStorage.setItem(
      storageKey(this.userId, "kyber-prekeys-used", String(kyberPreKeyId)),
      JSON.stringify({
        signedPreKeyId,
        baseKey: toBase64(baseKey.serialize()),
        usedAt: new Date().toISOString(),
      }),
    );
  }
}

export function getSignalStores(userId: string): SignalStores {
  return {
    identityStore: new BrowserIdentityKeyStore(userId),
    sessionStore: new BrowserSessionStore(userId),
    preKeyStore: new BrowserPreKeyStore(userId),
    signedPreKeyStore: new BrowserSignedPreKeyStore(userId),
    kyberPreKeyStore: new BrowserKyberPreKeyStore(userId),
  };
}

export function hasStoredSignalState(userId: string): boolean {
  return Boolean(loadSerialized(userId, "identity", "private"));
}

export function listStoredSessionAddresses(userId: string): string[] {
  return listSectionKeys(userId, "sessions");
}
