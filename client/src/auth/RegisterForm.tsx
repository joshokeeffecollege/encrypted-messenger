// account registration form
import { useState } from "react";
import { apiPost, cleanServerUrl } from "../api/http";

interface RegisterProps {
  serverUrl: string;
  onServerUrlChange: (value: string) => void;
  onRegisterSuccess: (username: string) => void;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({
  serverUrl,
  onServerUrlChange,
  onRegisterSuccess,
  onSwitchToLogin,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<String | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const trimmedServerUrl = cleanServerUrl(serverUrl);

      if (!trimmedServerUrl) {
        setError("Enter a server address first.");
        return;
      }

      // create a new account on the server.
      await apiPost("/auth/register", {
        username,
        password,
      });

      onRegisterSuccess(username);
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  }

  return (
    <div className={"card shadow-sm col-12 col-md-6 col-lg-4 mx-auto"}>
      <div className={"card-body"}>
        <h5 className={"card-title mb-3"}>Register</h5>

        {error && <div className="error-message">{error}</div>}

        {/* server address input */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Server Address</label>
            <input
              className="form-control"
              placeholder="http://127.0.0.1:5001"
              value={serverUrl}
              onChange={(e) => onServerUrlChange(e.target.value)}
            />
          </div>

          {/* username input */}
          <div className="mb-3">
            <label className={"form-label"}>Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* password input */}
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* submit button */}
          <button className="btn btn-success w-100 mb-2">Create Account</button>

          <button
            type="button"
            className="btn btn-link w-100"
            onClick={onSwitchToLogin}
          >
            Already have an account? Log in
          </button>
        </form>
      </div>
    </div>
  );
};
