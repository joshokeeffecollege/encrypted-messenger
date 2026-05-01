import { useEffect, useState } from "react";
import { Login } from "./auth/LoginForm";
import { Register } from "./auth/RegisterForm";
import { Chat } from "./chat/ChatView";
import { Inbox } from "./chat/InboxView.tsx";
import { api, getServerUrl, setServerUrl as saveServerUrl } from "./api/http.ts";
import { desktopChat } from "./bridge/desktopChat.ts";
import { makeUserHandle } from "./shared/userHandle.ts";
import "./App.css";

export interface AuthUser {
  id: string;
  username: string;
  createdAt: string | Date;
}

type View = "login" | "register";

const App: React.FC = () => {
  // This file mostly decides which screen the user should see.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<View>("login");
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState(() => getServerUrl());

  async function setUpLoggedInUser(authUser: AuthUser) {
    await desktopChat.setServerUrl(serverUrl);

    // Electron sorts out the local keys for this user.
    await desktopChat.setUpUser({
      serverUrl,
      userId: authUser.id,
      username: authUser.username,
    });
  }

  function handleServerUrlChange(value: string) {
    setServerUrl(value);
    saveServerUrl(value);
  }

  useEffect(() => {
    if (!serverUrl) {
      setLoading(false);
      return;
    }

    void desktopChat.setServerUrl(serverUrl);
    api
      .get<AuthUser>("/auth/me")
      .then(async (authUser) => {
        await setUpLoggedInUser(authUser);
        setUser(authUser);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [serverUrl]);

  const handleLoginSuccess = async (authUser: AuthUser) => {
    try {
      await setUpLoggedInUser(authUser);
      setUser(authUser);
      setActivePeer(null);
    } catch (error) {
      try {
        await api.post("/auth/logout");
      } catch (logoutError) {
        console.error("Failed to roll back login after bootstrap error", logoutError);
      }

      throw error;
    }
  };

  const handleRegisterSuccess = (_username: string) => {
    setView("login");
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.log("Logout error: ", error);
    } finally {
      setUser(null);
      setActivePeer(null);
      setView("login");
    }
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
              serverUrl={serverUrl}
              onServerUrlChange={handleServerUrlChange}
              onLoginSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setView("register")}
            />
          ) : (
            <Register
              serverUrl={serverUrl}
              onServerUrlChange={handleServerUrlChange}
              onRegisterSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setView("login")}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 min-vh-100">
      <div className="row justify-content-center">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-0">Encrypted Messenger</h4>
              <small className="text-muted">
                Logged in as <strong>{makeUserHandle(user.username, serverUrl)}</strong>
              </small>
            </div>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

          <div className="card shadow-sm" style={{ minHeight: "70vh" }}>
            <div className="card-body d-flex flex-column flex-md-row gap-3">
              <div
                className="flex-shrink-0 border-end pe-md-3"
                style={{ width: "100%", maxWidth: 320 }}
              >
                <Inbox user={user} serverUrl={serverUrl} onOpenChat={openChatWith} />
              </div>

              <div className="flex-grow-1 ps-md-1">
                {activePeer ? (
                  <Chat
                    user={user}
                    serverUrl={serverUrl}
                    peerUsername={activePeer}
                    onBackToInbox={backToInbox}
                  />
                ) : (
                  <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted">
                    {/* Empty state before the user opens a chat */}
                    <p className="mb-1">
                      Select a conversation on the left, or start a new chat.
                    </p>
                    <p className="small mb-0">
                      Your messages will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
