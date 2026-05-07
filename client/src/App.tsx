import { useState } from "react";
import { Login } from "./auth/LoginForm";
import { Register } from "./auth/RegisterForm";
import type { AuthUser } from "./auth/userTypes";
import { useSession } from "./app/useSession.ts";
import { Chat } from "./chat/ChatView";
import { Inbox } from "./chat/InboxView.tsx";
import { makeUserHandle } from "./shared/userHandle.ts";
import "./App.css";

type View = "login" | "register";

const App: React.FC = () => {
  const {
    user,
    loading,
    serverUrl,
    serverUrlInput,
    setServerUrl,
    onLoginSuccess,
    onLogout,
  } = useSession();
  const [view, setView] = useState<View>("login");
  const [activePeer, setActivePeer] = useState<string | null>(null);

  const handleRegisterSuccess = (_username: string) => {
    setView("login");
  };

  const handleLogout = async () => {
    await onLogout();
    setActivePeer(null);
    setView("login");
  };

  const openChatWith = (peerUsername: string) => {
    setActivePeer(peerUsername);
  };

  const backToInbox = () => {
    setActivePeer(null);
  };

  if (loading) {
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
            <Login
              serverUrl={serverUrlInput}
              onServerUrlChange={setServerUrl}
              onLoginSuccess={async (authUser: AuthUser) => {
                await onLoginSuccess(authUser);
                setActivePeer(null);
              }}
              onSwitchToRegister={() => setView("register")}
            />
          ) : (
            <Register
              serverUrl={serverUrlInput}
              onServerUrlChange={setServerUrl}
              onRegisterSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setView("login")}
            />
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
            <p className="messenger-eyebrow">Secure workspace</p>
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
            <Inbox
              user={user}
              serverUrl={serverUrl}
              onOpenChat={openChatWith}
              activePeer={activePeer}
            />
          </aside>

          <section className="messenger-chat-pane">
            {activePeer ? (
              <Chat
                user={user}
                serverUrl={serverUrl}
                peerUsername={activePeer}
                onBackToInbox={backToInbox}
              />
            ) : (
              <div className="chat-empty-state">
                <div className="chat-empty-state__icon">EM</div>
                <h2 className="chat-empty-state__title">Choose a conversation</h2>
                <p className="chat-empty-state__body">
                  Select a thread from the inbox or start a new chat to begin a
                  secure conversation.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
