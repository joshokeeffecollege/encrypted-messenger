import {useState} from 'react';
import {Login} from './components/Login';
import {Register} from './components/Register';
import {Chat} from './components/Chat';
import './App.css';
import {Inbox} from "./components/Inbox.tsx";

// authenticated user model
export interface AuthUser {
    id: string;
    username: string;
    createdAt: string | Date;
}

type View = "login" | "register" | "inbox" | "chat";

const App: React.FC = () => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [view, setView] = useState<View>("login");
    const [activePeer, setActivePeer] = useState<string | null>(null);

    // upon successful login
    const handleLoginSuccess = (authUser: AuthUser) => {
        setUser(authUser);
        setView("inbox");
    };

    // when register is successful, send user back to login
    const handleRegisterSuccess = (_username: string) => {
        setView("login");
    };

    // logout
    const handleLogout = () => {
        setUser(null);
        setActivePeer(null);
        setView("login");
    };

    const openChatWith = (peerUsername: string) => {
        setActivePeer(peerUsername);
        setView("chat");
    }

    const backToInbox = () => {
        setActivePeer(null);
        setView("inbox");
    }

    // Not logged in: login/register screens
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
                            onLoginSuccess={handleLoginSuccess}
                            onSwitchToRegister={() => setView("register")}
                        />
                    ) : (
                        <Register
                            onRegisterSuccess={handleRegisterSuccess}
                            onSwitchToLogin={() => setView("login")}
                        />
                    )}
                </div>
            </div>
        );
    }

    // Logged in: inbox or chat
    return (
        <div className="container-fluid py-3">
            <div className="row justify-content-center">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h4 className="mb-0">Encrypted Messenger</h4>
                            <small className="text-muted">
                                Logged in as <strong>{user.username}</strong>
                            </small>
                        </div>
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body">
                            {view === "inbox" && (
                                <Inbox user={user} onOpenChat={openChatWith}/>
                            )}

                            {view === "chat" && activePeer && (
                                <Chat
                                    user={user}
                                    peerUsername={activePeer}
                                    onBackToInbox={backToInbox}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;