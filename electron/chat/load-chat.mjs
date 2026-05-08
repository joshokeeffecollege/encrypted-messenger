import {
  PreKeySignalMessage,
  ProtocolAddress,
  SignalMessage,
  signalDecrypt,
  signalDecryptPreKey,
} from "@signalapp/libsignal-client";
import {
  makeChatMessage,
  readSavedMessage,
  saveMessageText,
} from "./message-cache.mjs";
import { getSavedStores } from "../encryption/signal-stores.mjs";
import {
  DEFAULT_DEVICE_ID,
  base64ToBytes,
  bytesToText,
} from "../encryption/signal-utils.mjs";

function makePeerAddress(peerUsername) {
  return ProtocolAddress.new(peerUsername, DEFAULT_DEVICE_ID);
}

async function decryptChatText(rootDir, userId, senderUsername, type, ciphertext) {
  // this turns the encrypted bytes back into text
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
  // libsignal uses these messages for old duplicate packets
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("DuplicatedMessage") ||
    message.includes("message with old counter")
  );
}

function shouldUseSavedMessage(savedMessage) {
  return Boolean(savedMessage);
}

export async function loadChat(rootDir, data) {
  // build one full chat for the selected person
  const debugLogs = [];
  const chatMessages = [];

  for (const message of data.messages) {
    // only keep messages for this selected chat
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

    if (shouldUseSavedMessage(savedMessage)) {
      // if we already saved the plain text before use that
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
      // if i sent it on another device we may not have plain text here
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
      // incoming messages need local decrypt
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
      const errorText = error instanceof Error ? error.message : String(error);
      const existingMessage = await readSavedMessage(
        rootDir,
        data.userId,
        data.peerUsername,
        message.id,
        data.serverUrl,
      );
      const displayText =
        duplicate && existingMessage?.displayText
          ? existingMessage.displayText
          : duplicate
            ? "[Encrypted message already decrypted on this device]"
            : "[Unable to decrypt message]";
      const state =
        duplicate && existingMessage?.displayText
          ? existingMessage.state ?? "resolved"
          : duplicate
            ? "duplicate"
            : "failed";

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
