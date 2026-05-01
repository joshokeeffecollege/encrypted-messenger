import path from "node:path";
import { getSavedOrNewKeys } from "../encryption/user-keys.mjs";
import { buildInbox } from "./message-cache.mjs";
import { loadChatMessages, sendChatMessage } from "./chat-messages.mjs";

async function setUpUser(rootDir, data) {
  return getSavedOrNewKeys(rootDir, data.userId);
}

export function createChatService({ dataDir }) {
  // Electron saves local chat and crypto data here on this computer.
  const rootDir = path.join(dataDir, "signal");

  return {
    setUpUser(data) {
      return setUpUser(rootDir, data);
    },
    loadChat(data) {
      return loadChatMessages(rootDir, data);
    },
    loadInbox(data) {
      return buildInbox(rootDir, data);
    },
    sendChat(data) {
      return sendChatMessage(rootDir, data);
    },
  };
}
