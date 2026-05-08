import type { InboxPreview } from "./desktop-chat";
import type { AuthUser } from "../auth/user";
import { loadInbox } from "./load-inbox";
import { makeUserHandle } from "../shared/user-handle";
import { useData } from "../shared/async-data";

interface InboxProps {
  user: AuthUser;
  serverUrl: string;
  onOpenChat: (peerUsername: string) => void;
  activePeer: string | null;
  onStartNewChat: () => void;
}

export const Inbox: React.FC<InboxProps> = ({
  user,
  serverUrl,
  onOpenChat,
  activePeer,
  onStartNewChat,
}) => {
  // this checks if inbox data really changed
  function areConversationsEqual(
    currentConversations: InboxPreview[],
    nextConversations: InboxPreview[],
  ) {
    if (currentConversations.length !== nextConversations.length) {
      return false;
    }

    return currentConversations.every((conversation, index) => {
      const nextConversation = nextConversations[index];

      return (
        conversation.peerUsername === nextConversation.peerUsername &&
        conversation.lastMessagePreview === nextConversation.lastMessagePreview &&
        conversation.lastCreatedAt === nextConversation.lastCreatedAt &&
        conversation.unreadCount === nextConversation.unreadCount
      );
    });
  }

  const {
    value: conversations,
    error: inboxError,
  } = useData<InboxPreview[]>({
    initialValue: [],
    fallbackMessage: "Unable to load the inbox right now.",
    pollMs: 5000,
    deps: [serverUrl, user.id],
    isEqual: areConversationsEqual,
    load: () =>
      loadInbox({
        serverUrl,
        userId: user.id,
      }),
  });

  function formatTime(iso: string) {
    // keep the time short in the list
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    // this is the conversation list on the side
    <div className="inbox-view">
      <div className="inbox-list-card">
        <div className="inbox-list-card__header">
          <div>
            <h3 className="inbox-section-title">Conversations</h3>
          </div>
          <small className="inbox-meta-text">
            {conversations.length === 0
              ? ""
              : `${conversations.length} conversation${
                  conversations.length > 1 ? "s" : ""
                }`}
          </small>
        </div>

        {inboxError && <div className="inbox-error-banner">{inboxError}</div>}

        {conversations.length === 0 ? (
          // show this before any chats exist
          <div className="inbox-empty-state">
            <p className="inbox-empty-state__title">No conversations yet</p>
            <p className="inbox-empty-state__body">
              Click the "New chat" button to search for a user to start a conversation.
            </p>
          </div>
        ) : (
          <div className="inbox-conversation-list">
            {conversations.map((conv) => {
              // use first letter as a simple avatar
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

        <div className="inbox-footer-action">
          <button
            type="button"
            className="btn btn-primary inbox-footer-action__button"
            onClick={onStartNewChat}
          >
            New chat
          </button>
        </div>
      </div>
    </div>
  );
};
