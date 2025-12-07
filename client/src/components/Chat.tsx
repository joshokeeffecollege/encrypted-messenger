import React, {useEffect, useState} from 'react';
import {api} from "../api/http";
import type {AuthUser} from "../App.tsx";

interface ChatProps {
    user: AuthUser;
}

interface Message {
    id: string;
    senderId: string;
    senderUsername: string;
    recipientId: string;
    recipientUsername: string;
    content: string;
    createdAt: string;
}

export const Chat: React.FC<ChatProps> = ({user}) => {
    // username of person to send message to
    const [recipient, setRecipient] = useState("");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);

    // load inbox every 3 seconds
    useEffect(() => {
        loadInbox();

        const interval = setInterval(loadInbox, 3000);
        return () => clearInterval(interval);
    }, []);

    async function loadInbox() {
        try {
            const inbox: Message[] = await api.get(
                `/inbox?userId=${user.id}`
            );
            setMessages(inbox);
        } catch (error) {
            console.error("Failed to load inbox: " + error);
        }
    }

    async function sendMessage() {
        if (!recipient.trim()) {
            alert("Enter a recipient username")
            return;
        }

        if (!input.trim()) return;

        try {
            const msg = await api.post("/inbox/send", {
                senderId: user.id,
                recipientUsername: recipient,
                content: input,
            });

            // update
            setMessages((prev) => [...prev, msg]);
            setRecipient("");
        } catch (error) {
            console.error("Error sending message: " + error);
            alert("Error sending message");
        }
    }

    return (
        <div className="{chat-container}">

            <div className={"chat-controls"}>
                <input
                    type="text"
                    placeholder={"Recipient username"}
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                />
            </div>

            <div className={"messages-box"}>
                {messages.length === 0 && (
                    <p className={"empty"}>No messages yet :(</p>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={"message"}>
                        <strong>{msg.senderUsername}:</strong>{" "}
                        <span>{msg.content}</span>
                    </div>
                ))}
            </div>

            <div className={"input-row"}>
                <input
                    type="text"
                    placeholder={"Enter a message"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}