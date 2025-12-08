import {useEffect, useState} from "react";
import {apiGet} from "../api/http";
import type {AuthUser} from "../App";

interface MessageDTO {
    id: string;
    senderId: string;
    recipientId: string;
    senderUsername: string;
    recipientUsername: string;
    content: string;
    createdAt: string;
}

interface Conversation {
    peerUsername: string;
    lastMessage: string;
    lastCreatedAt: string;
}

interface InboxProps {
    user: AuthUser;
    onOpenChat: (peerUsername: string) => void;
}

export const Inbox: React.FC<InboxProps> = ({user, onOpenChat}) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadConversations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadConversations() {
        setLoading(true);
        try {
            const inbox = await apiGet<MessageDTO[]>(`/inbox?userId=${user.id}`);

            const map = new Map<string, Conversation>();

            for (const msg of inbox) {
                const isSender = msg.senderId === user.id;
                const peerUsername = isSender
                    ? msg.recipientUsername
                    : msg.senderUsername;

                // ✨ ignore any accidental "self" conversations
                if (peerUsername === user.username) {
                    continue;
                }

                const preview = isSender ? `You: ${msg.content}` : msg.content;

                const existingConv = map.get(peerUsername);

                if (!existingConv) {
                    map.set(peerUsername, {
                        peerUsername,
                        lastMessage: preview,
                        lastCreatedAt: msg.createdAt,
                    });
                } else if (
                    new Date(msg.createdAt).getTime() >
                    new Date(existingConv.lastCreatedAt).getTime()
                ) {
                    existingConv.lastMessage = preview;
                    existingConv.lastCreatedAt = msg.createdAt;
                }
            }

            const list = Array.from(map.values()).sort(
                (a, b) =>
                    new Date(b.lastCreatedAt).getTime() -
                    new Date(a.lastCreatedAt).getTime()
            );

            setConversations(list);
        } catch (err) {
            console.error("Failed to load conversations", err);
        } finally {
            setLoading(false);
        }
    }

    function handleStartNewChat(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = search.trim();
        if (!trimmed) return;
        onOpenChat(trimmed);
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
            {/* Header */}
            <div className="mb-3">
                <h5 className="mb-1">Inbox</h5>
                <small className="text-muted">
                    Select a conversation or start a new chat.
                </small>
            </div>

            {/* Start new chat */}
            <div className="mb-4 border rounded-3 p-3 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold">Start new chat</span>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={loadConversations}
                        disabled={loading}
                    >
                        {loading ? "Refreshing…" : "Refresh inbox"}
                    </button>
                </div>

                <p className="small text-muted mb-2">
                    Type a username to start a conversation. They’ll see your
                    message next time they log in.
                </p>

                <form onSubmit={handleStartNewChat} className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Enter username…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                        Chat
                    </button>
                </form>
            </div>

            {/* Conversation list */}
            <div className="border rounded-3 overflow-hidden">
                <div
                    className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-body-tertiary">
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
                        <br/>
                        Start a new chat above.
                    </div>
                ) : (
                    <div className="list-group list-group-flush">
                        {conversations.map((conv) => {
                            const initial = conv.peerUsername
                                .charAt(0)
                                .toUpperCase();

                            return (
                                <button
                                    key={conv.peerUsername}
                                    type="button"
                                    className="list-group-item list-group-item-action d-flex align-items-center"
                                    onClick={() => onOpenChat(conv.peerUsername)}
                                >
                                    {/* Avatar */}
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

                                    {/* Text */}
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-semibold">
                                                {conv.peerUsername}
                                            </span>
                                            <small className="text-muted ms-2">
                                                {formatTime(conv.lastCreatedAt)}
                                            </small>
                                        </div>
                                        <div className="text-muted small text-truncate">
                                            {conv.lastMessage}
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
