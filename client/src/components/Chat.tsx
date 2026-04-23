import React, { useEffect, useState } from "react";
import { api, apiGet } from "../api/http";
import type { AuthUser } from "../App.tsx";
import { encryptForPeer } from "../encryptedClient/sessionManager.ts";

type EncryptedMessageType = "prekey" | "signal";

interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  type: EncryptedMessageType;
  ciphertext: string;
  header: {
    version: 1;
    senderRegistrationId?: number;
    recipientRegistrationId?: number;
  };
  createdAt: string;
}

interface ChatProps {
  user: AuthUser;
  peerUsername: string;
  onBackToInbox: () => void;
}

export const Chat: React.FC<ChatProps> = ({
  user,
  peerUsername,
  onBackToInbox,
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [peerUsername, user.id]);

  async function loadMessages() {
    try {
      const inbox = await apiGet<Message[]>("/inbox");

      const filtered = inbox.filter(
        (message) =>
          (message.senderUsername === user.username &&
            message.recipientUsername === peerUsername) ||
          (message.senderUsername === peerUsername &&
            message.recipientUsername === user.username),
      );

      setMessages(filtered);
    } catch (error) {
      console.log("Failed to load messages: " + error);
    }
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text || sending) {
      return;
    }

    setSending(true);

    try {
      const encrypted = await encryptForPeer(user.id, peerUsername, text);

      const message = await api.post<Message>("/inbox/send", {
        recipientUsername: encrypted.recipientUsername,
        type: encrypted.type,
        ciphertext: encrypted.ciphertext,
        header: encrypted.header,
      });

      setMessages((prev) => [...prev, message]);
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to send message right now.";

      alert(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button
            type="button"
            className="btn btn-link p-0 me-2 d-md-none"
            onClick={onBackToInbox}
          >
            &larr; Inbox
          </button>
          <span className="fw-semibold">{peerUsername}</span>
        </div>
      </div>

      <div
        className="border rounded p-3 mb-3 bg-light"
        style={{ height: "60vh", overflowY: "auto" }}
      >
        {messages.length === 0 && (
          <p className="text-muted text-center">No messages yet. Say hi!</p>
        )}

        {messages.map((message) => {
          const isMe = message.senderUsername === user.username;

          return (
            <div
              key={message.id}
              className={`d-flex mb-2 ${
                isMe ? "justify-content-end" : "justify-content-start"
              }`}
            >
              <div
                className={`p-2 rounded-3 ${
                  isMe ? "bg-primary text-white" : "bg-white border"
                }`}
                style={{ maxWidth: "75%" }}
              >
                {!isMe && (
                  <div className="small text-muted mb-1">
                    {message.senderUsername}
                  </div>
                )}
                <div className="text-break font-monospace small">
                  {message.ciphertext}
                </div>
                <div className="small mt-1 text-end">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="input-group">
        <input
          type="text"
          className="form-control"
          placeholder={`Message @${peerUsername}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void sendMessage();
            }
          }}
        />
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => void sendMessage()}
          disabled={sending}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
