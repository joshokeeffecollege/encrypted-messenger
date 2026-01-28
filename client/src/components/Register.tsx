import { useState } from "react";
import { apiPost } from "../api/http";

interface RegisterProps {
  onRegisterSuccess: (username: string) => void;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({
  onRegisterSuccess,
  onSwitchToLogin,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<String | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); // reset errors

    try {
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

        {/* Error message box */}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className={"form-label"}>Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

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
