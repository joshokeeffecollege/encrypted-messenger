import { apiPost } from "../app/server.ts";
import { SimpleAuthForm } from "./simple-auth-form.tsx";
import type { AuthUser } from "./user.ts";

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
  // this is the login version of the auth form
  return (
    <SimpleAuthForm
      title="Login"
      submitLabel="Log in"
      switchLabel="Need an account? Sign up"
      serverUrl={serverUrl}
      onServerUrlChange={onServerUrlChange}
      onSubmit={async ({ username, password }) => {
        // send login details to the server
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
