// display the chat conversation and allow sending messages

import React, { useEffect, useState } from "react";
import type { AuthUser } from "../App.tsx";
import { desktopChat, type ChatMessage } from "../bridge/desktopChat.ts";
import { makeUserHandle } from "../shared/userHandle.ts";

interface ChatProps {
  user: AuthUser;
  serverUrl: string;
  peerUsername: string;
  onBackToInbox: () => void;
}

export const Chat: React.FC<ChatProps> = ({
  user,
  serverUrl,
  peerUsername,
  onBackToInbox,
}) => {
  // displays one chat at a time
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void loadChat();

    const interval = setInterval(() => {
      void loadChat();
    }, 3000);

    return () => clearInterval(interval);
  }, [peerUsername, serverUrl, user.id]);

  // load chats
  async function loadChat() {
    setLoading(true);

    // load the conversation from the desktop bridge
    try {
      const conversation = await desktopChat.loadChat({
        serverUrl,
        userId: user.id,
        peerUsername,
      });

      setMessages(conversation);
    } catch (error) {
      console.error("Failed to load chat:", error);
    } finally {
      setLoading(false);
    }
  }

  // send a message
  async function sendChatMessage() {
    const text = input.trim();

    if (!text || sending) {
      return;
    }

    setSending(true);

    try {
      const sentMessage = await desktopChat.sendChat({
        serverUrl,
        userId: user.id,
        peerUsername,
        plaintext: text,
      });

      setMessages((prev) => [...prev, sentMessage]);
      setInput("");
    } catch (error) {
      console.error("Error sending chat message:", error);

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
          <span className="fw-semibold">
            {makeUserHandle(peerUsername, serverUrl)}
          </span>
        </div>
      </div>

      <div
        className="border rounded p-3 mb-3 bg-light"
        style={{ height: "60vh", overflowY: "auto" }}
      >
        {loading && messages.length === 0 && (
          <p className="text-muted text-center">Loading conversation...</p>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-muted text-center">No messages yet. Say hi!</p>
        )}

        {messages.map((message) => {
          const isMe = message.direction === "outgoing";
          const decryptError = message.state === "failed";

          return (
            <div
              key={message.id}
              className={`d-flex mb-2 ${
                isMe ? "justify-content-end" : "justify-content-start"
              }`}
            >
              <div
                className={`p-2 rounded-3 ${
                  isMe
                    ? "bg-primary text-white"
                    : decryptError
                      ? "bg-warning-subtle border border-warning"
                      : "bg-white border"
                }`}
                style={{ maxWidth: "75%" }}
              >
                {!isMe && (
                  <div className="small text-muted mb-1">
                    {makeUserHandle(message.senderUsername, serverUrl)}
                  </div>
                )}
                <div>{message.displayText}</div>
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
          placeholder={`Message @${makeUserHandle(peerUsername, serverUrl)}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void sendChatMessage();
            }
          }}
        />
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => void sendChatMessage()}
          disabled={sending}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
