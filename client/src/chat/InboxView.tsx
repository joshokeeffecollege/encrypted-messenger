import { useEffect, useState } from "react";
import { desktopChat, type InboxPreview } from "../bridge/desktopChat";
import type { AuthUser } from "../App";
import { makeUserHandle } from "../shared/userHandle";

interface InboxProps {
  user: AuthUser;
  serverUrl: string;
  onOpenChat: (peerUsername: string) => void;
}

export const Inbox: React.FC<InboxProps> = ({
  user,
  serverUrl,
  onOpenChat,
}) => {
  // Left side of the app. It shows chats and lets you start a new one.
  const [conversations, setConversations] = useState<InboxPreview[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    void loadInbox();
  }, [serverUrl, user.id]);

  async function loadInbox() {
    setLoading(true);

    try {
      const conversationList = await desktopChat.loadInbox({
        serverUrl,
        userId: user.id,
      });
      setConversations(conversationList);
    } catch (err) {
      console.error("Failed to load inbox", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartNewChat(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();

    if (!trimmed) {
      return;
    }

    setCheckingUser(true);
    setChatError("");

    try {
      const result = await desktopChat.checkPeer({
        serverUrl,
        userId: user.id,
        peerUsername: trimmed,
      });

      setSearch("");
      onOpenChat(result.username);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not find that user on the selected server.";

      setChatError(message);
    } finally {
      setCheckingUser(false);
    }
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
      <div className="mb-3">
        <h5 className="mb-1">Inbox</h5>
        <small className="text-muted">
          Select a conversation or start a new chat.
        </small>
      </div>

      <div className="mb-4 border rounded-3 p-3 bg-light">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-semibold">Start new chat</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => void loadInbox()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh inbox"}
          </button>
        </div>

        <p className="small text-muted mb-2">
          Type a local username or a remote handle like bob@server.example.
          They&apos;ll see your message next time they log in.
        </p>

        <form onSubmit={handleStartNewChat} className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Enter username or user@server..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={checkingUser}>
            {checkingUser ? "Checking..." : "Chat"}
          </button>
        </form>

        {chatError && (
          <div className="text-danger small mt-2">{chatError}</div>
        )}
      </div>

      <div className="border rounded-3 overflow-hidden">
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-body-tertiary">
          <span className="fw-semibold">Conversations</span>
          <small className="text-muted">
            {conversations.length === 0
              ? "No conversations yet"
              : `${conversations.length} conversation${
                  conversations.length > 1 ? "s" : ""
                }`}
          </small>
        </div>

        {conversations.length === 0 && !loading ? (
          <div className="px-3 py-4 text-center text-muted small">
            Nobody has messaged you yet.
            <br />
            Start a new chat above.
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {conversations.map((conv) => {
              const initial = conv.peerUsername.charAt(0).toUpperCase();

              return (
                <button
                  key={conv.peerUsername}
                  type="button"
                  className="list-group-item list-group-item-action d-flex align-items-center"
                  onClick={() => onOpenChat(conv.peerUsername)}
                >
                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: 36,
                      height: 36,
                      fontSize: "0.9rem",
                    }}
                  >
                    {initial}
                  </div>

                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold">
                        {makeUserHandle(conv.peerUsername, serverUrl)}
                      </span>
                      <small className="text-muted ms-2">
                        {formatTime(conv.lastCreatedAt)}
                      </small>
                    </div>
                    <div className="text-muted small text-truncate align-right">
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
