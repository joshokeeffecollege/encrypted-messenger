import {
  CiphertextMessageType,
  PreKeySignalMessage,
  ProtocolAddress,
  SignalMessage,
  processPreKeyBundle,
  signalDecrypt,
  signalDecryptPreKey,
  signalEncrypt,
} from "@signalapp/libsignal-client";
import { makePeerKeyBundle, getUserRegistrationId } from "../encryption/user-keys.mjs";
import {
  makeChatMessage,
  readSavedMessage,
  saveMessageText,
} from "./message-cache.mjs";
import { getSavedStores } from "../encryption/signal-stores.mjs";
import {
  DEFAULT_DEVICE_ID,
  base64ToBytes,
  bytesToBase64,
  bytesToText,
  textToBytes,
} from "../encryption/signal-utils.mjs";

function makePeerAddress(peerUsername) {
  return ProtocolAddress.new(peerUsername, DEFAULT_DEVICE_ID);
}

function getMessageType(libsignalType) {
  if (libsignalType === CiphertextMessageType.PreKey) {
    return "prekey";
  }

  if (libsignalType === CiphertextMessageType.Whisper) {
    return "signal";
  }

  throw new Error(`Unsupported message type: ${libsignalType}`);
}

async function makeSessionIfNeeded(rootDir, userId, peerUsername, peerBundle) {
  // If we already have a session with this person, we re-use it.
  const address = makePeerAddress(peerUsername);
  const { sessionStore, identityStore } = getSavedStores(rootDir, userId);
  const savedSession = await sessionStore.getSession(address);

  if (savedSession) {
    return { address, createdNewSession: false };
  }

  const bundle = makePeerKeyBundle(peerBundle);
  await processPreKeyBundle(bundle, address, sessionStore, identityStore);

  return { address, createdNewSession: true };
}

async function encryptChatText(rootDir, userId, peerUsername, plaintext, peerBundle) {
  const trimmedText = plaintext.trim();

  if (!trimmedText) {
    throw new Error("Cannot send an empty message");
  }

  const { address } = await makeSessionIfNeeded(
    rootDir,
    userId,
    peerUsername,
    peerBundle,
  );
  const { sessionStore, identityStore } = getSavedStores(rootDir, userId);
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

async function decryptChatText(rootDir, userId, senderUsername, type, ciphertext) {
  const address = makePeerAddress(senderUsername);
  const encryptedBytes = base64ToBytes(ciphertext);
  const {
    sessionStore,
    identityStore,
    preKeyStore,
    signedPreKeyStore,
    kyberPreKeyStore,
  } = getSavedStores(rootDir, userId);

  if (type === "prekey") {
    const message = PreKeySignalMessage.deserialize(encryptedBytes);
    const plaintextBytes = await signalDecryptPreKey(
      message,
      address,
      sessionStore,
      identityStore,
      preKeyStore,
      signedPreKeyStore,
      kyberPreKeyStore,
    );

    return bytesToText(plaintextBytes);
  }

  const message = SignalMessage.deserialize(encryptedBytes);
  const plaintextBytes = await signalDecrypt(
    message,
    address,
    sessionStore,
    identityStore,
  );

  return bytesToText(plaintextBytes);
}

function isDuplicateMessage(error) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("DuplicatedMessage") ||
    message.includes("message with old counter")
  );
}

export async function sendChatMessage(rootDir, data) {
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

  // We save our own plaintext once so it can be shown again later.
  await saveMessageText(
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

export async function loadChatMessages(rootDir, data) {
  const debugLogs = [];
  const chatMessages = [];

  for (const message of data.messages) {
    const isInThisChat =
      (message.senderId === data.userId &&
        message.recipientUsername === data.peerUsername) ||
      (message.recipientId === data.userId &&
        message.senderUsername === data.peerUsername);

    if (!isInThisChat) {
      continue;
    }

    const savedMessage = await readSavedMessage(
      rootDir,
      data.userId,
      data.peerUsername,
      message.id,
      data.serverUrl,
    );

    if (savedMessage) {
      chatMessages.push(
        makeChatMessage(
          message,
          data.userId,
          savedMessage.displayText,
          savedMessage.state,
        ),
      );
      continue;
    }

    if (message.senderId === data.userId) {
      chatMessages.push(
        makeChatMessage(
          message,
          data.userId,
          "[Encrypted message sent from this device]",
          "encrypted-placeholder",
        ),
      );
      continue;
    }

    try {
      // Incoming messages are decrypted once and then saved localy.
      const plaintext = await decryptChatText(
        rootDir,
        data.userId,
        message.senderUsername,
        message.type,
        message.ciphertext,
      );

      await saveMessageText(
        rootDir,
        data.userId,
        data.peerUsername,
        message.id,
        {
          displayText: plaintext,
          state: "resolved",
        },
        data.serverUrl,
      );

      debugLogs.push({
        stage: "message",
        action: "decrypt",
        userId: data.userId,
        senderUsername: message.senderUsername,
        messageType: message.type,
        ciphertextPreview: message.ciphertext,
        ciphertextLength: message.ciphertext.length,
        plaintextPreview: plaintext,
        plaintextLength: plaintext.length,
        result: "success",
      });

      chatMessages.push(
        makeChatMessage(message, data.userId, plaintext, "resolved"),
      );
    } catch (error) {
      const duplicate = isDuplicateMessage(error);
      const displayText = duplicate
        ? "[Encrypted message already decrypted on this device]"
        : "[Unable to decrypt message]";
      const state = duplicate ? "duplicate" : "failed";
      const errorText = error instanceof Error ? error.message : String(error);

      await saveMessageText(
        rootDir,
        data.userId,
        data.peerUsername,
        message.id,
        {
          displayText,
          state,
        },
        data.serverUrl,
      );

      debugLogs.push({
        stage: "message",
        action: "decrypt",
        userId: data.userId,
        senderUsername: message.senderUsername,
        messageType: message.type,
        ciphertextPreview: message.ciphertext,
        ciphertextLength: message.ciphertext.length,
        result: duplicate ? "duplicate" : "error",
        error: errorText,
      });

      chatMessages.push(
        makeChatMessage(message, data.userId, displayText, state),
      );
    }
  }

  return {
    messages: chatMessages,
    debugEvents: debugLogs,
  };
}
