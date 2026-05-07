import { useState } from "react";
import { desktopChat, type InboxPreview } from "../bridge/desktopChat";
import type { AuthUser } from "../auth/userTypes";
import { makeUserHandle } from "../shared/userHandle";
import { useAction, useData } from "../shared/asyncTools";

interface InboxProps {
  user: AuthUser;
  serverUrl: string;
  onOpenChat: (peerUsername: string) => void;
  activePeer: string | null;
}

export const Inbox: React.FC<InboxProps> = ({
  user,
  serverUrl,
  onOpenChat,
  activePeer,
}) => {
  const [search, setSearch] = useState("");
  const {
    value: conversations,
    loading,
    error: inboxError,
    refresh: refreshInbox,
  } = useData<InboxPreview[]>({
    initialValue: [],
    fallbackMessage: "Unable to load the inbox right now.",
    deps: [serverUrl, user.id],
    load: () =>
      desktopChat.loadInbox({
        serverUrl,
        userId: user.id,
      }),
  });
  const {
    loading: checkingUser,
    error: chatError,
    clearError,
    run: runPeerCheck,
  } = useAction(
    (peerUsername: string) =>
      desktopChat.checkPeer({
        serverUrl,
        userId: user.id,
        peerUsername,
      }),
    "Could not find that user on the selected server.",
  );

  async function handleStartNewChat(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();

    if (!trimmed) {
      return;
    }

    clearError();

    try {
      const result = await runPeerCheck(trimmed);
      setSearch("");
      onOpenChat(result.username);
    } catch {}
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="inbox-view">
      <div className="inbox-header">
        <div>
          <p className="panel-eyebrow">Inbox</p>
          <h2 className="panel-title">Messages</h2>
        </div>
        <p className="panel-copy">
          Pick up an existing conversation or start a new secure thread.
        </p>
      </div>

      <div className="inbox-compose-card">
        <div className="inbox-compose-card__header">
          <div>
            <h3 className="inbox-section-title">Start new chat</h3>
            <p className="inbox-section-copy">
              Message a local username or a remote handle like{" "}
              <span className="inbox-inline-code">bob@server.example</span>.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary inbox-refresh-button"
            onClick={() => void refreshInbox()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh inbox"}
          </button>
        </div>

        <form onSubmit={handleStartNewChat} className="inbox-compose-form">
          <input
            type="text"
            className="form-control inbox-compose-input"
            placeholder="Enter username or user@server..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary inbox-compose-submit"
            disabled={checkingUser}
          >
            {checkingUser ? "Checking..." : "Chat"}
          </button>
        </form>

        <p className="inbox-supporting-copy">
          They&apos;ll receive your message next time they open the app.
        </p>

        {chatError && <div className="inbox-error-message">{chatError}</div>}
      </div>

      <div className="inbox-list-card">
        <div className="inbox-list-card__header">
          <div>
            <h3 className="inbox-section-title">Conversations</h3>
            <p className="inbox-section-copy">
              Recent chats synced from your local encrypted store.
            </p>
          </div>
          <small className="inbox-meta-text">
            {conversations.length === 0
              ? "No conversations yet"
              : `${conversations.length} conversation${
                  conversations.length > 1 ? "s" : ""
                }`}
          </small>
        </div>

        {inboxError && <div className="inbox-error-banner">{inboxError}</div>}

        {conversations.length === 0 && !loading ? (
          <div className="inbox-empty-state">
            <div className="inbox-empty-state__icon">...</div>
            <p className="inbox-empty-state__title">No conversations yet</p>
            <p className="inbox-empty-state__body">
              Nobody has messaged you yet. Start a new chat above to create your
              first thread.
            </p>
          </div>
        ) : (
          <div className="inbox-conversation-list">
            {conversations.map((conv) => {
              const initial = conv.peerUsername.charAt(0).toUpperCase();
              const isActive = conv.peerUsername === activePeer;

              return (
                <button
                  key={conv.peerUsername}
                  type="button"
                  className={`inbox-conversation-row ${
                    isActive ? "inbox-conversation-row--active" : ""
                  }`}
                  onClick={() => onOpenChat(conv.peerUsername)}
                >
                  <div className="inbox-avatar">
                    {initial}
                  </div>

                  <div className="inbox-conversation-content">
                    <div className="inbox-conversation-topline">
                      <span className="inbox-conversation-name">
                        {makeUserHandle(conv.peerUsername, serverUrl)}
                      </span>
                      <small className="inbox-meta-text">
                        {formatTime(conv.lastCreatedAt)}
                      </small>
                    </div>
                    <div className="inbox-conversation-preview">
                      {conv.lastMessagePreview}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
