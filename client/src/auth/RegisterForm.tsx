import { apiPost } from "../api/http";
import { SimpleAuthForm } from "./SimpleAuthForm";

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
  return (
    <SimpleAuthForm
      title="Register"
      submitLabel="Create Account"
      switchLabel="Already have an account? Log in"
      serverUrl={serverUrl}
      onServerUrlChange={onServerUrlChange}
      onSubmit={async ({ username, password }) => {
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
