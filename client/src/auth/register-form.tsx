import { apiPost } from "../app/server.ts";
import { SimpleAuthForm } from "./simple-auth-form.tsx";

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
  // this is the register version of the auth form
  return (
    <SimpleAuthForm
      title="Register"
      submitLabel="Create Account"
      switchLabel="Already have an account? Log in"
      serverUrl={serverUrl}
      onServerUrlChange={onServerUrlChange}
      onSubmit={async ({ username, password }) => {
        // make a new account on the server
        await apiPost("/auth/register", {
          username,
          password,
        });

        onRegisterSuccess(username);
      }}
      onSwitch={onSwitchToLogin}
      getErrorMessage={() => "Registration failed. Please try again."}
      submitButtonClassName="btn btn-success"
    />
  );
};
