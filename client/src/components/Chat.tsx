import React from "react";
import type {AuthUser} from "../App";

interface ChatProps {
    currentUser: AuthUser;
}

// This is a placeholder chat component.
// this will use Signal client logic to encrypt/decrypt messages.
export const Chat: React.FC<ChatProps> = ({currentUser}) => {
    return (
        <div className="bg-slate-800 p-4 rounded-lg">
            <p className="mb-2 text-sm text-slate-300">
                Logged in as <span className="font-semibold">{currentUser.username}</span>
            </p>
            <p className="text-slate-400 text-sm">
                Chat UI goes here (conversation list, message input, etc.).
            </p>
        </div>
    );
};
