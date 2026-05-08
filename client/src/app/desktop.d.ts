declare global {
  interface Window {
    desktop?: {
      isElectron: boolean;
      serverUrl: string;
      pingCryptoDebug(): void;
    };
    desktopChat?: {
      setServerUrl(serverUrl: string): Promise<void>;
      setUpUser(data: {
        serverUrl: string;
        userId: string;
        username: string;
      }): Promise<void>;
      loadInbox(data: {
        serverUrl: string;
        userId: string;
      }): Promise<
        Array<{
          peerUsername: string;
          lastMessagePreview: string;
          lastCreatedAt: string;
          unreadCount: number;
        }>
      >;
      checkPeer(data: {
        serverUrl: string;
        userId: string;
        peerUsername: string;
      }): Promise<{
        found: true;
        username: string;
      }>;
      loadChat(data: {
        serverUrl: string;
        userId: string;
        username: string;
        peerUsername: string;
      }): Promise<
        Array<{
          id: string;
          senderId: string;
          senderUsername: string;
          recipientId: string;
          recipientUsername: string;
          createdAt: string;
          direction: "incoming" | "outgoing";
          displayText: string;
          state:
            | "resolved"
            | "duplicate"
            | "failed"
            | "encrypted-placeholder";
        }>
      >;
      sendChat(data: {
        serverUrl: string;
        userId: string;
        peerUsername: string;
        plaintext: string;
      }): Promise<{
        id: string;
        senderId: string;
        senderUsername: string;
        recipientId: string;
        recipientUsername: string;
        createdAt: string;
        direction: "incoming" | "outgoing";
        displayText: string;
        state: "resolved" | "duplicate" | "failed" | "encrypted-placeholder";
      }>;
    };
  }
}

export {};
