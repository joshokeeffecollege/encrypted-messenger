import React, {useEffect, useState} from 'react';
import {api, apiGet} from "../api/http";
import type {AuthUser} from "../App.tsx";

interface Message {
    id: string;
    senderId: string;
    senderUsername: string;
    recipientId: string;
    recipientUsername: string;
    content: string;
    createdAt: string;
}

interface ChatProps {
    user: AuthUser;
    peerUsername: string;
    onBackToInbox: () => void;
}

export const Chat: React.FC<ChatProps> = ({user, peerUsername, onBackToInbox}) => {
    // username of person to send message to
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [sending, setSending] = useState(false);

    // load inbox every 3 seconds
    useEffect(() => {
        void loadMessages();
        // const interval = setInterval(loadMessages, 3000);
        // return () => clearInterval(interval);
    }, [peerUsername, user.id]);

    async function loadMessages() {
        try {
            const inbox = await apiGet<Message[]>(`/inbox?userId=${user.id}`);

            const filtered = inbox.filter(
                (m) =>
                    (m.senderUsername === user.username &&
                        m.recipientUsername === peerUsername) ||
                    (m.senderUsername === peerUsername &&
                        m.recipientUsername === user.username)
            );

            setMessages(filtered);
        } catch (error) {
            console.log("Failed to load messages: " + error);
        }
    }

    async function sendMessage() {
        const text = input.trim();
        if (!text) return;

        try {
            const msg = await api.post<Message>("/inbox/send", {
                senderId: user.id,
                recipientUsername: peerUsername,
                content: input,
            });

            // update
            setMessages((prev) => [...prev, msg]);
            setInput("");
        } catch (error) {
            console.error("Error sending message: " + error);
            alert("Error sending message");
        } finally {
            setSending(false);
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <button
                        type="button"
                        className="btn btn-link p-0 me-2"
                        onClick={onBackToInbox}
                    >
                        &larr; Inbox
                    </button>
                    <span className="fw-semibold">{peerUsername}</span>
                </div>
            </div>

            {/* Messages */}
            <div
                className="border rounded p-3 mb-3 bg-light"
                style={{height: "60vh", overflowY: "auto"}}
            >
                {messages.length === 0 && (
                    <p className="text-muted text-center">
                        No messages yet. Say hi!
                    </p>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderUsername === user.username;
                    return (
                        <div
                            key={msg.id}
                            className={`d-flex mb-2 ${
                                isMe
                                    ? "justify-content-end"
                                    : "justify-content-start"
                            }`}
                        >
                            <div
                                className={`p-2 rounded-3 ${
                                    isMe
                                        ? "bg-primary text-white"
                                        : "bg-white border"
                                }`}
                                style={{maxWidth: "75%"}}
                            >
                                {!isMe && (
                                    <div className="small text-muted mb-1">
                                        {msg.senderUsername}
                                    </div>
                                )}
                                <div>{msg.content}</div>
                                <div className="small text-muted mt-1 text-end">
                                    {new Date(
                                        msg.createdAt
                                    ).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    placeholder={`Message @${peerUsername}`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                    className="btn btn-primary"
                    type="button"
                    onClick={sendMessage}
                    disabled={sending}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default Chat;