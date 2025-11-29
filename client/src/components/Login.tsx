import React, {useState, type FormEvent} from "react";
import {apiPost} from "../api/http";
import type {AuthUser} from "../App";

interface LoginProps {
    onLoginSuccess: (user: AuthUser) => void;
    onSwitchToRegister: () => void;
}

// login function calls backend and notifies of successful login
export const Login: React.FC<LoginProps> = ({onLoginSuccess, onSwitchToRegister}) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await apiPost<AuthUser>("/auth/login", {
                username,
                password,
            });

            onLoginSuccess(result);
        } catch (err) {
            console.error(err);
            setError("Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
            <h2 className="text-lg font-medium">Sign in</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm mb-1" htmlFor="username">
                        Username
                    </label>
                    <input
                        id="username"
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded py-2 text-sm font-medium"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <div className="text-xs text-slate-400">
                Don&apos;t have an account?{" "}
                <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-blue-400 hover:text-blue-300 underline"
                >
                    Create one
                </button>
            </div>
        </div>
    );
};