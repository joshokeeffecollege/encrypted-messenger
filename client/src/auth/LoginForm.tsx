// login form for the first screen.
import React, { useState, type FormEvent } from "react";
import { apiPost, cleanServerUrl } from "../api/http";
import type { AuthUser } from "../App";

interface LoginProps {
  serverUrl: string;
  onServerUrlChange: (value: string) => void;
  onLoginSuccess: (user: AuthUser) => Promise<void>;
  onSwitchToRegister: () => void;
}

// login form
export const Login: React.FC<LoginProps> = ({
  serverUrl,
  onServerUrlChange,
  onLoginSuccess,
  onSwitchToRegister,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<String | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const trimmedServerUrl = cleanServerUrl(serverUrl);

      if (!trimmedServerUrl) {
        setError("Enter a server address first.");
        return;
      }

      // ask the server to log user in.
      const user = await apiPost<AuthUser>("/auth/login", {
        username,
        password,
      });

      await onLoginSuccess(user);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please try again.";

      setError(message);
    }
  };

  return (
    <div className={"card shadow-sm col-12 col-md-6 col-lg-4 mx-auto"}>
      <div className="card-body">
        <h5 className={"card-title mb-3"}>Login</h5>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* server address input */}
          <div className="mb-3">
            <label className={"form-label"}>Server Address</label>
            <input
              className={"form-control"}
              placeholder="http://127.0.0.1:5001"
              value={serverUrl}
              onChange={(e) => onServerUrlChange(e.target.value)}
            />
          </div>

          {/* username input */}
          <div className="mb-3">
            <label className={"form-label"}>Username</label>
            <input
              className={"form-control"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* password input */}
          <div className="mb-3">
            <label className={"form-label"}>Password</label>
            <input
              type="password"
              className={"form-control"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* submit button */}
          <button className={"btn btn-primary w-100 mb-2"}>Log in</button>
          <button
            type="button"
            className={"btn btn-link w-100"}
            onClick={onSwitchToRegister}
          >
            Need an account? Sign up
          </button>
        </form>
      </div>
    </div>
  );
};
