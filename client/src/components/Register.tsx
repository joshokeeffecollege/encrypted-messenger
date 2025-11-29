import React, {useState, type FormEvent} from "react";
import {apiPost} from "../api/http";
import type {AuthUser} from "../App.tsx";

interface RegisterProps {
    // Inform parent that registration succeeded; we pass back the username.
    onRegisterSuccess: (username: string) => void;
    onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({onRegisterSuccess, onSwitchToLogin}) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await apiPost<AuthUser>("/auth/register", {
                username,
                password,
            });

            onRegisterSuccess(result.username);
        } catch (err: any) {
            console.error(err);
            setError("Registration failed. Username may already exist.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
            <h2 className="text-lg font-medium">Create an account</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm mb-1" htmlFor="reg-username">
                        Username
                    </label>
                    <input
                        id="reg-username"
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1" htmlFor="reg-password">
                        Password
                    </label>
                    <input
                        id="reg-password"
                        type="password"
                        className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded py-2 text-sm font-medium"
                >
                    {loading ? "Creating account…" : "Register"}
                </button>
            </form>

            <div className="text-xs text-slate-400">
                Already have an account?{" "}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-blue-400 hover:text-blue-300 underline"
                >
                    Back to login
                </button>
            </div>
        </div>
    );
};