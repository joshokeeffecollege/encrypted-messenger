// display the chat conversation and allow sending messages

import React, { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../auth/userTypes.ts";
import { desktopChat, type ChatMessage } from "../bridge/desktopChat.ts";
import { makeUserHandle } from "../shared/userHandle.ts";
import { useAction, useData } from "../shared/asyncTools.ts";

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
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [hasResolvedInitialLoad, setHasResolvedInitialLoad] = useState(false);

  function areMessagesEqual(
    currentMessages: ChatMessage[],
    nextMessages: ChatMessage[],
  ) {
    if (currentMessages.length !== nextMessages.length) {
      return false;
    }

    return currentMessages.every((message, index) => {
      const nextMessage = nextMessages[index];

      return (
        message.id === nextMessage.id &&
        message.state === nextMessage.state &&
        message.direction === nextMessage.direction &&
        message.displayText === nextMessage.displayText &&
        message.createdAt === nextMessage.createdAt
      );
    });
  }

  const [input, setInput] = useState("");
  const {
    value: messages,
    setValue: setMessages,
    loading,
    error: loadError,
  } = useData<ChatMessage[]>({
    initialValue: [],
    fallbackMessage: "Unable to load conversation right now.",
    pollMs: 3000,
    deps: [peerUsername, serverUrl, user.id],
    isEqual: areMessagesEqual,
    load: () =>
      desktopChat.loadChat({
        serverUrl,
        userId: user.id,
        username: user.username,
        peerUsername,
      }),
  });
  const {
    loading: sending,
    error: sendError,
    clearError,
    run: runSendChat,
  } = useAction(
    (plaintext: string) =>
      desktopChat.sendChat({
        serverUrl,
        userId: user.id,
        peerUsername,
        plaintext,
      }),
    "Unable to send message right now.",
  );

  async function sendChatMessage() {
    const text = input.trim();

    if (!text || sending) {
      return;
    }

    clearError();

    try {
      const sentMessage = await runSendChat(text);
      setMessages((prev) => [...prev, sentMessage]);
      setInput("");
    } catch {}
  }

  useEffect(() => {
    setHasResolvedInitialLoad(false);
  }, [peerUsername, serverUrl, user.id]);

  useEffect(() => {
    if (!loading) {
      setHasResolvedInitialLoad(true);
    }
  }, [loading]);

  useEffect(() => {
    const messageList = messageListRef.current;

    if (!messageList) {
      return;
    }

    messageList.scrollTop = messageList.scrollHeight;
  }, [messages]);

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div className="chat-header__identity">
          <button
            type="button"
            className="btn btn-link chat-back-button d-md-none"
            onClick={onBackToInbox}
          >
            {"<- Inbox"}
          </button>
          <div>
            <p className="panel-eyebrow">Conversation</p>
            <h2 className="chat-title">
              {makeUserHandle(peerUsername, serverUrl)}
            </h2>
          </div>
        </div>
      </div>

      <div className="chat-message-surface">
        {loading && messages.length === 0 && !hasResolvedInitialLoad && (
          <p className="chat-status-message">Loading conversation...</p>
        )}

        {loadError && messages.length === 0 && (
          <p className="chat-status-message chat-status-message--error">
            {loadError}
          </p>
        )}

        {messages.length === 0 && hasResolvedInitialLoad && !loadError && (
          <div className="chat-status-empty">
            <p className="chat-status-empty__title">No messages yet</p>
            <p className="chat-status-empty__body">
              Say hi to <strong>{makeUserHandle(peerUsername, serverUrl)}</strong>{" "}
              to start the conversation.
            </p>
          </div>
        )}

        <div ref={messageListRef} className="chat-message-list">
          {messages.map((message) => {
            const isMe = message.direction === "outgoing";
            const decryptError = message.state === "failed";

            return (
              <div
                key={message.id}
                className={`chat-message-row ${
                  isMe
                    ? "chat-message-row--outgoing"
                    : "chat-message-row--incoming"
                }`}
              >
                <div
                  className={`chat-bubble ${
                    isMe
                      ? "chat-bubble--outgoing"
                      : decryptError
                        ? "chat-bubble--failed"
                        : "chat-bubble--incoming"
                  }`}
                >
                  {!isMe && (
                    <div className="chat-bubble__sender">
                      {makeUserHandle(message.senderUsername, serverUrl)}
                    </div>
                  )}
                  <div className="chat-bubble__body">{message.displayText}</div>
                  <div className="chat-bubble__timestamp">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chat-composer">
        <label className="visually-hidden" htmlFor="chat-message-input">
          Message {makeUserHandle(peerUsername, serverUrl)}
        </label>
        <input
          id="chat-message-input"
          type="text"
          className="form-control chat-composer__input"
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
          className="btn btn-primary chat-composer__submit"
          type="button"
          onClick={() => void sendChatMessage()}
          disabled={sending}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      {sendError && <div className="chat-send-error">{sendError}</div>}
    </div>
  );
};

export default Chat;
