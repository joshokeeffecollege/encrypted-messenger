import { desktopChat, type ChatMessage } from "./desktop-chat.ts";

export function loadChat(data: {
  serverUrl: string;
  userId: string;
  username: string;
  peerUsername: string;
}): Promise<ChatMessage[]> {
  return desktopChat.loadChat(data);
}
