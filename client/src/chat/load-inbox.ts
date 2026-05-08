import { desktopChat, type InboxPreview } from "./desktop-chat.ts";

export function loadInbox(data: {
  serverUrl: string;
  userId: string;
}): Promise<InboxPreview[]> {
  return desktopChat.loadInbox(data);
}
