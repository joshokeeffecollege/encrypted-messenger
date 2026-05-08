import path from "node:path";
import { getSavedOrNewKeys } from "../encryption/user-keys.mjs";
import { loadInbox } from "./load-inbox.mjs";
import { loadChat } from "./load-chat.mjs";
import { sendMessage } from "./send-message.mjs";

async function setUpUser(rootDir, data) {
  return getSavedOrNewKeys(rootDir, data.userId);
}

export function createChatService({ dataDir }) {
  // electron keeps local crypto files here
  const rootDir = path.join(dataDir, "signal");

  return {
    setUpUser(data) {
      return setUpUser(rootDir, data);
    },
    loadChat(data) {
      return loadChat(rootDir, data);
    },
    loadInbox(data) {
      return loadInbox(rootDir, data);
    },
    sendChat(data) {
      return sendMessage(rootDir, data);
    },
  };
}
