import {
  CiphertextMessageType,
  KEMPublicKey,
  PreKeyBundle,
  ProtocolAddress,
  PublicKey,
  SessionRecord,
  processPreKeyBundle,
  signalEncrypt,
} from "@signalapp/libsignal-client";
import { fetchKeyBundle, type PublicKeyBundleResponse } from "./keyApi";
import { fromBase64, getRegistrationId } from "./keyManager";
import { getSignalStores } from "./signalStore";

const DEFAULT_DEVICE_ID = 1;

export interface SessionBootstrapResult {
  address: ProtocolAddress;
  created: boolean;
}

export interface EncryptForPeerResult {
  recipientUsername: string;
  type: "prekey" | "signal";
  ciphertext: string;
  header: {
    version: 1;
    senderRegistrationId: number;
  };
  plaintext: string;
}

function getPeerAddress(
  peerUsername: string,
  deviceId = DEFAULT_DEVICE_ID,
): ProtocolAddress {
  return ProtocolAddress.new(peerUsername, deviceId);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function toUtf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function buildRemotePreKeyBundle(
  bundle: PublicKeyBundleResponse,
): PreKeyBundle {
  const oneTimePreKey = bundle.preKeys[0];

  return PreKeyBundle.new(
    bundle.registrationId,
    DEFAULT_DEVICE_ID,
    oneTimePreKey?.id ?? null,
    oneTimePreKey
      ? PublicKey.deserialize(fromBase64(oneTimePreKey.publicKey))
      : null,
    bundle.signedPreKey.id,
    PublicKey.deserialize(fromBase64(bundle.signedPreKey.publicKey)),
    fromBase64(bundle.signedPreKey.signature),
    PublicKey.deserialize(fromBase64(bundle.identityKey)),
    bundle.kyberPreKey.id,
    KEMPublicKey.deserialize(fromBase64(bundle.kyberPreKey.publicKey)),
    fromBase64(bundle.kyberPreKey.signature),
  );
}

function mapCiphertextType(type: number): "prekey" | "signal" {
  if (type === CiphertextMessageType.PreKey) {
    return "prekey";
  }

  if (type === CiphertextMessageType.Whisper) {
    return "signal";
  }

  throw new Error(`Unsupported ciphertext type returned by libsignal: ${type}`);
}

export async function getSessionForPeer(
  userId: string,
  peerUsername: string,
): Promise<SessionRecord | null> {
  const { sessionStore } = getSignalStores(userId);
  return sessionStore.getSession(getPeerAddress(peerUsername));
}

export async function hasSessionForPeer(
  userId: string,
  peerUsername: string,
): Promise<boolean> {
  const session = await getSessionForPeer(userId, peerUsername);
  return session !== null;
}

export async function ensureSessionForPeer(
  userId: string,
  peerUsername: string,
): Promise<SessionBootstrapResult> {
  const address = getPeerAddress(peerUsername);
  const existingSession = await getSessionForPeer(userId, peerUsername);

  if (existingSession) {
    return {
      address,
      created: false,
    };
  }

  let remoteBundle: PublicKeyBundleResponse;

  try {
    remoteBundle = await fetchKeyBundle(peerUsername);
  } catch {
    throw new Error(
      `Could not fetch a key bundle for @${peerUsername}. They may not have uploaded keys yet.`,
    );
  }

  const signalBundle = buildRemotePreKeyBundle(remoteBundle);
  const { sessionStore, identityStore } = getSignalStores(userId);

  await processPreKeyBundle(signalBundle, address, sessionStore, identityStore);

  return {
    address,
    created: true,
  };
}

export async function encryptForPeer(
  userId: string,
  peerUsername: string,
  plaintext: string,
): Promise<EncryptForPeerResult> {
  const trimmed = plaintext.trim();

  if (!trimmed) {
    throw new Error("Cannot encrypt an empty message");
  }

  const { address } = await ensureSessionForPeer(userId, peerUsername);
  const { sessionStore, identityStore } = getSignalStores(userId);

  const encrypted = await signalEncrypt(
    toUtf8Bytes(trimmed),
    address,
    sessionStore,
    identityStore,
  );

  return {
    recipientUsername: peerUsername,
    type: mapCiphertextType(encrypted.type()),
    ciphertext: toBase64(encrypted.serialize()),
    header: {
      version: 1,
      senderRegistrationId: getRegistrationId(userId),
    },
    plaintext: trimmed,
  };
}
