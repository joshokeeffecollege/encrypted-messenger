import { loadText, saveText } from "../storage/local-files.mjs";

function makeSavedMessageId(peerUsername, messageId) {
  return `${peerUsername}:${messageId}`;
}

export async function readSavedMessage(rootDir, userId, peerUsername, messageId) {
  const value = await loadText(
    rootDir,
    userId,
    "message-cache",
    makeSavedMessageId(peerUsername, messageId),
  );

  return value ? JSON.parse(value) : null;
}

export async function saveMessageText(
  rootDir,
  userId,
  peerUsername,
  messageId,
  savedMessage,
) {
  await saveText(
    rootDir,
    userId,
    "message-cache",
    makeSavedMessageId(peerUsername, messageId),
    JSON.stringify(savedMessage),
  );
}

export function makeChatMessage(message, userId, displayText, state) {
  // This is the simple shape the React app uses on screen.
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
  const { userId, messages } = data;
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
