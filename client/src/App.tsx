import {useState} from 'react';
import {Login} from './components/Login';
import {Register} from './components/Register';
// import {Chat} from './components/Chat';
import './App.css';

// authenticated user model
export interface AuthUser {
    id: string;
    username: string;
    createdAt: string | Date;
}

const App: React.FC = () => {
    // logged in user, or null
    const [user, setUser] = useState<AuthUser | null>(null);

    // change screen depending on logged in or not
    const [mode, setMode] = useState<"login" | "register">("login");

    // upon successful login
    const handleLoginSuccess = (authUser: AuthUser) => {
        setUser(authUser);
    };

    // when register is successful, send user back to login
    const handleRegisterSuccess = (_username: string) => {
        // Optionally you could store `username` to prefill the login form later.
        setMode("login");
    };

    // logout
    const handleLogout = () => {
        setUser(null);
        setMode("login");
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
            <div className="w-full max-w-md p-4">
                <h1 className="text-2xl font-semibold mb-4">
                    Encrypted Messenger
                </h1>

                {/* If logged in, show placeholder chat area */}
                {user ? (
                    <div className="bg-slate-800 p-4 rounded-lg space-y-3">
                        <p className="text-sm text-slate-300">
                            Logged in as <span className="font-semibold">{user.username}</span>
                        </p>
                        <p className="text-sm text-slate-400">
                            Chat UI will go here.
                        </p>
                        <button
                            onClick={handleLogout}
                            className="mt-2 text-xs text-slate-300 underline hover:text-slate-100"
                        >
                            Log out
                        </button>
                    </div>
                ) : (
                    // If not logged in, show either Login or Register.
                    <div className="space-y-4">
                        {mode === "login" ? (
                            <Login
                                onLoginSuccess={handleLoginSuccess}
                                onSwitchToRegister={() => setMode("register")}
                            />
                        ) : (
                            <Register
                                onRegisterSuccess={handleRegisterSuccess}
                                onSwitchToLogin={() => setMode("login")}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;