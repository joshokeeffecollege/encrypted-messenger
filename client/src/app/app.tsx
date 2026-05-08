import { useState } from "react";
import { Login } from "../auth/login-form.tsx";
import { Register } from "../auth/register-form.tsx";
import type { AuthUser } from "../auth/user.ts";
import { useSession } from "./session.ts";
import { Chat } from "../chat/chat-view.tsx";
import { Inbox } from "../chat/inbox-view.tsx";
import { NewChat } from "../chat/new-chat-view.tsx";
import { makeUserHandle } from "../shared/user-handle.ts";
import "./app.css";

type View = "login" | "register";
type Pane = "empty" | "new-chat" | "chat";

const App: React.FC = () => {
  // this runs the whole client screen stuff
  const {
    user,
    loading,
    serverUrl,
    serverUrlInput,
    setServerUrl,
    onLoginSuccess,
    onLogout,
  } = useSession();
  // pick which auth screen to show
  const [view, setView] = useState<View>("login");
  // keep track of which chat is open
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<Pane>("empty");

  const handleRegisterSuccess = (_username: string) => {
    // after register just go back to login
    setView("login");
  };

  const handleLogout = async () => {
    // clear the open chat when logging out
    await onLogout();
    setActivePeer(null);
    setActivePane("empty");
    setView("login");
  };

  const openChatWith = (peerUsername: string) => {
    // open the chat pane for this person
    setActivePeer(peerUsername);
    setActivePane("chat");
  };

  const backToInbox = () => {
    // close the current chat pane
    setActivePeer(null);
    setActivePane("empty");
  };

  const openNewChat = () => {
    // swap the right side into search mode
    setActivePeer(null);
    setActivePane("new-chat");
  };

  if (loading) {
    // just show this while we check the saved session
    return (
      <div className="container d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <div className="visually-hidden">
              <span>Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // if no user yet we stay on login or register
    return (
      <div className="container d-flex align-items-center justify-content-center min-vh-100">
        <div className="col-12">
          <div className="text-center mb-4">
            <h2 className="fw-bold">Encrypted Messenger</h2>
            <p className="text-muted mb-0">
              Sign in or create an account to start chatting.
            </p>
          </div>

          {view === "login" ? (
            <>
              {/* show the login form first */}
            <Login
              serverUrl={serverUrlInput}
              onServerUrlChange={setServerUrl}
              onLoginSuccess={async (authUser: AuthUser) => {
                // after login start with nothing selected
                await onLoginSuccess(authUser);
                setActivePeer(null);
                setActivePane("empty");
              }}
              onSwitchToRegister={() => setView("register")}
            />
            </>
          ) : (
            <>
              {/* or swap to the register form */}
            <Register
              serverUrl={serverUrlInput}
              onServerUrlChange={setServerUrl}
              onRegisterSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setView("login")}
            />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="messenger-app-shell">
      <div className="messenger-app-frame">
        <header className="messenger-topbar">
          <div>
            <h1 className="messenger-title">Encrypted Messenger</h1>
            <p className="messenger-subtitle">
              Logged in as{" "}
              <strong>{makeUserHandle(user.username, serverUrl)}</strong>
            </p>
          </div>
          <button
            className="btn btn-sm btn-outline-danger messenger-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="messenger-workspace">
          <aside className="messenger-sidebar">
            {/* left side is the inbox and chat list */}
            <Inbox
              user={user}
              serverUrl={serverUrl}
              onOpenChat={openChatWith}
              activePeer={activePeer}
              onStartNewChat={openNewChat}
            />
          </aside>

          <section className="messenger-chat-pane">
            {activePane === "chat" && activePeer ? (
              <>
                {/* normal open chat view */}
              <Chat
                user={user}
                serverUrl={serverUrl}
                peerUsername={activePeer}
                onBackToInbox={backToInbox}
              />
              </>
            ) : activePane === "new-chat" ? (
              <>
                {/* search for someone new to message */}
              <NewChat
                user={user}
                serverUrl={serverUrl}
                onOpenChat={openChatWith}
              />
              </>
            ) : (
              <>
                {/* empty state before a chat is picked */}
              <div className="chat-empty-state">
                <h2 className="chat-empty-state__title">
                  Choose a conversation
                </h2>
                <p className="chat-empty-state__body">
                  Select a thread from the inbox or start a new chat.
                </p>
              </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
