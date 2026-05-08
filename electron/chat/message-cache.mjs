import { loadText, saveText } from "../storage/local-files.mjs";

function makeSavedMessageId(peerUsername, messageId) {
  return `${peerUsername}:${messageId}`;
}

function readServerHost(serverUrl) {
  try {
    return new URL(serverUrl).host;
  } catch {
    return "";
  }
}

function getPeerCacheKeys(peerUsername, serverUrl = "") {
  const trimmedPeer = peerUsername.trim().replace(/^@/, "");

  if (!trimmedPeer) {
    return [];
  }

  const keys = new Set([trimmedPeer]);
  const splitAt = trimmedPeer.lastIndexOf("@");

  if (splitAt === -1) {
    const serverHost = readServerHost(serverUrl);

    if (serverHost) {
      keys.add(`${trimmedPeer}@${serverHost}`);
    }

    return Array.from(keys);
  }

  const username = trimmedPeer.slice(0, splitAt);
  const domain = trimmedPeer.slice(splitAt + 1);
  const serverHost = readServerHost(serverUrl);

  if (serverHost && domain === serverHost) {
    keys.add(username);
  }

  return Array.from(keys);
}

export async function readSavedMessage(
  rootDir,
  userId,
  peerUsername,
  messageId,
  serverUrl = "",
) {
  for (const cacheKey of getPeerCacheKeys(peerUsername, serverUrl)) {
    const value = await loadText(
      rootDir,
      userId,
      "message-cache",
      makeSavedMessageId(cacheKey, messageId),
    );

    if (value) {
      return JSON.parse(value);
    }
  }

  return null;
}

export async function saveMessageText(
  rootDir,
  userId,
  peerUsername,
  messageId,
  savedMessage,
  serverUrl = "",
) {
  for (const cacheKey of getPeerCacheKeys(peerUsername, serverUrl)) {
    await saveText(
      rootDir,
      userId,
      "message-cache",
      makeSavedMessageId(cacheKey, messageId),
      JSON.stringify(savedMessage),
    );
  }
}

export function makeChatMessage(message, userId, displayText, state) {
  // this is the chat shape react wants
  return {
    id: message.id,
    senderId: message.senderId,
    senderUsername: message.senderUsername,
    recipientId: message.recipientId,
    recipientUsername: message.recipientUsername,
    createdAt: message.createdAt,
    direction: message.senderId === userId ? "outgoing" : "incoming",
    displayText,
    state,
  };
}

export async function buildInbox(rootDir, data) {
  // turn all messages into one inbox list
  const { userId, messages, serverUrl } = data;
  const chatList = new Map();

  for (const message of messages) {
    const sentByMe = message.senderId === userId;
    const peerUsername = sentByMe
      ? message.recipientUsername
      : message.senderUsername;

    const savedMessage = await readSavedMessage(
      rootDir,
      userId,
      peerUsername,
      message.id,
      serverUrl,
    );
    let preview = "[Encrypted message]";

    if (savedMessage?.displayText) {
      preview = savedMessage.displayText;
    } else if (sentByMe) {
      preview = "[Encrypted message sent from this device]";
    } else if (savedMessage?.state === "duplicate") {
      preview = "[Encrypted message already decrypted on this device]";
    } else if (savedMessage?.state === "failed") {
      preview = "[Unable to decrypt message]";
    }

    if (sentByMe) {
      preview = `You: ${preview}`;
    }

    const oldPreview = chatList.get(peerUsername);

    if (
      !oldPreview ||
      new Date(message.createdAt).getTime() >
        new Date(oldPreview.lastCreatedAt).getTime()
    ) {
      chatList.set(peerUsername, {
        peerUsername,
        lastMessagePreview: preview,
        lastCreatedAt: message.createdAt,
        unreadCount: 0,
      });
    }
  }

  return Array.from(chatList.values()).sort((left, right) => {
    return (
      new Date(right.lastCreatedAt).getTime() -
      new Date(left.lastCreatedAt).getTime()
    );
  });
}
