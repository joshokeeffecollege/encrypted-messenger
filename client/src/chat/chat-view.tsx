// this shows one chat and lets user send messages

import React, { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../auth/user.ts";
import { desktopChat, type ChatMessage } from "./desktop-chat.ts";
import { loadChat } from "./load-chat.ts";
import { makeUserHandle } from "../shared/user-handle.ts";
import { useAction, useData } from "../shared/async-data.ts";

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
  // keep the list scrolled near the latest stuff
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [hasResolvedInitialLoad, setHasResolvedInitialLoad] = useState(false);

  function areMessagesEqual(
    currentMessages: ChatMessage[],
    nextMessages: ChatMessage[],
  ) {
    // stop pointless rerenders if nothing changed
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

  // this is the text in the input box
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
      loadChat({
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
    // send button uses this async action helper
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
    // stop empty sends and repeat clicks
    const text = input.trim();

    if (!text || sending) {
      return;
    }

    clearError();

    try {
      // add the new message after send works
      const sentMessage = await runSendChat(text);
      setMessages((prev) => [...prev, sentMessage]);
      setInput("");
    } catch {}
  }

  useEffect(() => {
    // reset the first load state if chat changes
    setHasResolvedInitialLoad(false);
  }, [peerUsername, serverUrl, user.id]);

  useEffect(() => {
    // once first load finishes we can show empty state properly
    if (!loading) {
      setHasResolvedInitialLoad(true);
    }
  }, [loading]);

  useEffect(() => {
    // jump to the newest message
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
          // first load spinner for this chat
          <p className="chat-status-message">Loading conversation...</p>
        )}

        {loadError && messages.length === 0 && (
          // only show load error if there are no messages yet
          <p className="chat-status-message chat-status-message--error">
            {loadError}
          </p>
        )}

        {messages.length === 0 && hasResolvedInitialLoad && !loadError && (
          // empty chat state after load is done
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
            // outgoing and incoming messages use different styles
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
                    // only incoming messages show who sent it
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
