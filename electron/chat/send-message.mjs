import {
  CiphertextMessageType,
  ProtocolAddress,
  processPreKeyBundle,
  signalEncrypt,
} from "@signalapp/libsignal-client";
import { makePeerKeyBundle, getUserRegistrationId } from "../encryption/user-keys.mjs";
import { makeChatMessage, saveMessageText } from "./message-cache.mjs";
import { getSavedStores } from "../encryption/signal-stores.mjs";
import { DEFAULT_DEVICE_ID, bytesToBase64, textToBytes } from "../encryption/signal-utils.mjs";

function makePeerAddress(peerUsername) {
  return ProtocolAddress.new(peerUsername, DEFAULT_DEVICE_ID);
}

function getMessageType(libsignalType) {
  // map libsignal types to our simpler app types
  if (libsignalType === CiphertextMessageType.PreKey) {
    return "prekey";
  }

  if (libsignalType === CiphertextMessageType.Whisper) {
    return "signal";
  }

  throw new Error(`Unsupported message type: ${libsignalType}`);
}

async function makeSessionIfNeeded(rootDir, userId, peerUsername, peerBundle) {
  // if we never talked before make the signal session first
  const address = makePeerAddress(peerUsername);
  const { sessionStore, identityStore } = getSavedStores(rootDir, userId);
  const savedSession = await sessionStore.getSession(address);

  if (savedSession) {
    // if session exists already we can reuse it
    return address;
  }

  // first message needs the other users bundle
  const bundle = makePeerKeyBundle(peerBundle);
  await processPreKeyBundle(bundle, address, sessionStore, identityStore);
  return address;
}

async function encryptChatText(rootDir, userId, peerUsername, plaintext, peerBundle) {
  // turn the plain text into encrypted text before sending
  const trimmedText = plaintext.trim();

  if (!trimmedText) {
    // dont let empty messages go through
    throw new Error("Cannot send an empty message");
  }

  const address = await makeSessionIfNeeded(
    rootDir,
    userId,
    peerUsername,
    peerBundle,
  );
  const { sessionStore, identityStore } = getSavedStores(rootDir, userId);
  // libsignal gives back the encrypted message bytes
  const encryptedMessage = await signalEncrypt(
    textToBytes(trimmedText),
    address,
    sessionStore,
    identityStore,
  );

  return {
    recipientUsername: peerUsername,
    type: getMessageType(encryptedMessage.type()),
    ciphertext: bytesToBase64(encryptedMessage.serialize()),
    header: {
      version: 1,
      senderRegistrationId: await getUserRegistrationId(rootDir, userId),
    },
    plaintext: trimmedText,
  };
}

export async function sendMessage(rootDir, data) {
  // encrypt it then send the encrypted version to the server
  const encrypted = await encryptChatText(
    rootDir,
    data.userId,
    data.peerUsername,
    data.plaintext,
    data.peerBundle,
  );

  const savedServerMessage = await data.saveEncryptedMessage({
    recipientUsername: encrypted.recipientUsername,
    type: encrypted.type,
    ciphertext: encrypted.ciphertext,
    header: encrypted.header,
  });

  await saveMessageText(
    // keep our own plain text on this device for later display
    rootDir,
    data.userId,
    data.peerUsername,
    savedServerMessage.id,
    {
      displayText: encrypted.plaintext,
      state: "resolved",
    },
    data.serverUrl,
  );

  return {
    // give the ui a ready to render message back
    message: makeChatMessage(
      savedServerMessage,
      data.userId,
      encrypted.plaintext,
      "resolved",
    ),
    debug: {
      peerUsername: data.peerUsername,
      ciphertext: encrypted.ciphertext,
      ciphertextLength: encrypted.ciphertext.length,
      plaintext: encrypted.plaintext,
      plaintextLength: encrypted.plaintext.length,
      messageType: encrypted.type,
      senderRegistrationId: encrypted.header.senderRegistrationId,
      sessionBootstrap: "bundle-available",
    },
  };
}
