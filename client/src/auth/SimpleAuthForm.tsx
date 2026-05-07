import { useState } from "react";
import { cleanServerUrl } from "../api/http";

interface SimpleAuthFormProps {
  title: string;
  submitLabel: string;
  switchLabel: string;
  serverUrl: string;
  onServerUrlChange: (value: string) => void;
  onSubmit: (input: { username: string; password: string }) => Promise<void>;
  onSwitch: () => void;
  getErrorMessage: (error: unknown) => string;
  submitButtonClassName: string;
}

export const SimpleAuthForm: React.FC<SimpleAuthFormProps> = ({
  title,
  submitLabel,
  switchLabel,
  serverUrl,
  onServerUrlChange,
  onSubmit,
  onSwitch,
  getErrorMessage,
  submitButtonClassName,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!cleanServerUrl(serverUrl)) {
      setError("Enter a server address first.");
      return;
    }

    try {
      await onSubmit({ username, password });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  }

  return (
    <div className="card shadow-sm col-12 col-md-6 col-lg-4 mx-auto">
      <div className="card-body">
        <h5 className="card-title mb-3">{title}</h5>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Server Address</label>
            <input
              className="form-control"
              placeholder="http://127.0.0.1:5001"
              value={serverUrl}
              onChange={(event) => onServerUrlChange(event.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button className={`${submitButtonClassName} w-100 mb-2`}>
            {submitLabel}
          </button>
          <button type="button" className="btn btn-link w-100" onClick={onSwitch}>
            {switchLabel}
          </button>
        </form>
      </div>
    </div>
  );
};
