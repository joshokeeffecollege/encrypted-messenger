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

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        try {
            const user = await apiPost<AuthUser>("/auth/login", {
                username,
                password,
            });

            onLoginSuccess(user);
        } catch (err) {
            alert("Login failed");
        }
    };

    return (
        <div className={"card shadow-sm"}>
            <div className="card-body">
                <h5 className={"card-title mb-3"}>Login</h5>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className={"form-label"}>Username</label>
                        <input
                            className={"form-control"}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="mb-3">
                        <label className={"form-label"}>Password</label>
                        <input
                            type="password"
                            className={"form-control"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button className={"btn btn-primary w-100 mb-2"}>Log in</button>
                    <button
                        type="button"
                        className={"btn btn-link w-100"}
                        onClick={onSwitchToRegister}>
                        Need an account? Sign up
                    </button>
                </form>
            </div>
        </div>
    );
};