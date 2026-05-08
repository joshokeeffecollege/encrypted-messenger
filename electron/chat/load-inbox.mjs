import { buildInbox } from "./message-cache.mjs";

export function loadInbox(rootDir, data) {
  return buildInbox(rootDir, data);
}
