import { desktopChat } from "./desktop-chat.ts";

export function searchUser(data: {
  serverUrl: string;
  userId: string;
  peerUsername: string;
}) {
  return desktopChat.checkPeer(data);
}
