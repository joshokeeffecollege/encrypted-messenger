import { apiPost } from "../api/http";
import { SimpleAuthForm } from "./SimpleAuthForm";
import type { AuthUser } from "./userTypes";

interface LoginProps {
  serverUrl: string;
  onServerUrlChange: (value: string) => void;
  onLoginSuccess: (user: AuthUser) => Promise<void>;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({
  serverUrl,
  onServerUrlChange,
  onLoginSuccess,
  onSwitchToRegister,
}) => {
  return (
    <SimpleAuthForm
      title="Login"
      submitLabel="Log in"
      switchLabel="Need an account? Sign up"
      serverUrl={serverUrl}
      onServerUrlChange={onServerUrlChange}
      onSubmit={async ({ username, password }) => {
        const user = await apiPost<AuthUser>("/auth/login", {
          username,
          password,
        });

        await onLoginSuccess(user);
      }}
      onSwitch={onSwitchToRegister}
      getErrorMessage={(error) =>
        error instanceof Error
          ? error.message
          : "Invalid credentials. Please try again."
      }
      submitButtonClassName="btn btn-primary"
    />
  );
};
