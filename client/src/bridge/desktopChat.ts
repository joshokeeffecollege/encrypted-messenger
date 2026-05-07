// this is the electron bridge for chat functionality

import { apiGet } from "../api/http";

export interface SetUpUserData {
  serverUrl: string;
  userId: string;
  username: string;
}

export interface InboxPreview {
  peerUsername: string;
  lastMessagePreview: string;
  lastCreatedAt: string;
  unreadCount: number;
}

export type ChatMessageState =
  | "resolved"
  | "duplicate"
  | "failed"
  | "encrypted-placeholder";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  createdAt: string;
  direction: "incoming" | "outgoing";
  displayText: string;
  state: ChatMessageState;
}

export interface LoadChatData {
  serverUrl: string;
  userId: string;
  username: string;
  peerUsername: string;
}

export interface CheckPeerData {
  serverUrl: string;
  userId: string;
  peerUsername: string;
}

export interface SendChatData extends CheckPeerData {
  plaintext: string;
}

function getDesktopChat() {
  if (!window.desktopChat) {
    throw new Error("Desktop chat bridge is not available");
  }

  return window.desktopChat;
}

async function checkPeerThroughServer(data: CheckPeerData) {
  const bundle = await apiGet<{ username?: string }>(
    `/keys/${encodeURIComponent(data.peerUsername)}`,
  );

  return {
    found: true as const,
    username: bundle.username ?? data.peerUsername,
  };
}

export const desktopChat = {
  setServerUrl(serverUrl: string): Promise<void> {
    return getDesktopChat().setServerUrl(serverUrl);
  },

  setUpUser(data: SetUpUserData): Promise<void> {
    return getDesktopChat().setUpUser(data);
  },

  loadInbox(data: { serverUrl: string; userId: string }): Promise<InboxPreview[]> {
    return getDesktopChat().loadInbox(data);
  },

  checkPeer(data: CheckPeerData): Promise<{ found: true; username: string }> {
    const bridge = getDesktopChat();

    if (typeof bridge.checkPeer !== "function") {
      return checkPeerThroughServer(data);
    }

    return bridge.checkPeer(data);
  },

  loadChat(data: LoadChatData): Promise<ChatMessage[]> {
    return getDesktopChat().loadChat(data);
  },

  sendChat(data: SendChatData): Promise<ChatMessage> {
    return getDesktopChat().sendChat(data);
  },
};
